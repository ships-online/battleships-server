'use strict';

const EmitterMixin = require( '../../lib/@ckeditor/ckeditor5-utils/src/emittermixin.js' ).default;
const mix = require( '../../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

/**
 * Class that wraps socket.io server.
 *
 * @mixes EmitterMixin
 */
class SocketServer {
	/**
	 * @param {Object} socketIo
	 */
	constructor( socketIo ) {
		/**
		 * Socket.io server instance.
		 *
		 * @private
		 * @type {Object}
		 */
		this._socketIo = socketIo;

		// Expose socket.io#connect event as a class event.
		this._socketIo.on( 'connect', socket => this.fire( 'connect', new Socket( socket ) ) );
	}

	/**
	 * Sends event to all clients in the given room.
	 *
	 * @param {String} roomId
	 * @param {*} args
	 */
	sendToRoom( roomId, ...args ) {
		this._socketIo.sockets.in( roomId ).emit( ...args );
	}

	/**
	 * Generates a list of all sockets from the given room.
	 *
	 * @param {String} roomId
	 */
	* getSocketsInRoom( roomId ) {
		const room = this._socketIo.sockets.adapter.rooms[ roomId ];

		if ( room ) {
			const socketsInRoom = Object.keys( this._socketIo.sockets.adapter.rooms[ roomId ].sockets );

			for ( const socketId of socketsInRoom ) {
				yield this._socketIo.sockets.connected[ socketId ];
			}
		}
	}
}

mix( SocketServer, EmitterMixin );
module.exports.SocketServer = SocketServer;

/**
 * Class that wraps single socket of socket.io.
 *
 * @private
 * @mixes EmitterMixin
 */
class Socket {
	/**
	 * @param {Object} socket Socket.io socket instance.
	 */
	constructor( socket ) {
		/**
		 * Single socket of Socket.io.
		 *
		 * @private
		 * @type {Object}
		 */
		this._socket = socket;

		// Expose socket#disconnect as a class event.
		this._socket.on( 'disconnect', () => this.fire( 'disconnect' ) );
	}

	/**
	 * Socket id.
	 *
	 * @type {String}
	 */
	get id() {
		return this._socket.id;
	}

	/**
	 * Joins to the room of a given id.
	 *
	 * @param {String} roomId
	 */
	join( roomId ) {
		this._socket.join( roomId );
	}

	/**
	 * Sends event to the client.
	 *
	 * @param {*} args
	 */
	send( ...args ) {
		this._socket.emit( ...args );
	}

	/**
	 * Sends event to all clients in the given room except self.
	 *
	 * @param {String} roomId
	 * @param {*} args
	 */
	sendToRoom( roomId, ...args ) {
		this._socket.broadcast.to( roomId ).emit( ...args );
	}

	/**
	 * Handles event from the client that needs a response (requests).
	 * See {@link Response} class to se the response details.
	 *
	 * @param {String} eventName
	 * @param {Function} callback
	 */
	handleRequest( eventName, callback ) {
		this._socket.on( eventName, ( ...args ) => {
			callback( new Response( eventName, this._socket ), ...args );
		} );
	}

	/**
	 * Destroys the class instance.
	 */
	destroy() {
		this.stopListening();
	}
}

mix( Socket, EmitterMixin );
module.exports.Socket = Socket;

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
		this._socket = ioSocket;
	}

	/**
	 * Sends success response.
	 *
	 * @param {*} response Response data.
	 */
	success( response ) {
		this._socket.emit( this._eventName, { response } );
	}

	/**
	 * Sends error response.
	 *
	 * @param {*} error Response data.
	 */
	error( error ) {
		this._socket.emit( this._eventName, { error } );
	}
}
