'use strict';

const shortId = require( 'shortid' );
const mix = require( '../../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;
const EmitterMixin = require( '../../lib/@ckeditor/ckeditor5-utils/src/emittermixin.js' ).default;

class LocalSocket {
	constructor( socketServer ) {
		this.id = shortId.generate();

		this._socketServer = socketServer;
	}

	sendToRoom( ...args ) {
		this._socketServer.sendToRoom( ...args );
	}

	handleRequest( evtName, cb ) {
		this.on( evtName, ( evt, ...args ) => {
			cb( {
				success: () => {},
				error: () => {}
			}, ...args );
		} );
	}

	request( evtName, ...args ) {
		this.fire( evtName, ...args );
	}

	/**
	 * Destroys the class instance.
	 */
	destroy() {
		this.stopListening();
	}
}

mix( LocalSocket, EmitterMixin );
module.exports = LocalSocket;
