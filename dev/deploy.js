'use strict';

/* eslint-env node */

const deploy = require( 'deploy-tools/src/deploy' );

const repository = 'https://github.com/ships-online/battleships-server.git';
const domain = 'shipsserver.oskarwrobel.pl';
const dest = `domains/${ domain }/public_nodejs`;
const cwd = `/usr/home/oskarwrobel/${ dest }`;

deploy( {
	username: process.env.BATTLESHIPS_DEPLOY_USERNAME,
	host: process.env.BATTLESHIPS_DEPLOY_HOST,
	privateKey: process.env.BATTLESHIPS_DEPLOY_KEY,
	execute( local, remote ) {
		remote( `git clone ${ repository } ${ dest }`, { silent: true } );
		remote( 'git pull', { cwd } );
		remote( 'npm4 install --production', { cwd, silent: true } );
		remote( 'rm -rf lib', { cwd } );
		remote( 'node8 ./dev/compile', { cwd } );
		remote( `devil www restart ${ domain }` );
	}
} )
	.then( () => {
		console.log( 'Deployed.' );
	} )
	.catch( err => {
		console.log( err );
		process.exit( 1 );
	} );
