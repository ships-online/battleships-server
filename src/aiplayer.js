'use strict';

const Player = require( './player.js' );
const PlayerBattlefield = require( '../lib/battleships-engine/src/playerbattlefield.js' ).default;

const random = require( '../lib/battleships-engine/src/utils/random.js' ).default;
const uniqWith = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/uniqWith.js' ).default;
const differenceWith = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/differenceWith.js' ).default;
const isEqual = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/isEqual.js' ).default;
const {
	getSurroundingPositions,
	getSurroundingHorizontal,
	getSurroundingVertical
} = require( '../lib/battleships-engine/src/utils/positions.js' );

class AiPlayer extends Player {
	constructor( battlefield, socket, game ) {
		super( battlefield, socket );

		this._game = game;
	}

	start() {
		const game = this._game;
		const ships = this._getShipsConfiguration();

		this.socket.request( 'accept' );

		if ( !ships ) {
			this.socket.sendToRoom( this._game.id, 'gameOver', 'opponent-cant-arrange-ships' );

			return;
		}

		this.socket.request( 'ready', ships );

		this.listenTo( game, 'set:activePlayerId', ( evt, name, id ) => {
			if ( id !== this.id ) {
				return;
			}

			if ( game.status == 'battle' ) {
				// Added a timeout for the better UX.
				// Opponent should not react immediately to the state change.
				setTimeout( () => {
					this.socket.request( 'shot', this._getShootPosition() );
				}, 1000 );
			}
		} );
	}

	_getShipsConfiguration() {
		const battlefield = new PlayerBattlefield( this.battlefield.size, this.battlefield.shipsSchema );

		battlefield.random();

		if ( battlefield.isCollision ) {
			return null;
		}

		return battlefield.shipsCollection.toJSON();
	}

	_getShootPosition() {
		const positions = this._getPositions();

		return positions[ random( 0, positions.length - 1 ) ];
	}

	_getPositions() {
		const battlefield = this._game.player.battlefield;
		const size = battlefield.size;
		const positions = [];
		let aroundTheShips = [];

		for ( const ship of battlefield.shipsCollection ) {
			if ( !ship.isSunk && ship.damages.some( damage => damage ) ) {
				return this._getPossibleShipPositions( ship );
			} else if ( ship.isSunk ) {
				aroundTheShips = aroundTheShips.concat( getPositionsAroundTheShip( ship, size ) );
			}
		}

		aroundTheShips = uniqWith( aroundTheShips, isEqual );

		for ( let x = 0; x < battlefield.size; x++ ) {
			for ( let y = 0; y < battlefield.size; y++ ) {
				const field = battlefield.getField( [ x, y ] );

				if ( isFieldEmpty( field ) ) {
					positions.push( [ x, y ] );
				}
			}
		}

		return differenceWith( uniqWith( positions, isEqual ), aroundTheShips, isEqual );
	}

	_getPossibleShipPositions( ship ) {
		const battlefield = this._game.player.battlefield;
		const size = battlefield.size;
		const hitFields = [];
		let positions = [];

		Array.from( ship.getCoordinates() ).forEach( ( position, index ) => {
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
			.filter( position => isInBounds( position, size ) && isFieldEmpty( battlefield.getField( position ) ) );
	}
}

module.exports = AiPlayer;

function isBetween( number, min, max ) {
	return number >= min && number <= max;
}

function isInBounds( position, size ) {
	const max = size - 1;
	const x = position[ 0 ];
	const y = position[ 1 ];

	return isBetween( x, 0, max ) && isBetween( y, 0, max );
}

function getPositionsAroundTheShip( ship, size ) {
	let positions = [];

	for ( const position of ship.getCoordinates() ) {
		positions = positions.concat( getSurroundingPositions( position ) );
	}

	return uniqWith( positions, isEqual ).filter( position => isInBounds( position, size - 1 ) );
}

function isFieldEmpty( field ) {
	return !field || ( !field.isMissed && !field.isHit );
}
