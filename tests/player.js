const expect = require( 'chai' ).expect;
const Player = require( '../src/player.js' );
const Battlefield = require( '../lib/battleships-engine/src/battlefield.js' ).default;
const sinon = require( 'sinon' );

describe( 'Player', () => {
	let player;

	beforeEach( () => {
		player = new Player( new Battlefield() );
	} );

	describe( 'constructor()', () => {
		it( 'should create player instance', () => {
			expect( player ).to.instanceof( Player );
			expect( player.battlefield ).to.instanceof( Battlefield );
			expect( player.socket ).to.null;
			expect( player.isReady ).to.false;
			expect( player.rematchRequested ).to.false;
		} );
	} );

	describe( 'id', () => {
		it( 'should return socket id', () => {
			player.socket = { id: 'foobar' };

			expect( player.id ).to.equal( 'foobar' );
		} );

		it( 'should return null when socket is not set', () => {
			expect( player.id ).to.null;
		} );
	} );

	describe( 'isInGame', () => {
		it( 'should return `true` when socket is set', () => {
			player.socket = {};

			expect( player.isInGame ).to.true;
		} );

		it( 'should return `false` when socket is set', () => {
			expect( player.isInGame ).to.false;
		} );
	} );

	describe( 'waitForReady()', () => {
		it( 'should return promise which resolve when player will be ready', ( done ) => {
			player.waitForReady().then( () => {
				expect( player.isReady ).to.true;
				done();
			} );

			player.isReady = true;
		} );
	} );

	describe( 'waitForRematch()', () => {
		it( 'should return promise which resolve when player will request rematch', ( done ) => {
			player.waitForRematch().then( () => {
				expect( player.rematchRequested ).to.true;
				done();
			} );

			player.rematchRequested = true;
		} );
	} );

	describe( 'reset()', () => {
		it( 'should reset player to default values', () => {
			const spy = sinon.spy( player.battlefield, 'reset' );

			player.isReady = true;
			player.rematchRequested = true;

			player.reset();

			expect( spy.calledOnce ).to.true;
			expect( player.isReady ).to.false;
			expect( player.rematchRequested ).to.false;
		} );
	} );
} );
