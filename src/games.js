const Game = require( './game.js' );

class Games {
	constructor( io ) {
		this._io = io;
		this._games = new Map();
	}

	handleNewClient( socket ) {
		socket.on( 'create', ( gameSettings ) => {
			this._createGame( socket, gameSettings ).then( ( game ) => {
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
						gameSettings: game.gameSettings,
						playerId: socket.id,
						opponentId: game.player.id,
						isOpponentReady: game.player.isReady,
						interestedPlayers: this._getNumberOfPlayersInRoom( game.id ) - 1
					};

					socket.emit( 'joinResponse', { response } );
					socket.on( 'disconnect', () => this._handleClientLeft( game, socket.id ) );
				} )
				.catch( error => socket.emit( 'joinResponse', error ) );
		} );
	}

	_createGame( socket, gameSettings ) {
		const game  = new Game( this._io, gameSettings );

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
		if ( game && game.status == 'available' ) {
			// Add client to the game.
			game.join( socket );

			// Add client socket to the game room.
			socket.join( game.id );

			// Let know the rest players in the room that new socket joined.
			socket.broadcast.to( game.id ).emit( 'joined', {
				interestedPlayers: this._getNumberOfPlayersInRoom( game.id ) - 1
			} );

			return Promise.resolve( game );

		// When game is not available.
		} else {
			return Promise.reject( { error: game ? 'started' : 'not-exist' } );
		}
	}

	_handleHostLeft( game ) {
		this._io.sockets.in( game.id ).emit( 'gameOver', 'host-left' );
		game.destroy();
		this._games.delete( game.id );
	}

	_handleClientLeft( game, clientId ) {
		if ( game.opponent.id == clientId && game.status == 'battle' ) {
			this._io.sockets.in( game.id ).emit( 'gameOver', 'opponent-left' );
			game.destroy();
			this._games.delete( game.id );
		} else {
			if ( game.opponent.id == clientId ) {
				game.opponent.socket = null;
				game.status = 'available';
			}

			this._io.sockets.in( game.id ).emit( 'left', {
				opponentId: clientId,
				interestedPlayers: this._getNumberOfPlayersInRoom( game.id ) - 1
			} );
		}
	}

	_getNumberOfPlayersInRoom( roomId ) {
		const room = this._io.sockets.adapter.rooms[ roomId ];

		return room ? room.length : 0;
	}
}

module.exports = Games;
