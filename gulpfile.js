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

// Compile engine and utils to commonjs format.
gulp.task( 'clean:compile:engine', () => utils.del( './lib/engine' ) );
gulp.task( 'clean:compile:utils', () => utils.del( './lib/utils' ) );

gulp.task( 'compile:engine', [ 'clean:compile:engine' ], () => {
	compileTasks.compile( 'node_modules/battleships-engine/src', './lib/engine', { format: 'cjs' } )
} );
gulp.task( 'compile:utils', [ 'clean:compile:utils' ], () => {
	compileTasks.compile( 'node_modules/battleships-utils/src', './lib/utils', { format: 'cjs' } )
} );
gulp.task( 'compile', [ 'compile:engine', 'compile:utils' ], ( done ) => done() );

// JS code sniffer.
const jsFiles = [ path.join( config.ROOT_PATH, '**', '*.js' ) ];

gulp.task( 'lint', () => lintTasks.lint( jsFiles ) );
gulp.task( 'pre-commit', () => lintTasks.lintStaged( jsFiles ) );
