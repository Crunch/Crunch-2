// Loads the application
(function(global) { 
	var curlCfg = {
		baseUrl: 'js'
		, curl: 'lib/curl/curl.min'
		, paths: {
			//jquery: 'lib/jquery',  // jQuery, you're dead unless we become desperate
			css: '../css'
			, text: 'lib/curl/plugin/text'
			, json: 'lib/curl/plugin/json'
			, '_fetchText': 'lib/curl/plugin/_fetchText'
			, plugins: '../plugins'
			, Ractive: 'lib/ractive/ractive.min'
		}
		, preloads: ['Ractive', 'js!lib/ace/ace', 'link!css/styles.css']
		, defineName: 'def'
	};

	curl(curlCfg, ['crunch/core'
		, 'domReady!'
		, 'lib/ractive/Ractive-transitions-slide'
		, 'lib/ractive/Ractive-transitions-fly'
		]).then(function(Crunch) {
		init(Crunch);
	});


	function init(Crunch) {
		Crunch.UI.Tabs.create(Crunch);
		document.body.className = 'loaded';
	}
})(this);
