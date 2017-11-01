'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );

const utils = require( 'battleships-dev-tools/lib/utils.js' );
const compile = require( 'battleships-dev-tools/lib/tasks/compile.js' )( config );

gulp.task( 'clean:engine', () => utils.del( path.join( '.', 'lib', 'battleships-engine' ) ) );
gulp.task( 'clean:utils', () => utils.del( path.join( '.', 'lib', '@ckeditor' ) ) );

gulp.task( 'compile:engine', [ 'clean:engine' ], () => {
	return compile(
		path.join( '.', 'node_modules', 'battleships-engine', 'src' ),
		path.join( '.', 'lib', 'battleships-engine', 'src' ),
		{
			relativeTo: '../../',
			format: 'cjs'
		}
	);
} );

gulp.task( 'compile:utils', [ 'clean:utils' ], () => {
	return compile(
		path.join( '.', 'node_modules', '@ckeditor', 'ckeditor5-utils', 'src' ),
		path.join( '.', 'lib', '@ckeditor', 'ckeditor5-utils', 'src' ),
		{
			format: 'cjs'
		}
	);
} );

gulp.task( 'compile', [ 'compile:engine', 'compile:utils' ], done => done() );
