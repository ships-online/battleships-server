'use strict';

const fs = require( 'fs' );
const compiler = require( 'battleships-dev-tools/lib/tasks/compile.js' );
const relative = [ '@ckeditor/ckeditor5-utils', 'battleships-engine', 'battleships-core' ];

Promise.all( [
	compiler( {
		src: getPackageDirectory( 'battleships-engine' ) + '/battleships-engine/src',
		dest: 'lib/battleships-engine/src',
		relative
	} ),
	compiler( {
		src: getPackageDirectory( 'battleships-core' ) + '/battleships-core/tests',
		dest: 'lib/battleships-core/tests',
		relative
	} ),
	compiler( {
		src: getPackageDirectory( '@ckeditor/ckeditor5-utils' ) + '/@ckeditor/ckeditor5-utils/src',
		dest: 'lib/@ckeditor/ckeditor5-utils/src',
		relative
	} )
] );

function getPackageDirectory( packageName ) {
	if ( fs.existsSync( '../../packages/' + packageName ) ) {
		return '../../packages';
	}

	return 'node_modules';
}
