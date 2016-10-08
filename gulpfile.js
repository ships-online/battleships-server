'use strict';

const config = {
	ROOT_PATH: '.'
};

const gulp = require( 'gulp' );
const lintTasks = require( 'battle-ships-core/dev/tasks/lint.js' )( config );
const compileTasks = require( 'battle-ships-core/dev/tasks/compile.js' )( config );

// Compile core to common js format.
gulp.task( 'compile', () => compileTasks.compile( './core', 'cjs' ) );

// JS code sniffer.
gulp.task( 'lint', () => lintTasks.lint( '**/*.js' ) );
gulp.task( 'pre-commit', () => lintTasks.lintStaged( '**/*.js' ) );
