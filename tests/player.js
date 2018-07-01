'use strict';

const expect = require( 'chai' ).expect;
const sinon = require( 'sinon' );

const Player = require( '../src/player.js' );

describe( 'Player', () => {
	let player, battlefieldMock, socketMock;

	beforeEach( () => {
		socketMock = {
			id: 'socket-id',
			destroy: sinon.spy()
		};

		battlefieldMock = {
			destroy: sinon.spy(),
			reset: sinon.spy()
		};

		player = new Player( battlefieldMock, socketMock );
	} );

	describe( 'constructor()', () => {
		it( 'should create player instance', () => {
			expect( player.battlefield ).to.equal( battlefieldMock );
			expect( player.socket ).to.equal( socketMock );
			expect( player.id ).to.equal( 'socket-id' );
			expect( player.isReady ).to.false;
			expect( player.rematchRequested ).to.false;
		} );
	} );

	describe( 'id', () => {
		it( 'should return socket id', () => {
			player.socket = { id: 'foobar' };

			expect( player.id ).to.equal( 'foobar' );
		} );
	} );

	describe( 'waitForReady()', () => {
		it( 'should return promise which resolve when player will be ready', done => {
			player.waitForReady().then( () => {
				expect( player.isReady ).to.true;
				done();
			} );

			player.isReady = true;
		} );
	} );

	describe( 'waitForRematch()', () => {
		it( 'should return promise which resolve when player will request rematch', done => {
			player.waitForRematch().then( () => {
				expect( player.rematchRequested ).to.true;
				done();
			} );

			player.rematchRequested = true;
		} );
	} );

	describe( 'reset()', () => {
		it( 'should reset player to default values', () => {
			player.isReady = true;
			player.rematchRequested = true;

			player.reset();

			sinon.assert.calledOnce( battlefieldMock.reset );
			expect( player.isReady ).to.false;
			expect( player.rematchRequested ).to.false;
		} );
	} );

	describe( 'destroy()', () => {
		it( 'should stop listening', () => {
			const spy = sinon.spy( Player.prototype, 'stopListening' );

			player.destroy();

			sinon.assert.calledOnce( spy );

			spy.restore();
		} );

		it( 'should destroy socket and battlefield', () => {
			player.destroy();

			sinon.assert.calledOnce( battlefieldMock.destroy );
			sinon.assert.calledOnce( socketMock.destroy );
		} );
	} );
} );
