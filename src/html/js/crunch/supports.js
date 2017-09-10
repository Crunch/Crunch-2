define(['lib/lodash'], function(_) {
	console.log('Starting supports...');
	
	var allowList = ["css", "less", "js"];
	var ModeList = ace.require("ace/ext/modelist");

	function getCompilers() {
		var accord = require('accord');
		var adapter;
		var extMap = {};
		_.each(accord.all(), function(obj, engine) {
			try {
				adapter = accord.load(engine);
				if(adapter) {
					_.each(adapter.extensions, function(val) {
						var prop = {
							engine: engine
							, output:  adapter.output
						};
						if(!extMap[val]) {
							extMap[val] = [ prop ];
						}
						else {
							extMap[val].push(prop);
						}
					});
				}
			}
			catch(e) {}
		});
		return extMap;
	}
	var Supports = {

		//formats: formatsList
		format: function(str, pro) {
			if(pro) {
				var mode = ModeList.getModeForPath(str);
				return !(mode.name === 'text' && str !== '.txt');
			}
			else {
				return Supports.allow(str);
			}
		}
		, compiler: function(str, pro) {
			if(!Supports.compilerList) {
				Supports.compilerList = {
					'less': [{ engine: 'less', output: 'css' }]
					, 'scss': [{ engine: 'scss', output: 'css'}]
					, 'styl': [{ engine: 'stylus', output: 'css'}]
					, 'ls': [{ engine: 'LiveScript', output: 'js'}]
					, 'coffee': [{ engine: 'coffee-script', output: 'js'}]
					, 'md': [{ engine: 'marked', output: 'html'}]
					, 'jade': [{ engine: 'pug', output: 'html'}]
					, 'pug': [{ engine: 'pug', output: 'html'}]
					, 'jsx': [{ engine: 'react-tools', output: 'js'}]
				};   // Set manually for now
			}
			if(pro) {
				return Supports.compilerList[str.replace(/^\./, '')];
			}
			else {
				return str.indexOf('less') > -1 ? [{ engine: 'less', output: 'css' }] : undefined;
			}
		}
		, allow: function(ext) {
			return allowList.indexOf(ext.replace(/^\./, '')) > -1 ? true : false;
		}
		, register: function() {

		}
	};

	return Supports; 
});