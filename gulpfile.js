'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );
const del = require( 'del' );
const lintTasks = require( 'battleships-dev-tools/lib/tasks/lint.js' )( config );
const compileTasks = require( 'battleships-dev-tools/lib/tasks/compile.js' )( config );

// Compile engine and utils to commonjs format.
gulp.task( 'clean:compile:engine', () => del( './lib/engine' ) );
gulp.task( 'clean:compile:utils', () => del( './lib/utils' ) );

gulp.task( 'compile:engine', [ 'clean:compile:engine' ], () => compileTasks.compile( '../battleships-engine/src', './lib/engine', 'cjs' ) );
gulp.task( 'compile:utils', [ 'clean:compile:utils' ], () => compileTasks.compile( '../battleships-utils/src', './lib/utils', 'cjs' ) );
gulp.task( 'compile', [ 'compile:engine', 'compile:utils' ], ( done ) => done() );

// JS code sniffer.
const jsFiles = [ path.join( config.ROOT_PATH, '**', '*.js' ) ];

gulp.task( 'lint', () => lintTasks.lint( jsFiles ) );
gulp.task( 'pre-commit', () => lintTasks.lintStaged( jsFiles ) );
