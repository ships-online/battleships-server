'use strict';

/* eslint no-console: 0 */

const port = process.env.PORT || 8080;

const io = require( 'socket.io' )( port );
const { SocketServer } = require( './src/sockets/socketserver.js' );
const Games = require( './src/games.js' );

const socketServer = new SocketServer( io );
const games = new Games( socketServer );

games.init();

console.log( `BattleShips socket server started on port: ${ port }` );
