const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

class Player {
	constructor( battlefield ) {
		this.battlefield = battlefield;

		this.socket = null;

		this.set( 'isReady', false );
	}

	get id() {
		return this.socket.id;
	}
}

mix( Player, ObservableMixin );

module.exports = Player;
