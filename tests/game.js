'use strict';

const expect = require( 'chai' ).expect;

const Game = require( '../src/game' );
const Player = require( '../src/player' );
const Battlefield = require( '../lib/battleships-engine/src/battlefield.js' ).default;
const { SocketServer, Socket } = require( '../src/sockets/socketserver' );
const { ioMock, socketMock } = require( '../lib/battleships-core/tests/_utils/iomock' );

describe( 'Game', () => {
	let game, socketServer, player;

	beforeEach( () => {
		socketServer = new SocketServer( ioMock() );
		player = new Player( new Battlefield( 10, { 1: 2 } ), new Socket( socketMock ) );

		game = new Game( socketServer );
	} );

	describe( 'constructor()', () => {
		it( 'should create game instance', () => {
			expect( game.id ).to.not.empty;
			expect( game.status ).to.equal( 'available' );
			expect( game.activePlayerId ).to.null;
			expect( game.player ).to.undefined;
			expect( game.opponent ).to.undefined;
		} );
	} );

	describe( 'create()', () => {
		beforeEach( () => {
			game.create( player );
		} );

		it( 'should set player', () => {
			expect( game.player ).to.equal( player );
		} );

		describe( 'handling player ready', () => {
			it( 'should response error when player ship configuration is invalid', done => {
				socketMock.on( 'response-ready', data => {
					expect( data ).to.deep.equal( { error: 'invalid-ships-configuration' } );
					done();
				} );

				socketMock.emit( 'ready', [
					{
						id: '1',
						length: 1,
						position: [ 0, 0 ],
						isRotated: false
					},
					{
						id: '2',
						length: 1,
						position: [ 0, 0 ],
						isRotated: false
					}
				] );
			} );

			it( 'should response with success, add ships to the battlefield and mark player as ready', done => {
				const shipsJSON = [
					{
						id: '1',
						length: 1,
						position: [ 0, 0 ],
						isRotated: false
					},
					{
						id: '2',
						length: 1,
						position: [ 0, 2 ],
						isRotated: false
					}
				];

				socketMock.on( 'response-ready', () => {
					expect( game.player.isReady ).to.true;
					expect( game.player.battlefield.shipsCollection.toJSON() ).to.deep.equal( shipsJSON );

					done();
				} );

				socketMock.emit( 'ready', shipsJSON );
			} );
		} );
	} );
} );
