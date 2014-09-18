def([
	'lib/lodash'
	, 'crunch/prefs'
	, 'crunch/session'
	, 'crunch/tabs'
	, 'crunch/plugins'], function(_, Prefs, Session, Tabs, Plugins) {
	
	var Crunch = {
		UI: {
			Tabs: Tabs
		}
	};
	
	Crunch.Plugins = Plugins;
	Crunch.Prefs = Prefs;
	Crunch.Session = Session;
	
	console.log(Crunch);
	
	
	return Crunch;
});