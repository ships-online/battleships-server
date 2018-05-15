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
	remote( exec ) {
		exec( `git clone ${ repository } ${ dest }`, { silent: true } );
		exec( 'git pull', { cwd } );
		exec( 'npm4 install --production', { cwd, silent: true } );
		exec( 'rm -rf lib', { cwd } );
		exec( 'node8 ./dev/compile', { cwd } );
		exec( `devil www restart ${ domain }` );
	}
} )
	.then( () => {
		console.log( 'Deployed.' );
	} )
	.catch( err => {
		console.log( err );
		process.exit( 1 );
	} );
