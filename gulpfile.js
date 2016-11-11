'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );
const del = require( 'del' );
const lintTasks = require( 'battleships-dev-tools/lib/tasks/lint.js' )( config );
const compileTasks = require( 'battleships-dev-tools/lib/tasks/compile.js' )( config );

// Compile engine to common js format.
gulp.task( 'clean:compile:engine', () => del( './engine' ) );
gulp.task( 'compile:engine', [ 'clean:compile:engine' ], () => compileTasks.compile( '../battleships-engine/src', './engine', 'cjs' ) );

// JS code sniffer.
const jsFiles = [ path.join( config.ROOT_PATH, '**', '*.js' ) ];

gulp.task( 'lint', () => lintTasks.lint( jsFiles ) );
gulp.task( 'pre-commit', () => lintTasks.lintStaged( jsFiles ) );
