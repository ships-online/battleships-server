'use strict';

const fs = require( 'fs' );
const gulp = require( 'gulp' );
const gulpFilter = require( 'gulp-filter' );
const gulpEslint = require( 'gulp-eslint' );

/**
 * Paths definitions.
 */
const jsFiles = [ '**/*.js' ].concat( getGitIgnore() );

/**
 * Tasks definitions.
 */
const tasks = {
	/**
	 * Analyze quality and code style of JS files.
	 *
	 * @returns {Stream}
	 */
	lint() {
		return gulp.src( jsFiles )
			.pipe( gulpEslint() )
			.pipe( gulpEslint.format() )
			.pipe( gulpEslint.failAfterError() );
	},

	/**
	 * Lints staged files - pre commit hook.
	 *
	 * @returns {Stream}
	 */
	lintStaged() {
		const guppy = require( 'git-guppy' )( gulp );

		return guppy.stream( 'pre-commit', { base: './' } )
			.pipe( gulpFilter( jsFiles ) )
			.pipe( gulpEslint() )
			.pipe( gulpEslint.format() )
			.pipe( gulpEslint.failAfterError() );
	}
};

/**
 * Gets the list of ignores from `.gitignore`.
 *
 * @returns {Array<String>} The list of ignores.
 */
function getGitIgnore() {
	let gitIgnoredFiles = fs.readFileSync( '.gitignore', 'utf8' );

	return gitIgnoredFiles
		// Remove comment lines.
		.replace( /^#.*$/gm, '' )
		// Transform into array.
		.split( /\n+/ )
		// Remove empty entries.
		.filter( ( path ) => !!path )
		// Add `!` for ignore glob.
		.map( i => '!' + i );
}

// JS code sniffer.
gulp.task( 'lint', tasks.lint );
gulp.task( 'pre-commit', tasks.lintStaged );
