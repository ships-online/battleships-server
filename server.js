'use strict';

const port = 8080;

require( 'socket.io' )( port );

console.log( `Battle Ships socket server started on http://localhost:${ port }.` );
