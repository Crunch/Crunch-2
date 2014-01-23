// Loads the application
(function(global) { 
	var curlCfg = {
		baseUrl: 'js',
		curl: 'lib/curl/curl.min',
		paths: {
			//jquery: 'lib/jquery',  // jQuery, you're dead unless we become desperate
			css: '../css',
			text: 'lib/curl/plugin/text',
			'_fetchText': 'lib/curl/plugin/_fetchText'
		},
		defineName: 'def'
	};

	curl(curlCfg, ['lib/ractive.min', 'js!lib/ace/ace', 'link!css/styles.css']).then(function ($) {
		
		// init the app
		curl(['crunch/core', 'crunch/tabs', 'domReady!']).then(function() {
			init();	
		});
		
	});


	function init() {
		document.body.className = 'loaded';

		// $('body').addClass('loaded');
		// $('.crunch').click(function() {
		// 	$(this).closest('.tab-out').toggleClass('flipped');
		// });
		// $('.tab-out').click(function() {
		// 	$(this).addClass('active').siblings().removeClass('active flipped');
		// });
	}
})(this);
