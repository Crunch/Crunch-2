/*

	Ractive-transitions-fly
	=======================

	Version 0.1.1.

	This transition uses CSS transforms to 'fly' elements to their
	natural location on the page, fading in from transparent as they go.
	By default, they will fly in from left.

	==========================

	Troubleshooting: If you're using a module system in your app (AMD or
	something more nodey) then you may need to change the paths below,
	where it says `require( 'Ractive' )` or `define([ 'Ractive' ]...)`.

	==========================

	Usage: Include this file on your page below Ractive, e.g:

	    <script src='lib/Ractive.js'></script>
	    <script src='lib/Ractive-transitions-fly.js'></script>

	Or, if you're using a module loader, require this module:

	    // requiring the plugin will 'activate' it - no need to use
	    // the return value
	    require( 'Ractive-transitions-fly' );

	You can adjust the following parameters: `x`, `y`, `duration`,
	`delay` and `easing`.

*/

(function ( global, factory ) {

	'use strict';

	// Common JS (i.e. browserify) environment
	if ( typeof module !== 'undefined' && module.exports && typeof require === 'function' ) {
		factory( require( 'Ractive' ) );
	}

	// AMD?
	else if ( typeof define === 'function' && define.amd ) {
		define([ 'Ractive' ], factory );
	}

	// browser global
	else if ( global.Ractive ) {
		factory( global.Ractive );
	}

	else {
		throw new Error( 'Could not find Ractive! It must be loaded before the Ractive-transitions-fly plugin' );
	}

}( typeof window !== 'undefined' ? window : this, function ( Ractive ) {

	'use strict';

	var fly, addPx, defaults;

	defaults = {
		duration: 400,
		easing: 'easeOut',
		opacity: 0,
		x: -500,
		y: 0
	};

	addPx = function ( num ) {
		if ( num === 0 || typeof num === 'string' ) {
			return num;
		}

		return num + 'px';
	};

	fly = function ( t, params ) {
		var x, y, offscreen, target;

		params = t.processParams( params, defaults );

		x = addPx( params.x );
		y = addPx( params.y );

		offscreen = {
			transform: 'translate(' + x + ',' + y + ')',
			opacity: 0
		};

		if ( t.isIntro ) {
			// animate to the current style
			target = t.getStyle([ 'opacity', 'transform' ]);

			// set offscreen style
			t.setStyle( offscreen );
		} else {
			target = offscreen;
		}

		t.animateStyle( target, params, t.complete );
	};

	Ractive.transitions.fly = fly;

}));