'use strict';

const Game = require( './game.js' );
const Player = require( './player.js' );
const AiPlayer = require( './aiplayer.js' );
const OpponentBattlefield = require( '../lib/battleships-engine/src/opponentbattlefield.js' ).default;
const LocalSocket = require( './sockets/localsocket.js' );

/**
 * Class for games managing.
 */
class Games {
	/**
	 * @param {SocketServer} socketServer
	 */
	constructor( socketServer ) {
		/**
		 * Socket server.
		 *
		 * @private
		 * @type {SocketServer}
		 */
		this._socketServer = socketServer;

		/**
		 * Maps of pending games.
		 *
		 * @private
		 * @type {Map.<String,Game>}
		 */
		this._games = new Map();
	}

	/**
	 * @param {Object} socket Socket.io instance.
	 */
	handleConnection( socket ) {
		socket.handleRequest( 'create', ( response, data ) => {
			const game = new Game( this._socketServer );
			const player = new Player( new OpponentBattlefield( data.size, data.shipsSchema ), socket );

			game.create( player );
			socket.join( game.id );
			this._games.set( game.id, game );

			response.success( {
				gameId: game.id,
				playerId: player.id
			} );

			socket.on( 'disconnect', () => this._handleHostLeft( game ) );
		} );

		socket.handleRequest( 'join', ( response, gameId, options = {} ) => {
			const game = this._games.get( gameId );
			const player = game.player;
			const { size, shipsSchema } = player.battlefield.settings;

			if ( !game ) {
				return response.error( 'not-exist' );
			}

			if ( game.status !== 'available' ) {
				return response.error( 'started' );
			}

			if ( options.ai ) {
				const aiSocket = new LocalSocket( game._socketServer );
				const opponent = new AiPlayer( new OpponentBattlefield( size, shipsSchema ), aiSocket, game );

				this._handleClientAccept( game, opponent );
				opponent.start();

				response.success( {
					opponentId: opponent.id
				} );
			} else {
				const opponent = new Player( new OpponentBattlefield( size, shipsSchema ), socket );

				this._handleClientAccept( game, opponent );
				socket.join( game.id );
				socket.on( 'disconnect', () => this._handleClientLeft( game, socket.id ) );

				response.success( {
					settings: player.battlefield.settings,
					playerId: opponent.id,
					opponentId: player.id,
					isOpponentReady: player.isReady,
					guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
				} );
			}
		} );
	}

	/**
	 * @private
	 * @param {Game} game
	 * @param {Player} opponent
	 */
	_handleClientAccept( game, opponent ) {
		const socket = opponent.socket;

		socket.sendToRoom( game.id, 'guestJoined', {
			guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
		} );

		socket.handleRequest( 'accept', response => {
			if ( game.status === 'available' ) {
				game.join( opponent );
				response.success();
				socket.sendToRoom( game.id, 'guestAccepted', { id: game.opponent.id } );
			} else {
				response.error( this.opponent.id === socket.id ? 'already-in-game' : 'not-available' );
			}
		} );
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
		const opponent = game.opponent;

		// When there was a battle then finish the game.
		if ( game.status === 'battle' && opponent.id === clientId ) {
			this._socketServer.sendToRoom( game.id, 'gameOver', 'opponent-left' );
			this._games.delete( game.id );
			game.destroy();
		// Otherwise.
		} else {
			// Remove opponent from the game and make the game available.
			if ( opponent && opponent.id === clientId ) {
				opponent.destroy();
				game.opponent = null;
				game.status = 'available';
			}

			// Send information to the rest of the players that client has left the game.
			this._socketServer.sendToRoom( game.id, 'playerLeft', {
				opponentId: clientId,
				guestsNumber: Array.from( this._socketServer.getSocketsInRoom( game.id ) ).length - 1
			} );
		}
	}
}

module.exports = Games;
