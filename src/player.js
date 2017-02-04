const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

/**
 * Player class.
 *
 * Represents single player in the game.
 */
class Player {
	/**
	 * @param {Battlefield} battlefield Player battlefield instance.
	 */
	constructor( battlefield ) {
		/**
		 * Player battlefield instance.
		 *
		 * @type {Battlefield}
		 */
		this.battlefield = battlefield;

		/**
		 * Socket.io instance.
		 *
		 * @type {socket|null}
		 */
		this.socket = null;

		/**
		 * Defines if player is ready to the battle or not.
		 *
		 * @observable
		 * @type {Boolean}
		 */
		this.set( 'isReady', false );

		this.set( 'rematchRequested', false );
	}

	/**
	 * @returns {String|null} Return player id when player is connected with to the socket or `null` otherwise.
	 */
	get id() {
		return this.isInGame ? this.socket.id : null;
	}

	/**
	 * @returns {boolean} Return `true` when player is connected to the socket or `false` otherwise.
	 */
	get isInGame() {
		return !!this.socket;
	}

	/**
	 * Wait until player will be ready.
	 *
	 * @returns {Promise} Promise which will be resolved when player will be ready.
	 */
	waitForReady() {
		return new Promise( resolve => this.once( 'change:isReady', resolve ) );
	}

	/**
	 * Wait until player will request rematch.
	 *
	 * @returns {Promise} Promise which will be resolved when player will request rematch.
	 */
	waitForRematch() {
		return new Promise( resolve => this.once( 'change:rematchRequested', resolve ) );
	}

	/**
	 * Resets all player data.
	 */
	reset() {
		this.battlefield.reset();
		this.isReady = false;
		this.rematchRequested = false;
	}
}

mix( Player, ObservableMixin );

module.exports = Player;
