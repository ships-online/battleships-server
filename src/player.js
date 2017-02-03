const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

class Player {
	constructor( battlefield ) {
		this.battlefield = battlefield;

		this.socket = null;

		this.set( 'isReady', false );

		this.set( 'rematchRequested', false );
	}

	get id() {
		return this.isInGame ? this.socket.id : null;
	}

	get isInGame() {
		return !!this.socket;
	}

	waitForReady() {
		return new Promise( resolve => this.once( 'change:isReady', resolve ) );
	}

	waitForRematch() {
		return new Promise( resolve => this.once( 'change:rematchRequested', resolve ) );
	}

	reset() {
		this.battlefield.clear();
		this.isReady = false;
		this.rematchRequested = false;
	}
}

mix( Player, ObservableMixin );

module.exports = Player;
