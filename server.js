'use strict';

/* eslint no-console: 0 */

const port = 8080;

const io = require( 'socket.io' )( port );
const Game = require( './src/game.js' );

const games = new Map();

io.on( 'connect', ( socket ) => {
	// Handle game create.
	socket.on( 'create', ( gameData ) => {
		const game  = new Game( io, gameData );

		game.create( socket );
		games.set( game.id, game );

		// Handle host disconnect.
		socket.on( 'disconnect', () => {
			io.sockets.in( game.id ).emit( 'gameOver' );
			games.delete( game.id );
			game.destroy();
		} );
	} );

	// Handle player join.
	socket.on( 'join', ( gameId ) => {
		const game = games.get( gameId );

		// There is no game of given id.
		if ( !game ) {
			socket.emit( 'joinResponse', { response: { status: 'not-exist' } } );
		// This game has already started.
		} else if ( game.isStarted ) {
			socket.emit( 'joinResponse', { response: { status: 'started' } } );
		} else {
			game.join( socket );

			// Handle client disconnect.
			socket.on( 'disconnect', () => {
				const room = io.sockets.adapter.rooms[ game.id ];
				const playersInRoom = room ? room.length - 1 : 0;

				if ( game.isStarted ) {
					io.sockets.in( game.id ).emit( 'gameOver' );
				} else {
					game.opponent.socket = null;
					io.sockets.in( game.id ).emit( 'left', { interestedPlayers: playersInRoom } );
				}
			} );
		}
	} );
} );

console.log( `Battle Ships socket server started on http://localhost:${ port }.` );
