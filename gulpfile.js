'use strict';

const config = {
	ROOT_PATH: __dirname
};

const path = require( 'path' );
const gulp = require( 'gulp' );
const del = require( 'del' );
const lintTasks = require( 'battleships-engine/dev/tasks/lint.js' )( config );
const engineCompileTasks = require( 'battleships-engine/dev/tasks/compile.js' )( config );

// Compile engine to common js format.
gulp.task( 'clean:compile', () => del( './engine' ) );
gulp.task( 'compile:engine', [ 'clean:compile' ], () => engineCompileTasks.compile( '../battleships-engine/src', './engine', 'cjs' ) );

// JS code sniffer.
const jsFiles = [ path.join( config.ROOT_PATH, '**', '*.js' ) ];

gulp.task( 'lint', () => lintTasks.lint( jsFiles ) );
gulp.task( 'pre-commit', () => lintTasks.lintStaged( jsFiles ) );
