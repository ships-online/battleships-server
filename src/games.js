const Game = require( './game.js' );

class Games {
	constructor( io ) {
		this._io = io;
		this._games = new Map();
	}

	handleNewClient( socket ) {
		socket.on( 'create', ( gameData ) => {
			this._createGame( socket, gameData ).then( ( game ) => {
				const response = {
					gameId: game.id,
					playerId: game.player.id
				};

				socket.emit( 'createResponse', { response } );
				socket.on( 'disconnect', () => this._handleHostLeft( game ) );
			} );
		}  );

		socket.on( 'join', ( gameId ) => {
			this._joinGame( socket, gameId )
				.then( ( game ) => {
					const response = {
						gameData: game.gameData,
						playerId: socket.id,
						opponentId: game.player.id,
						isOpponentReady: game.player.isReady,
						interestedPlayers: this._getNumberOfPlayersInRoom( game.id )
					};

					socket.emit( 'joinResponse', { response } );
					socket.on( 'disconnect', () => this._handleClientLeft( game ) );
				} )
				.catch( error => socket.emit( 'joinResponse', error ) );
		} );
	}

	_createGame( socket, gameData ) {
		const game  = new Game( this._io, gameData );

		// Create game.
		game.create( socket );

		// Create room for the game and add host socket to this room.
		socket.join( game.id );

		// Store game.
		this._games.set( game.id, game );

		return Promise.resolve( game );
	}

	_joinGame( socket, gameId ) {
		const game = this._games.get( gameId );

		// When game is available.
		if ( game && !game.isStarted ) {
			const interestedPlayers = this._getNumberOfPlayersInRoom( game.id );

			// Add client to the game.
			game.join( socket );

			// Add client socket to the game room.
			socket.join( game.id );

			// Let know the rest players in the room that new socket joined.
			socket.broadcast.to( game.id ).emit( 'joined', { interestedPlayers } );

			return Promise.resolve( game );

		// When game is not available.
		} else {
			return Promise.reject( { error: game ? 'started' : 'not-exist' } );
		}
	}

	_handleHostLeft( game ) {
		this._io.sockets.in( game.id ).emit( 'gameOver' );
		this._games.delete( game.id );
		game.destroy();
	}

	_handleClientLeft( game ) {
		const room = this._io.sockets.adapter.rooms[ game.id ];
		const playersInRoom = room ? room.length - 1 : 0;

		if ( game.isStarted ) {
			this._io.sockets.in( game.id ).emit( 'gameOver' );
		} else {
			game.opponent.socket = null;
			this._io.sockets.in( game.id ).emit( 'left', { interestedPlayers: playersInRoom } );
		}
	}

	_getNumberOfPlayersInRoom( roomId ) {
		return this._io.sockets.adapter.rooms[ roomId ].length;
	}
}

module.exports = Games;
