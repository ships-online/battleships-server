'use strict';

const ShipsCollection = require( '../lib/battleships-engine/src/shipscollection.js' ).default;
const shortId = require( 'shortid' );
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;
const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;

/**
 * Class that represents a single game.
 *
 * @mixes ObservableMixin
 */
class Game {
	/**
	 * @param {Object} socketServer
	 */
	constructor( socketServer ) {
		/**
		 * Socket.io object.
		 *
		 * @private
		 * @type {socket.io}
		 */
		this._socketServer = socketServer;

		/**
		 * The game id.
		 *
		 * @type {String}
		 */
		this.id = shortId.generate();

		/**
		 * Id of an active player.
		 *
		 * @observable
		 * @member {String} #activePlayerId
		 */
		this.set( 'activePlayerId', null );

		/**
		 * The game status.
		 *
		 * @observable
		 * @member {'available'|'full'|'battle'|'over'} #status
		 */
		this.set( 'status', 'available' );

		/**
		 * The player (host) instance.
		 *
		 * @member {Player} #player
		 */

		/**
		 * The opponent (client) instance.
		 *
		 * @member {Player|AiPlayer} #opponent
		 */
	}

	/**
	 * @param {Player} player
	 */
	create( player ) {
		this.player = player;

		this._handlePlayerReady( player );
		this._handlePlayerRequestRematch( player );
	}

	/**
	 * @param {Player} opponent
	 */
	join( opponent ) {
		this.opponent = opponent;
		this.status = 'full';

		this._handleGameStart();
		this._handlePlayerReady( opponent );
		this._handlePlayerShot( opponent, this.player );
		this._handlePlayerShot( this.player, opponent );
		this._handlePlayerRequestRematch( opponent );
	}

	/**
	 * Destroys the game instance, destroy sockets, detach listeners.
	 */
	destroy() {
		for ( const socket of this._socketServer.getSocketsInRoom( this.id ) ) {
			socket.disconnect();
		}

		if ( this.player ) {
			this.player.destroy();
		}

		if ( this.opponent ) {
			this.opponent.destroy();
		}

		this.stopListening();
	}

	/**
	 * Handles both `#player` and `#opponent` are ready ans starts the battle.
	 *
	 * @private
	 */
	async _handleGameStart() {
		await Promise.all( [
			this.player.waitForReady(),
			this.opponent.waitForReady()
		] );

		this.status = 'battle';
		this.activePlayerId = this.player.id;
		this._socketServer.sendToRoom( this.id, 'battleStarted', { activePlayerId: this.activePlayerId } );
	}

	/**
	 * Handles player is ready and validates current game and players status.
	 *
	 * @private
	 * @param {Player} player Player instance.
	 */
	_handlePlayerReady( player ) {
		const socket = player.socket;

		socket.handleRequest( 'ready', ( response, ships ) => {
			if ( player.isReady ) {
				response.success();
				return;
			}

			if ( !player.battlefield.validateShips( ships ) ) {
				response.error( 'invalid-ships-configuration' );
			} else {
				player.battlefield.shipsCollection.add( ShipsCollection.createShipsFromJSON( ships ) );
				player.isReady = true;

				response.success();
				socket.sendToRoom( this.id, 'opponentReady' );
			}
		} );
	}

	/**
	 * Handles player shot and validates influence on the current game.
	 *
	 * @private
	 * @param {Player} player Player instance.
	 * @param {Player} opponent Opponent instance.
	 */
	_handlePlayerShot( player, opponent ) {
		const socket = player.socket;

		socket.handleRequest( 'shot', ( response, position ) => {
			if ( this.status !== 'battle' ) {
				return response.error( 'invalid-game-status' );
			}

			if ( this.activePlayerId !== player.id ) {
				return response.error( 'invalid-turn' );
			}

			const data = opponent.battlefield.shot( position );

			data.activePlayerId = player.id;

			if ( data.type === 'missed' || data.notEmpty ) {
				data.activePlayerId = opponent.id;
			} else if ( data.sunk && !getNotSunken( opponent.battlefield.shipsCollection ).length ) {
				this.status = 'over';
				data.activePlayerId = null;
				data.winnerId = player.id;
				data.winnerShips = getNotSunken( player.battlefield.shipsCollection );
				this._handleRematch();
			}

			response.success( data );
			socket.sendToRoom( this.id, 'opponentShot', data );
			this.activePlayerId = data.activePlayerId;

			this.fire( 'tick' );
		} );
	}

	/**
	 * Handles player request rematch after battle.
	 *
	 * @private
	 * @param {Player} player Player instance.
	 */
	_handlePlayerRequestRematch( player ) {
		const socket = player.socket;

		socket.handleRequest( 'requestRematch', response => {
			response.success();
			player.rematchRequested = true;
			socket.sendToRoom( this.id, 'opponentRequestRematch', { playerId: player.id } );
		} );
	}

	/**
	 * Handles both players requested rematch after battle.
	 *
	 * @private
	 */
	async _handleRematch() {
		await Promise.all( [ this.player.waitForRematch(), this.opponent.waitForRematch() ] );

		this.status = 'full';
		this.player.battlefield.shipsCollection.clear();
		this.player.reset();
		this.opponent.battlefield.shipsCollection.clear();
		this.opponent.reset();
		this.activePlayerId = null;
		this._socketServer.sendToRoom( this.id, 'rematch' );

		this._handleGameStart();
		this.fire( 'tick' );
	}
}

mix( Game, ObservableMixin );
module.exports = Game;

function getNotSunken( ships ) {
	return Array.from( ships )
		.filter( ship => !ship.isSunk )
		.map( ship => ship.toJSON() );
}
