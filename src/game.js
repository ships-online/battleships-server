'use strict';

const Player = require( './player.js' );
const OpponentBattlefield = require( '../lib/battleships-engine/src/opponentbattlefield.js' ).default;
const ShipsCollection = require( '../lib/battleships-engine/src/shipscollection.js' ).default;
const ObservableMixin = require( '../lib/@ckeditor/ckeditor5-utils/src/observablemixin.js' ).default;
const mix = require( '../lib/@ckeditor/ckeditor5-utils/src/mix.js' ).default;

const shortId = require( 'shortid' );

class Game {
	constructor( io, gameData ) {
		this.io = io;
		this.id = shortId.generate();
		this.gameData = gameData;

		this.set( 'isStarted', false );

		this.player = new Player( new OpponentBattlefield( gameData.size, gameData.shipsSchema ) );
		this.opponent = new Player( new OpponentBattlefield( gameData.size, gameData.shipsSchema ) );

		this.bind( 'isStarted' )
			.to( this.player, 'isReady', this.opponent, 'isReady', ( playerReady, opponentReady ) => {
				return playerReady && opponentReady;
			} );
	}

	create( socket ) {
		this.player.socket = socket;

		socket.join( this.id );
		socket.emit( 'createResponse', { response: this.id } );

		this._handlePlayerReady( this.player, this.opponent );

		this.once( 'change:isStarted', () => this.io.sockets.in( this.id ).emit( 'started' ) );
	}

	join( socket ) {
		const playersInRoom = this.io.sockets.adapter.rooms[ this.id ].length;

		socket.join( this.id );
		socket.broadcast.to( this.id ).emit( 'joined', { interestedPlayers: playersInRoom } );
		socket.emit( 'joinResponse', {
			response: {
				status: 'available',
				gameData: this.gameData,
				interestedPlayers: playersInRoom,
				opponentIsReady: this.player.isReady
			}
		} );

		socket.on( 'accept', () => {
			if ( this.isStarted ) {
				socket.emit( 'acceptResponse', { error: 'not-available' } );
			} else {
				socket.emit( 'acceptResponse' );
				this.opponent.socket = socket;
				socket.broadcast.to( this.id ).emit( 'accepted' );

				this._handlePlayerReady( this.opponent, this.player );
			}
		} );
	}

	_handlePlayerReady( player, opponent ) {
		const socket = player.socket;

		socket.on( 'ready', ( ships ) => {
			if ( player.battlefield.validateShips( ships ) ) {

				player.battlefield.shipsCollection.add( ShipsCollection.createShipsFromJSON( ships ) );

				player.isReady = true;
				socket.emit( 'readyResponse' );
				socket.broadcast.to( this.id ).emit( 'ready' );

				this._handlePlayerShoot( player, opponent );
			} else {
				socket.emit( 'playerReadyResponse', { error: 'Invalid ships configuration.' } );
			}
		} );
	}

	_handlePlayerShoot( player, opponent ) {
		const socket = player.socket;

		socket.on( 'shoot', ( position ) => {
			const result = opponent.battlefield.shoot( position );

			socket.emit( 'shootResponse', { response: result } );
			socket.broadcast.to( this.id ).emit( 'shoot', result );
		} );
	}

	destroy() {
	}
}

mix( Game, ObservableMixin );

module.exports = Game;
