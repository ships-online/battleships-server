'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );

const utils = require( 'battleships-dev-tools/lib/utils.js' );
const lintTasks = require( 'battleships-dev-tools/lib/tasks/lint.js' )( config );
const compileTasks = require( 'battleships-dev-tools/lib/tasks/compile.js' )( config );

// Build engine and utils to commonjs format.
gulp.task( 'clean:engine', () => utils.del( path.join( '.', 'lib', 'battleships-engine' ) ) );
gulp.task( 'clean:utils', () => utils.del( path.join( '.', 'lib', '@ckeditor' ) ) );

gulp.task( 'compile:engine', [ 'clean:engine' ], () => {
	return compileTasks.compile(
		path.join( '.', 'node_modules', 'battleships-engine', 'src' ),
		path.join( '.', 'lib', 'battleships-engine', 'src' ),
		{
			relativeTo: '../../',
			format: 'cjs'
		}
	);
} );

gulp.task( 'compile:utils', [ 'clean:utils' ], () => {
	return compileTasks.compile(
		path.join( '.', 'node_modules', '@ckeditor', 'ckeditor5-utils', 'src' ),
		path.join( '.', 'lib', '@ckeditor', 'ckeditor5-utils', 'src' ),
		{
			format: 'cjs'
		}
	);
} );
gulp.task( 'compile', [ 'compile:engine', 'compile:utils' ], ( done ) => done() );

gulp.task( 'lint', lintTasks.lint );
gulp.task( 'pre-commit', lintTasks.lintStaged );
