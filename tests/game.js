'use strict';

const Game = require( '../src/game' );
const Player = require( '../src/player' );
const expect = require( 'chai' ).expect;

describe( 'Game', () => {
	let game, ioMock, gameSettings;

	beforeEach( () => {
		ioMock = {};
		gameSettings = {
			size: 10,
			shipsSchema: {
				1: 4,
				2: 3
			}
		};

		game = new Game( ioMock, gameSettings );
	} );

	describe( 'constructor()', () => {
		it( 'should create game instance', () => {
			expect( game.id ).to.not.empty;
			expect( game.settings ).to.equal( gameSettings );
			expect( game.activePlayer ).to.null;
			expect( game.status ).to.equal( 'available' );
			expect( game.player ).to.instanceof( Player );
			expect( game.opponent ).to.instanceof( Player );
		} );
	} );
} );
