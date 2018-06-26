'use strict';

const Game = require( './game.js' );

/**
 * Class for managing games.
 */
class Games {
	/**
	 * @param {SocketServer} socketServer
	 */
	constructor( socketServer ) {
		/**
		 * Instance for managing socket connections.
		 *
		 * @private
		 * @type {SocketServer}
		 */
		this._socketServer = socketServer;

		/**
		 * Stores existing games.
		 *
		 * @private
		 * @type {Map}
		 */
		this._games = new Map();
	}

	/**
	 * Starts listening on new clients.
	 */
	init() {
		this._socketServer.on( 'connect', ( evt, socket ) => this._handleNewClient( socket ) );
	}

	/**
	 * Handles new client connecting to the WebSocket.
	 *
	 * @private
	 * @param {socket} socket Socket.io instance.
	 */
	_handleNewClient( socket ) {
		socket.handleRequest( 'create', ( response, settings ) => {
			const game = this._createGame( socket, settings );

			response.success( {
				gameId: game.id,
				playerId: game.player.id
			} );

			socket.on( 'disconnect', () => this._handleHostLeft( game ) );
		} );

		socket.handleRequest( 'join', ( response, gameId ) => {
			this._joinGame( socket, gameId )
				.then( game => {
					response.success( {
						settings: game.player.battlefield.settings,
						playerId: socket.id,
						opponentId: game.player.id,
						isOpponentReady: game.player.isReady,
						guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
					} );

					socket.on( 'disconnect', () => this._handleClientLeft( game, socket.id ) );
				} )
				.catch( error => response.error( error ) );
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
		const game = new Game( this._socketServer, settings );

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
			socket.sendToRoom( game.id, 'guestJoined', {
				guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
			} );

			// Wait until client accept the game.
			socket.handleRequest( 'accept', response => {
				if ( game.status == 'available' ) {
					// Then add socket to the game
					// and inform rest of the clients in room that opponent accepts the game.
					game.join( socket );
					response.success( 'acceptResponse' );
					socket.sendToRoom( game.id, 'guestAccepted', { id: game.opponent.id } );
				// Otherwise sends information that the game is not available.
				} else {
					response.error( this.opponent.id == socket.id ? 'already-in-game' : 'not-available' );
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
		this._socketServer.sendToRoom( game.id, 'gameOver', 'host-left' );
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
			this._socketServer.sendToRoom( game.id, 'gameOver', 'opponent-left' );
			this._games.delete( game.id );
			game.destroy();
		// Otherwise.
		} else {
			// Remove client data from the game and make the game available.
			if ( game.opponent.id == clientId ) {
				game.opponent.socket = null;
				game.status = 'available';
			}

			// Send information for the rest of the players that client left the game.
			this._socketServer.sendToRoom( game.id, 'playerLeft', {
				opponentId: clientId,
				guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
			} );
		}
	}
}

module.exports = Games;
