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

gulp.task( 'relink', linkTask.relink );

// build engine and utils to commonjs format.
gulp.task( 'clean:build:engine', () => utils.del( './lib/battleships-engine' ) );
gulp.task( 'clean:build:utils', () => utils.del( './lib/battleships-utils' ) );

gulp.task( 'build:engine', [ 'clean:build:engine' ], () => {
	compileTasks.build(
		path.join( '.', 'node_modules', 'battleships-engine' ),
		path.join( '.', 'lib', 'battleships-engine' ),
		{
			relativeTo: path.join( '..', '..', path.sep ),
			format: 'cjs'
		}
	);
} );

gulp.task( 'build:utils', [ 'clean:build:utils' ], () => {
	compileTasks.build(
		path.join( '.', 'node_modules', 'battleships-utils' ),
		path.join( '.', 'lib', 'battleships-utils' ),
		{
			format: 'cjs'
		}
	);
} );
gulp.task( 'battleships:build', [ 'build:engine', 'build:utils' ], ( done ) => done() );

gulp.task( 'lint', lintTasks.lint );
gulp.task( 'pre-commit', lintTasks.lintStaged );
