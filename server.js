'use strict';

const port = 8080;
const io = require( 'socket.io' )( port );

console.log( `Battle Ships socket server started on http://localhost:${ port }.` );
