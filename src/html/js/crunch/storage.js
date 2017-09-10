define([], function() {

	var App = require('nw.gui').App;

	var flatfile = require('flat-file-db');
	var db = flatfile.sync(App.dataPath + '/prefs.db');

	// Migrate DB from localStorage to flat file storage
	if(!db.has('dbver') && localStorage.getItem('dbver')) {
		var val;
		for ( var i = 0, len = localStorage.length; i < len; ++i ) {
			val = localStorage.getItem(localStorage.key(i));
			try {
				val = JSON.parse(val);
			}
			catch(ex) { }
			db.put(localStorage.key(i), val);
		}
	}

	// Copy DB to localStorage as a backup
	global.process.on('exit', function() {
		console.log('Closing database...');
		var val;
		db.keys().forEach(function(key) {
			val = db.get(key);
			if(typeof val === 'object') {
				try {
					val = JSON.stringify(val);
				}
				catch(ex) {}
			}
			localStorage.setItem(key, val);
		});
		db.close();
	});


	return db;
});