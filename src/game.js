'use strict';

const Player = require( './player.js' );
const OpponentBattlefield = require( '../lib/battleships-engine/src/opponentbattlefield.js' ).default;
const ShipsCollection = require( '../lib/battleships-engine/src/shipscollection.js' ).default;
const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

const shortId = require( 'shortid' );

class Game {
	constructor( io, gameSettings ) {
		this.io = io;

		this.id = shortId.generate();

		this.gameSettings = gameSettings;

		this.set( 'activePlayer', null );

		this.set( 'status', 'available' );

		this.player = new Player( new OpponentBattlefield( gameSettings.size, gameSettings.shipsSchema ) );

		this.opponent = new Player( new OpponentBattlefield( gameSettings.size, gameSettings.shipsSchema ) );
	}

	create( socket ) {
		this.player.socket = socket;

		this._handlePlayerReady( this.player, this.opponent );
		this._handlePlayerShoot( this.player, this.opponent );
		this._handleRematchRequest( this.player );
		this._handleGameStart();
	}

	join( socket ) {
		socket.on( 'accept', () =>  {
			if ( this.status != 'available' ) {
				socket.emit( 'acceptResponse', {
					error: this.opponent.id == socket.id ? 'already-in-game' : 'not-available'
				} );
			} else {
				this.opponent.socket = socket;
				this.status = 'full';

				socket.emit( 'acceptResponse' );
				socket.broadcast.to( this.id ).emit( 'accepted', { id: this.opponent.id } );

				this._handlePlayerReady( this.opponent, this.player );
				this._handlePlayerShoot( this.opponent, this.player );
				this._handleRematchRequest( this.opponent );
			}
		} );
	}

	_handlePlayerReady( player ) {
		const socket = player.socket;

		socket.on( 'ready', ( ships ) => {
			if ( player.isReady ) {
				return;
			}

			if ( !player.isInGame ) {
				socket.emit( 'readyResponse', { error: 'player-not-in-game' } );
			} else if ( !player.battlefield.validateShips( ships ) ) {
				socket.emit( 'readyResponse', { error: 'invalid-ships-configuration' } );
			} else {
				player.battlefield.shipsCollection.add( ShipsCollection.createShipsFromJSON( ships ) );
				player.isReady = true;

				socket.emit( 'readyResponse' );
				socket.broadcast.to( this.id ).emit( 'ready' );
			}
		} );
	}

	_handleGameStart() {
		Promise.all( [ this.player.waitForReady(), this.opponent.waitForReady() ] ).then( () => {
			this.status = 'battle';
			this.activePlayer = this.player.id;
			this.io.sockets.in( this.id ).emit( 'started', { activePlayer: this.activePlayer } );
		} );
	}

	_handleRematch() {
		Promise.all( [ this.player.waitForRematch(), this.opponent.waitForRematch() ] ).then( () => {
			this.player.reset();
			this.opponent.reset();
			this.activePlayer = null;
			this.status = 'full';
			this.io.sockets.in( this.id ).emit( 'rematch' );

			this._handleGameStart();
		} );
	}

	_handleRematchRequest( player ) {
		const socket = player.socket;

		socket.on( 'rematch', () => {
			socket.emit( 'rematchResponse' );
			player.rematchRequested = true;
			this.io.sockets.in( this.id ).emit( 'rematchRequested', { playerId: player.id } );
		} );
	}

	_handlePlayerShoot( player, opponent ) {
		const socket = player.socket;

		socket.on( 'shoot', ( position ) => {
			if ( this.status != 'battle' ) {
				socket.emit( 'shootResponse', { error: 'invalid-game-status' } );
			} if ( this.activePlayer != player.id ) {
				socket.emit( 'shootResponse', { error: 'not-your-turn' } );
			} else {
				const response = opponent.battlefield.shoot( position );

				if ( response.type == 'missed' || response.type == 'notEmpty' ) {
					this.activePlayer = opponent.id;
				} else {
					if ( response.sunk ) {
						if ( Array.from( opponent.battlefield.shipsCollection ).every( ship => ship.isSunk ) ) {
							response.winner = player.id;

							this._handleRematch();
						}
					}
				}

				response.activePlayer = this.activePlayer;

				socket.emit( 'shootResponse', { response } );
				socket.broadcast.to( this.id ).emit( 'shoot', response );
			}
		} );
	}

	destroy() {
		const room = this.io.sockets.adapter.rooms[ this.id ];

		if ( room ) {
			const socketsInRoom = Object.keys( this.io.sockets.adapter.rooms[ this.id ].sockets );

			for ( const socketId of socketsInRoom ) {
				this.io.sockets.connected[ socketId ].disconnect();
			}
		}

		this.stopListening();
	}
}

mix( Game, ObservableMixin );

module.exports = Game;
