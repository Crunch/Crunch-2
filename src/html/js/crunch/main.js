// Loads the application

// Startup analytics first, to capture timings
(function(localStorage, require) {
	var ua = require('universal-analytics');
	var platform = require('./html/' + global.__jsdirname + '/utils/platform');

	// Generate a random UUID to track sessions
	var userId = localStorage.getItem('userId');
	if(!userId) {
		var uuid = require('node-uuid');
		userId = uuid.v4();
		localStorage.setItem('userId', userId);
	}

	UA = ua('UA-9340911-7', userId);
	
	UA.e({
		ec: "App"
		, ea: "Init"
		, cid: userId
		, sc: "start"
	}).send();

	UA.timing("Startup", "HTML loading", (new Date()) - global.CRUNCH_START_TIME);

})(localStorage, require);


(function(global) { 
	if(require('fs').existsSync('./html/dist')) {
		global.__jsdirname = 'dist';
	}
	else {
		global.__jsdirname = 'js';
	}
	var curlCfg = {
		baseUrl: global.__jsdirname
		, curl: 'lib/curl'
		, paths: {
			jquery: 'lib/jquery'
			, css: '../css'
			, text: 'lib/curl/plugin/text'  // not sure why paths don't work
			, json: 'lib/curl/plugin/json'
			, '_fetchText': 'lib/curl/plugin/_fetchText'
			, link: 'lib/curl/plugin/link'
			, plugins: '../plugins'
			, Ractive: 'lib/ractive/ractive'
			, ace: 'lib/ace'
			, lodash: 'lib/lodash'
			, less: 'legacy/less' // Will be abstracted into compiler plugins
		}
		, preloads: [
			'jquery'
			, 'Ractive'
			, 'lodash'
			, 'js!ace/ace'
			, 'link!css/styles.css'
			, 'link!lib/tooltipster/tooltipster.css'
			, 'link!lib/sweetalert.css'
		]
	};

	UA.timing("Startup", "JS Preloads loaded", (new Date()) - CRUNCH_START_TIME);


	curl(curlCfg, ['crunch/core'
		, 'lib/ractive/ractive'
		, 'domReady!'
		, 'js!lib/tooltipster/jquery.tooltipster.min.js'
		
		// Begin 1.x Legacy includes
		, 'js!ace/ext-modelist'
		, 'js!ace/ext-language_tools'
		, 'js!legacy/jwerty'
		// end 1.x legacy

		, 'lib/ractive/Ractive-transitions-slide'
		, 'lib/ractive/Ractive-transitions-fly'
		]).then(function(Crunch, Ractive) {
		Ractive.DEBUG = /unminified/.test(function(){/*unminified*/});
		init(Crunch);
	});


	function init(Crunch) {	
		var gui = require('nw.gui');
		var win = gui.Window.get();
		win.show();
		UA.timing("Startup", "App.js init() START", (new Date()) - CRUNCH_START_TIME);
		Crunch.App.init();
		UA.timing("Startup", "App.js init() FINISH", (new Date()) - CRUNCH_START_TIME);
		Crunch.Storage.del('crashed');
		localStorage.setItem('crashed', '');
	}
})(this);
