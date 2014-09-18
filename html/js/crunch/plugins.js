def(['json!plugins/meta.json', 'crunch/files'], function(pluginSettings, Files) {
	
	console.log('Loading plugins...');
	var Plugins = {
		settings: pluginSettings
	}

	Plugins.add = function(type, path) {
		function finishPluginSetup(interface) {
			console.log('Finishing setting up plugin...');

			if(type === "compilers") {
				Files.registerCompiler(interface.settings.input);
			}
			console.log('Running plugin init function...');
			interface.init();

		}
		console.log('Adding interface: ' + path);
		var pluginPath = path;
		if(type === "compilers") {
			pluginPath += "interface.js";
		}
		def([ pluginPath ], function(interface) {
			if(interface.settings.require) {
				// TODO - Not sure the best way to do this
				// Compiler plugins (and all the JS they need) should run as web workers.
				// None of it (other than interface) should be loaded in the main UI thread

				// def(interface.settings.require, function() {
				// 	finishPluginSetup(interface);
				// });
				finishPluginSetup(interface);
			}
			else {
				finishPluginSetup(interface);
			}
			
		});	
		
	};
	Plugins.init = function() {
		_.forEach(Plugins.settings, function(obj, plugin) {
			console.log('Loading ' + plugin + ' plugins...');
			_.forEach(obj, function(path, key) {
				console.log('Loading "' + key + '"');
				Plugins.add(plugin, path);
			});
		});
	};
	
	Plugins.init();

	return Plugins;
});