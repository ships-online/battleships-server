'use strict';

const Game = require( '../src/game' );
const { SocketServer, Socket } = require( '../src/socketserver' );
const Player = require( '../src/player' );
const expect = require( 'chai' ).expect;
const { ioMock, socketMock } = require( '../lib/battleships-core/tests/_utils/iomock' );

describe( 'Game', () => {
	let game, gameSettings, socketServer, socket;

	beforeEach( () => {
		gameSettings = {
			size: 10,
			shipsSchema: {
				1: 4,
				2: 3
			}
		};

		socketServer = new SocketServer( ioMock() );
		socket = new Socket( socketMock );

		game = new Game( socketServer, gameSettings );
	} );

	describe( 'constructor()', () => {
		it( 'should create game instance', () => {
			expect( game.id ).to.not.empty;
			expect( game.activePlayerId ).to.null;
			expect( game.status ).to.equal( 'available' );
			expect( game.player ).to.instanceof( Player );
			expect( game.player.battlefield.size ).to.equal( 10 );
			expect( game.player.battlefield.shipsSchema ).to.deep.equal( { 1: 4, 2: 3 } );
			expect( game.opponent ).to.instanceof( Player );
			expect( game.opponent.battlefield.size ).to.equal( 10 );
			expect( game.opponent.battlefield.shipsSchema ).to.deep.equal( { 1: 4, 2: 3 } );
		} );
	} );

	describe( 'create()', () => {
		beforeEach( () => {
			game.create( socket );
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
