'use strict';

const OpponentBattlefield = require( '../lib/battleships-engine/src/opponentbattlefield.js' ).default;
const ShipsCollection = require( '../lib/battleships-engine/src/shipscollection.js' ).default;
const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;
const Player = require( './player.js' );
const shortId = require( 'shortid' );

/**
 * Class that represents single game.
 *
 * @mixes ObservableMixin
 */
class Game {
	/**
	 * @param {SocketServer} socketServer
	 * @param {Object} settings Game settings.
	 * @param {Number} [settings.size] Size of the battlefield - how many fields long height will be.
	 * @param {Object} [settings.shipsSchema] Schema with ships allowed on the battlefield.
	 */
	constructor( socketServer, settings ) {
		/**
		 * Socket.io object.
		 *
		 * @private
		 * @type {socket.io}
		 */
		this._socketServer = socketServer;

		/**
		 * Game id.
		 *
		 * @type {String}
		 */
		this.id = shortId.generate();

		/**
		 * Id of active player.
		 *
		 * @observable
		 * @member {String} #activePlayerId
		 */
		this.set( 'activePlayerId', null );

		/**
		 * Game status.
		 *
		 * @observable
		 * @member {'available'|'full'|'battle'|'over'} #status
		 */
		this.set( 'status', 'available' );

		/**
		 * Player (host) instance.
		 *
		 * @type {Player}
		 */
		this.player = new Player( new OpponentBattlefield( settings.size, settings.shipsSchema ) );

		/**
		 * Opponent (client) instance.
		 *
		 * @type {Player}
		 */
		this.opponent = new Player( new OpponentBattlefield( settings.size, settings.shipsSchema ) );
	}

	/**
	 * @param {socket} socket Host socket.
	 */
	create( socket ) {
		this.player.socket = socket;

		this._handlePlayerReady( this.player );
		this._handleGameStart();
		this._handlePlayerShot( this.player, this.opponent );
		this._handlePlayerRematchRequest( this.player );
	}

	/**
	 * @param {socket} socket Client socket.
	 */
	join( socket ) {
		this.opponent.socket = socket;
		this.status = 'full';

		this._handlePlayerReady( this.opponent );
		this._handlePlayerShot( this.opponent, this.player );
		this._handlePlayerRematchRequest( this.opponent );
	}

	/**
	 * Destroys the game instance, destroy sockets, detach listeners.
	 */
	destroy() {
		for ( const socket of this._socketServer.getSocketsInRoom( this.id ) ) {
			socket.disconnect();
		}

		this.stopListening();
	}

	/**
	 * Handles both `#player` and `#opponent` are ready ans starts the battle.
	 *
	 * @private
	 */
	_handleGameStart() {
		Promise.all( [
			this.player.waitForReady(),
			this.opponent.waitForReady()
		] ).then( () => {
			this.status = 'battle';
			this.activePlayerId = this.player.id;
			this._socketServer.sendToRoom( this.id, 'battleStarted', { activePlayerId: this.activePlayerId } );
		} );
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
			if ( this.status != 'battle' ) {
				response.error( 'invalid-game-status' );
			} else if ( this.activePlayerId != player.id ) {
				response.error( 'invalid-turn' );
			} else {
				const data = opponent.battlefield.shot( position );
				const opponentShips = opponent.battlefield.shipsCollection;
				const playerShips = player.battlefield.shipsCollection;

				if ( data.type == 'missed' || data.notEmpty ) {
					this.activePlayerId = opponent.id;
				} else if ( data.sunk && Array.from( opponentShips ).every( ship => ship.isSunk ) ) {
					data.winnerId = player.id;
					data.winnerShips = Array.from( playerShips )
						.filter( ship => !ship.isSunk )
						.map( ship => ship.toJSON() );

					this._handleRematch();
				}

				data.activePlayerId = this.activePlayerId;

				response.success( data );
				socket.sendToRoom( this.id, 'opponentShot', data );
			}
		} );
	}

	/**
	 * Handles player request rematch after battle.
	 *
	 * @private
	 * @param {Player} player Player instance.
	 */
	_handlePlayerRematchRequest( player ) {
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
	_handleRematch() {
		Promise.all( [ this.player.waitForRematch(), this.opponent.waitForRematch() ] ).then( () => {
			this.player.battlefield.shipsCollection.clear();
			this.player.reset();
			this.opponent.battlefield.shipsCollection.clear();
			this.opponent.reset();
			this.activePlayerId = null;
			this.status = 'full';
			this._socketServer.sendToRoom( this.id, 'rematch' );

			this._handleGameStart();
		} );
	}
}

mix( Game, ObservableMixin );

module.exports = Game;
