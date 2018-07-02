'use strict';

const Table = require( 'cli-table' );
const some = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/some.js' ).default;
const isEqual = require( '../lib/@ckeditor/ckeditor5-utils/src/lib/lodash/isEqual.js' ).default;

module.exports = function printBattlefield( battlefield, positions ) {
	const table = new Table();
	const size = battlefield.size;

	for ( let y = 0; y < size; y++ ) {
		const row = [];

		for ( let x = 0; x < size; x++ ) {
			const field = battlefield.getField( [ x, y ] );

			if ( field ) {
				let val = '';

				if ( field.getFirstShip() ) {
					val += '[';
				}

				if ( field.isHit ) {
					val += 1;
				}

				if ( field.isMissed ) {
					val += 0;
				}

				if ( some( positions, pos => isEqual( pos, [ x, y ] ) ) ) {
					val += '?';
				}

				if ( field.getFirstShip() ) {
					val += ']';
				}

				row.push( val );
			} else {
				if ( some( positions, pos => isEqual( pos, [ x, y ] ) ) ) {
					row.push( '?' );
				} else {
					row.push( '' );
				}
			}
		}

		table.push( row );
	}

	console.log( table.toString() );
};
