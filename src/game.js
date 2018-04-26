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
	 * @param {socket.io} io Socket.io instance.
	 * @param {Object} settings Game settings.
	 * @param {Number} [settings.size] Size of the battlefield - how many fields long height will be.
	 * @param {Object} [settings.shipsSchema] Schema with ships allowed on the battlefield.
	 */
	constructor( io, settings ) {
		/**
		 * Socket.io object.
		 *
		 * @private
		 * @type {socket.io}
		 */
		this._io = io;

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
		 * @member {String} #activePlayer
		 */
		this.set( 'activePlayer', null );

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
		this._handlePlayerShoot( this.player, this.opponent );
		this._handlePlayerRematchRequest( this.player );
	}

	/**
	 * @param {socket} socket Client socket.
	 */
	join( socket ) {
		this.opponent.socket = socket;
		this.status = 'full';

		this._handlePlayerReady( this.opponent );
		this._handlePlayerShoot( this.opponent, this.player );
		this._handlePlayerRematchRequest( this.opponent );
	}

	/**
	 * Destroys the game instance, destroy sockets, detach listeners.
	 */
	destroy() {
		const room = this._io.sockets.adapter.rooms[ this.id ];

		if ( room ) {
			const socketsInRoom = Object.keys( this._io.sockets.adapter.rooms[ this.id ].sockets );

			for ( const socketId of socketsInRoom ) {
				this._io.sockets.connected[ socketId ].disconnect();
			}
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
			this.activePlayer = this.player.id;
			this._io.sockets.in( this.id ).emit( 'battleStarted', { activePlayer: this.activePlayer } );
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

		socket.on( 'ready', ships => {
			if ( player.isReady ) {
				return;
			}

			if ( !player.battlefield.validateShips( ships ) ) {
				socket.emit( 'readyResponse', { error: 'invalid-ships-configuration' } );
			} else {
				player.battlefield.shipsCollection.add( ShipsCollection.createShipsFromJSON( ships ) );
				player.isReady = true;

				socket.emit( 'readyResponse' );
				socket.broadcast.to( this.id ).emit( 'playerReady' );
			}
		} );
	}

	/**
	 * Handles player shoot and validates influence on the current game.
	 *
	 * @private
	 * @param {Player} player Player instance.
	 * @param {Player} opponent Opponent instance.
	 */
	_handlePlayerShoot( player, opponent ) {
		const socket = player.socket;

		socket.on( 'shoot', position => {
			if ( this.status != 'battle' ) {
				socket.emit( 'shootResponse', { error: 'invalid-game-status' } );
			} else if ( this.activePlayer != player.id ) {
				socket.emit( 'shootResponse', { error: 'invalid-turn' } );
			} else {
				const response = opponent.battlefield.shoot( position );

				if ( response.type == 'missed' || response.notEmpty ) {
					this.activePlayer = opponent.id;
				} else {
					if ( response.sunk ) {
						if ( Array.from( opponent.battlefield.shipsCollection ).every( ship => ship.isSunk ) ) {
							response.winner = player.id;

							this._handleRematch();
						}
					}
				}

				response.activePlayer = this.activePlayer;

				socket.emit( 'shootResponse', { response } );
				socket.broadcast.to( this.id ).emit( 'playerShoot', response );
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

		socket.on( 'requestRematch', () => {
			socket.emit( 'requestRematchResponse' );
			player.rematchRequested = true;
			this._io.sockets.in( this.id ).emit( 'playerRequestRematch', { playerId: player.id } );
		} );
	}

	/**
	 * Handles both players requested rematch after battle.
	 *
	 * @private
	 */
	_handleRematch() {
		Promise.all( [ this.player.waitForRematch(), this.opponent.waitForRematch() ] ).then( () => {
			this.player.reset();
			this.opponent.reset();
			this.activePlayer = null;
			this.status = 'full';
			this._io.sockets.in( this.id ).emit( 'rematch' );

			this._handleGameStart();
		} );
	}
}

mix( Game, ObservableMixin );

module.exports = Game;
