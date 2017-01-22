'use strict';

const OpponentBattlefield = require( '../lib/battleships-engine/src/opponentbattlefield.js' ).default;
const Player = require( './player.js' );
const ObservableMixin = require( '../lib/battleships-utils/src/observablemixin.js' );
const mix = require( '../lib/battleships-utils/src/mix.js' );

const shortId = require( 'shortid' );

class Game {
	constructor( io, gameData ) {
		this.io = io;
		this.id = shortId.generate();
		this.gameData = gameData;

		this.set( 'isStarted', false );

		this.player = new Player( new OpponentBattlefield( gameData.size, gameData.shipsConfig ) );
		this.opponent = new Player( new OpponentBattlefield( gameData.size, gameData.shipsConfig ) );

		this.bind( 'isStarted' )
			.to( this.player, 'isReady', this.opponent, 'isReady', ( playerReady, opponentReady ) => {
				return playerReady && opponentReady;
			} );
	}

	create( socket ) {
		this.player.socket = socket;

		socket.join( this.id );
		socket.emit( 'createResponse', { response: this.id } );

		this._handlePlayerReady( this.player );

		this.once( 'change:isStarted', () => this.io.clients.in( this.id ).emit( 'started' ) );
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

				this._handlePlayerReady( this.opponent );
			}
		} );
	}

	_handlePlayerReady( player ) {
		const socket = player.socket;

		socket.on( 'ready', ( ships ) => {
			if ( player.battlefield.validateShips( ships ) ) {
				player.isReady = true;
				socket.emit( 'readyResponse' );
				socket.broadcast.to( this.id ).emit( 'ready' );
			} else {
				socket.emit( 'playerReadyResponse', { error: 'Invalid ships configuration.' } );
			}
		} );
	}

	destroy() {
	}
}

mix( Game, ObservableMixin );

module.exports = Game;
