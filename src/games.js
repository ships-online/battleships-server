'use strict';

const Game = require( './game.js' );

/**
 * Class for managing games.
 */
class Games {
	/**
	 * @param {socket.io} io Socket.io
	 */
	constructor( io ) {
		/**
		 * Socket io.
		 *
		 * @private
		 * @type {socket.io}
		 */
		this._io = io;

		/**
		 * Stores existing games.
		 *
		 * @private
		 * @type {Map}
		 */
		this._games = new Map();
	}

	/**
	 * Handles new client connecting to the WebSocket.
	 *
	 * @param {socket} socket Socket.io instance.
	 */
	handleNewClient( socket ) {
		// When socket sends `create` event.
		socket.on( 'create', settings => {
			const game = this._createGame( socket, settings );

			// Sends back information about created game.
			socket.emit( 'createResponse', {
				response: {
					gameId: game.id,
					playerId: game.player.id
				}
			} );

			// And start to listen on socket disconnect.
			socket.on( 'disconnect', () => this._handleHostLeft( game ) );
		} );

		// When socket sends `join` event.
		socket.on( 'join', gameId => {
			// Then join socket to the game.
			this._joinGame( socket, gameId )
				.then( game => {
					// Sends back information about game.
					socket.emit( 'joinResponse', {
						response: {
							settings: game.player.battlefield.settings,
							playerId: socket.id,
							opponentId: game.player.id,
							isOpponentReady: game.player.isReady,
							interestedPlayersNumber: this._getNumberOfPlayersInRoom( game.id ) - 1
						}
					} );

					// And start to listen on socket disconnect.
					socket.on( 'disconnect', () => this._handleClientLeft( game, socket.id ) );
				} )
				.catch( error => socket.emit( 'joinResponse', error ) );
		} );
	}

	/**
	 * @private
	 * @param {socket} socket Host socket.
	 * @param {Object} settings Game settings.
	 * @param {Number} [settings.size] Size of the battlefield - how many fields long height will be.
	 * @param {Object} [settings.shipsSchema] Schema with ships allowed on the battlefield.
	 * @returns {Game} Game instance.
	 */
	_createGame( socket, settings ) {
		const game = new Game( this._io, settings );

		// Create game.
		game.create( socket );

		// Create room for the game and add host socket to this room.
		socket.join( game.id );

		// Store game.
		this._games.set( game.id, game );

		return game;
	}

	/**
	 * @private
	 * @param {socket} socket Client socket.
	 * @param {String} gameId Game id.
	 * @returns {Promise.<Game, error>} Promise that return game instance when resolved or error object when rejected.
	 */
	_joinGame( socket, gameId ) {
		const game = this._games.get( gameId );

		// When game is available.
		if ( game && game.status == 'available' ) {
			// Add client socket to the game room.
			socket.join( game.id );

			// Let know other players in the room that new socket joined.
			socket.broadcast.to( game.id ).emit( 'interestedPlayerJoined', {
				interestedPlayersNumber: this._getNumberOfPlayersInRoom( game.id ) - 1
			} );

			// Wait until client accept the game.
			socket.on( 'accept', () => {
				// When game is still available.
				if ( game.status == 'available' ) {
					// Then add socket to the game
					// and inform rest of the clients in room that opponent accepts the game.
					game.join( socket );
					socket.emit( 'acceptResponse' );
					socket.broadcast.to( game.id ).emit( 'interestedPlayerAccepted', { id: game.opponent.id } );
				// Otherwise sends information that game is not available.
				} else {
					socket.emit( 'acceptResponse', {
						error: this.opponent.id == socket.id ? 'already-in-game' : 'not-available'
					} );
				}
			} );

			return Promise.resolve( game );

		// When game is not available.
		} else {
			return Promise.reject( { error: game ? 'started' : 'not-exist' } );
		}
	}

	/**
	 * @private
	 * @param {Game} game Game instance.
	 */
	_handleHostLeft( game ) {
		this._io.sockets.in( game.id ).emit( 'gameOver', 'host-left' );
		this._games.delete( game.id );
		game.destroy();
	}

	/**
	 * @private
	 * @param {Game} game Game instance.
	 * @param {String} clientId Id of disconnected socket.
	 */
	_handleClientLeft( game, clientId ) {
		// When there was a battle.
		if ( game.opponent.id == clientId && game.status == 'battle' ) {
			// Finish the game and inform rest of the players.
			this._io.sockets.in( game.id ).emit( 'gameOver', 'opponent-left' );
			this._games.delete( game.id );
			game.destroy();
		// Otherwise.
		} else {
			// Remove client data from the game and make game available again.
			if ( game.opponent.id == clientId ) {
				game.opponent.socket = null;
				game.status = 'available';
			}

			// Send information for the rest of the players that client left the game.
			this._io.sockets.in( game.id ).emit( 'playerLeft', {
				opponentId: clientId,
				interestedPlayersNumber: this._getNumberOfPlayersInRoom( game.id ) - 1
			} );
		}
	}

	/**
	 * @private
	 * @param {String} roomId Id of socket room.
	 * @returns {Number} number of players in room.
	 */
	_getNumberOfPlayersInRoom( roomId ) {
		const room = this._io.sockets.adapter.rooms[ roomId ];

		return room ? room.length : 0;
	}
}

module.exports = Games;
