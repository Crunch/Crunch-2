def([
	'lib/lodash'
	, 'json!plugins/meta.json'
	, 'crunch/prefs'
	, 'crunch/session'
	, 'crunch/tabs'], function(_, pluginSettings, Prefs, Session, Tabs) {
	
	var Crunch = {
		UI: {
			Tabs: Tabs
		}
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
	
	Crunch.Prefs = Prefs;
	Crunch.Session = Session;
	
	console.log(Crunch);
	
	
	return Crunch;
});