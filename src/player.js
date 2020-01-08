'use strict';

const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

/**
 * Class that represents player in the game.
 *
 * @mixes ObservableMixin
 */
class Player {
	/**
	 * @param {Battlefield} battlefield
	 * @param {Object} socket
	 */
	constructor( battlefield, socket ) {
		/**
		 * Player battlefield instance.
		 *
		 * @type {Battlefield}
		 */
		this.battlefield = battlefield;

		/**
		 * Socket.io instance.
		 *
		 * @type {Socket}
		 */
		this.socket = socket;

		/**
		 * Defines if player is ready to the battle or not.
		 *
		 * @observable
		 * @member {Boolean} #isReady
		 */
		this.set( 'isReady', false );

		/**
		 * Defines if player requested rematch and waits for it.
		 *
		 * @observable
		 * @member {Boolean} #rematchRequested
		 */
		this.set( 'rematchRequested', false );
	}

	/**
	 * @returns {String} Return player socket id as a Player id.
	 */
	get id() {
		return this.socket.id;
	}

	/**
	 * Waits until player is ready.
	 *
	 * @returns {Promise} Promise which will be resolved when player will be ready.
	 */
	waitForReady() {
		return new Promise( resolve => {
			if ( this.isReady ) {
				resolve();
			} else {
				this.once( 'change:isReady', resolve );
			}
		} );
	}

	/**
	 * Waits until player will request rematch.
	 *
	 * @returns {Promise} Promise which will be resolved when player will request rematch.
	 */
	waitForRematch() {
		return new Promise( resolve => this.once( 'change:rematchRequested', resolve ) );
	}

	/**
	 * Resets player data to default values.
	 */
	reset() {
		this.battlefield.reset();
		this.isReady = false;
		this.rematchRequested = false;
	}

	/**
	 * Destroys the player.
	 */
	destroy() {
		this.stopListening();
		this.battlefield.destroy();
		this.socket.destroy();
	}
}

mix( Player, ObservableMixin );
module.exports = Player;
