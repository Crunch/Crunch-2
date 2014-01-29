def(['json!plugins/meta.json', 'lib/lodash'], function(pluginSettings, _) {
	var Crunch = {
		UI: {}
	};
	
	console.log('Loading plugins...');

	Crunch.Plugins = pluginSettings;
	
	_.forEach(Crunch.Plugins, function(obj, plugin) {
		console.log('Loading ' + plugin + ' plugins...');
		_.forEach(obj, function(path, key) {
			console.log('Loading "' + key + '"');
			//curl(path);  -- load the JS for the plugin
		});
	});
	
	console.log(Crunch);
	return Crunch;
});