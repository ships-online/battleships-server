const ObservableMixin = require( '../lib/battleships-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/battleships-utils/src/mix.js' ).default;

class Player {
	constructor( battlefield ) {
		this.battlefield = battlefield;

		this.socket = null;

		this.set( 'isReady', false );
	}
}

mix( Player, ObservableMixin );

module.exports = Player;
