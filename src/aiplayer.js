'use strict';

const Player = require( './player.js' );
const PlayerBattlefield = require( '../lib/battleships-engine/src/playerbattlefield.js' ).default;

const random = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/random.js' ).default;
const uniqWith = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/uniqWith.js' ).default;
const differenceWith = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/differenceWith.js' ).default;
const isEqual = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/isEqual.js' ).default;
const {
	getSurroundingHorizontal,
	getSurroundingVertical,
	isPositionInBounds,
	getPositionsAroundTheShip
} = require( '../lib/battleships-engine/src/utils/positions.js' );

/**
 * Not too smart AI :)
 *
 * @extends Player
 */
class AiPlayer extends Player {
	/**
	 * @param {Battlefield} battlefield
	 * @param {Socket} socket
	 * @param {Game} game
	 */
	constructor( battlefield, socket, game ) {
		super( battlefield, socket );

		this._game = game;
	}

	/**
	 * Starts listening and reacts on game life cycle changes.
	 */
	start() {
		const game = this._game;

		this.socket.request( 'accept' );

		this._setShips();

		this.listenTo( game, 'tick', () => {
			if ( game.status === 'battle' ) {
				if ( this.id === game.activePlayerId ) {
					wait( 1000 ).then( () => {
						this.socket.request( 'shot', this._getShootPosition() );
					} );
				}

				return;
			}

			if ( game.status === 'over' ) {
				wait( 1000 ).then( () => {
					this.socket.request( 'requestRematch' );
				} );

				return;
			}

			if ( game.status === 'full' ) {
				this._setShips();
			}
		} );
	}

	_setShips() {
		const ships = this._getShipsConfiguration();

		if ( !ships ) {
			this.socket.sendToRoom( this._game.id, 'gameOver', 'opponent-cant-arrange-ships' );

			return;
		}

		this.socket.request( 'ready', ships );
	}

	/**
	 * Returns random configuration of ships on the battlefield.
	 *
	 * @private
	 * @returns {Array<Ship>}
	 */
	_getShipsConfiguration() {
		const battlefield = new PlayerBattlefield( this.battlefield.size, this.battlefield.shipsSchema );

		battlefield.random();

		if ( battlefield.isCollision ) {
			return null;
		}

		return battlefield.shipsCollection.toJSON();
	}

	/**
	 * @private
	 * @returns {Array<Number, Number>} Position [ x, y ]
	 */
	_getShootPosition() {
		const positions = this._getAvailablePositions();

		return positions[ random( 0, positions.length - 1 ) ];
	}

	/**
	 * @private
	 * @returns {Array<Array>} Array of positions [ x, y ].
	 */
	_getAvailablePositions() {
		const battlefield = this._game.player.battlefield;
		const size = battlefield.size;
		const positions = [];
		let aroundTheShips = [];

		// First try to get position of damaged ships.
		// If there is no any, then collect positions surrounding sunk ships.
		for ( const ship of battlefield.shipsCollection ) {
			if ( !ship.isSunk && ship.damages.some( damage => damage ) ) {
				return this._getPossibleShipPositions( ship );
			} else if ( ship.isSunk ) {
				aroundTheShips = aroundTheShips.concat( getPositionsAroundTheShip( ship, size ) );
			}
		}

		// Remove duplicated positions.
		aroundTheShips = uniqWith( aroundTheShips, isEqual );

		// Collect all available positions on the battlefield.
		for ( let x = 0; x < battlefield.size; x++ ) {
			for ( let y = 0; y < battlefield.size; y++ ) {
				const field = battlefield.getField( [ x, y ] );

				if ( isFieldEmpty( field ) ) {
					positions.push( [ x, y ] );
				}
			}
		}

		// Returns positions excluding positions around sunk ships.
		return differenceWith( positions, aroundTheShips, isEqual );
	}

	/**
	 * @private
	 * @param {Ship} ship
	 * @returns {Array<Array>} Array of positions [ x, y ].
	 */
	_getPossibleShipPositions( ship ) {
		const battlefield = this._game.player.battlefield;
		const size = battlefield.size;
		const hitFields = [];
		let positions = [];

		Array.from( ship.getPositions() ).forEach( ( position, index ) => {
			if ( ship.damages[ index ] ) {
				hitFields.push( position );
			}
		} );

		if ( hitFields.length > 1 ) {
			if ( ship.isRotated ) {
				for ( const position of hitFields ) {
					positions = positions.concat( getSurroundingVertical( position ) );
				}
			} else {
				for ( const position of hitFields ) {
					positions = positions.concat( getSurroundingHorizontal( position ) );
				}
			}
		} else {
			positions = positions.concat( getSurroundingHorizontal( hitFields[ 0 ] ) );
			positions = positions.concat( getSurroundingVertical( hitFields[ 0 ] ) );
		}

		positions = uniqWith( positions, isEqual );

		return positions
			.filter( position => isPositionInBounds( position, size ) && isFieldEmpty( battlefield.getField( position ) ) );
	}
}

module.exports = AiPlayer;

function isFieldEmpty( field ) {
	return !field || ( !field.isMissed && !field.isHit );
}

function wait( ms ) {
	return new Promise( resolve => setTimeout( resolve, ms ) );
}
