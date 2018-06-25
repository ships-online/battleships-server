'use strict';

const EmitterMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/emittermixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

/**
 * Class that wraps socket.io server.
 *
 * @mixes EmitterMixin
 */
class SocketServer {
	/**
	 * @param {io} ioServer
	 */
	constructor( ioServer ) {
		/**
		 * Socket.io server instance.
		 *
		 * @private
		 * @type {io}
		 */
		this._ioServer = ioServer;

		// Bind socket.io connect event to this class.
		this._ioServer.on( 'connect', socket => {
			this.fire( 'connect', new Socket( socket ) );
		} );
	}

	/**
	 * Sends event to all clients in the given room.
	 *
	 * @param {String} roomId
	 * @param {*} args
	 */
	sendToRoom( roomId, ...args ) {
		this._ioServer.sockets.in( roomId ).emit( ...args );
	}

	/**
	 * Returns all sockets from the given room.
	 *
	 * @param {String} roomId
	 */
	* getSocketsInRoom( roomId ) {
		const room = this._ioServer.sockets.adapter.rooms[ roomId ];

		if ( room ) {
			const socketsInRoom = Object.keys( this._ioServer.sockets.adapter.rooms[ roomId ].sockets );

			for ( const socketId of socketsInRoom ) {
				yield this._ioServer.sockets.connected[ socketId ];
			}
		}
	}
}

mix( SocketServer, EmitterMixin );

/**
 * Class that wraps single socket.io socket.
 *
 * @private
 * @mixes EmitterMixin
 */
class Socket {
	/**
	 * @param {socket} ioSocket Socket.io socket instance.
	 */
	constructor( ioSocket ) {
		/**
		 * Socket.io socket.
		 *
		 * @private
		 * @type {socket}
		 */
		this._ioSocket = ioSocket;

		// Bind socket#disconnect to this class.
		this._ioSocket.on( 'disconnect', () => this.fire( 'disconnect' ) );
	}

	/**
	 * Returns socket id.
	 *
	 * @returns {String}
	 */
	get id() {
		return this._ioSocket.id;
	}

	/**
	 * Join to socket room.
	 *
	 * @param {String} roomId
	 */
	join( roomId ) {
		this._ioSocket.join( roomId );
	}

	/**
	 * Sends event to the client.
	 *
	 * @param {*} args
	 */
	send( ...args ) {
		this._ioSocket.emit( ...args );
	}

	/**
	 * Sends event to all clients in the given room except self.
	 *
	 * @param {String} roomId
	 * @param {*} args
	 */
	sendToRoom( roomId, ...args ) {
		this._ioSocket.broadcast.to( roomId ).emit( ...args );
	}

	/**
	 * Handles event from the client that needs a response (requests).
	 * See {@link Response} class to se the response details.
	 *
	 * @param {String} eventName
	 * @param {Function.<Response>} callback
	 */
	handleRequest( eventName, callback ) {
		this._ioSocket.on( eventName, ( ...args ) => {
			callback( new Response( eventName, this._ioSocket ), ...args );
		} );
	}
}

mix( Socket, EmitterMixin );

/**
 * Response for events that makes request role.
 *
 * @private
 */
class Response {
	/**
	 * @param {String} eventName
	 * @param {socket} ioSocket
	 */
	constructor( eventName, ioSocket ) {
		/**
		 * Response event name.
		 *
		 * @private
		 * @type {String}
		 */
		this._eventName = 'response-' + eventName;

		/**
		 * Socket.io socket.
		 *
		 * @private
		 * @type {socket}
		 */
		this._ioSocket = ioSocket;
	}

	/**
	 * Sends success response.
	 *
	 * @param {*} response Response data.
	 */
	success( response ) {
		this._ioSocket.emit( this._eventName, { response } );
	}

	/**
	 * Sends error response.
	 *
	 * @param {*} error Response data.
	 */
	error( error ) {
		this._ioSocket.emit( this._eventName, { error } );
	}
}

module.exports = { SocketServer, Socket };
