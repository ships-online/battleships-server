'use strict';

/* eslint no-console: 0 */

const port = 8080;

const io = require( 'socket.io' )( port );
const Games = require( './src/games.js' );

const games = new Games( io );

io.on( 'connect', socket => games.handleNewClient( socket ) );

console.log( `Battle Ships socket server started on http://localhost:${ port }.` );
