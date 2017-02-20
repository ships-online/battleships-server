'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );

const utils = require( 'battleships-dev-tools/lib/utils.js' );
const linkTask = require( 'battleships-dev-tools/lib/tasks/relink.js' )( config );
const lintTasks = require( 'battleships-dev-tools/lib/tasks/lint.js' )( config );
const compileTasks = require( 'battleships-dev-tools/lib/tasks/compile.js' )( config );
const testTasks = require( 'battleships-dev-tools/lib/tasks/test.js' )( config );

const options = utils.parseArgs( process.argv.slice( 3 ) );

gulp.task( 'relink', linkTask.relink );

// Build engine and utils to commonjs format.
gulp.task( 'clean:build:engine', () => utils.del( path.join( '.', 'lib', 'battleships-engine' ) ) );
gulp.task( 'clean:build:utils', () => utils.del( path.join( '.', 'lib', '@ckeditor' ) ) );

gulp.task( 'build:engine', [ 'clean:build:engine' ], () => {
	return compileTasks.buildDependency( 'engine', {
		destination: path.join( '.', 'lib', 'battleships-engine' ),
		relativeTo: '../../',
		format: 'cjs'
	} );
} );

gulp.task( 'build:utils', [ 'clean:build:utils' ], () => {
	return compileTasks.build(
		path.join( '.', 'node_modules', '@ckeditor', 'ckeditor5-utils' ),
		path.join( '.', 'lib', '@ckeditor', 'ckeditor5-utils' ),
		{
			format: 'cjs'
		}
	);
} );
gulp.task( 'battleships:build', [ 'build:engine', 'build:utils' ], ( done ) => done() );

gulp.task( 'test', () => testTasks.testNode( options ) );

gulp.task( 'lint', lintTasks.lint );
gulp.task( 'pre-commit', lintTasks.lintStaged );
