
define([
	'lib/lodash'
	, 'crunch/utils'
	, 'crunch/session'
	, 'crunch/storage'
	//, 'crunch/plugins'
	, 'crunch/files'
	, 'crunch/app'
	, 'crunch/ui/tabs'
	, 'crunch/ui/modals'
	, 'crunch/ui/projectView'
	, 'crunch/ui/fileView'
	, 'crunch/supports'
	, 'crunch/ui/crunchableView'
	, 'crunch/settings'
	, 'crunch/ui/messageView'
	, 'crunch/ui/globalView'
	], function(_
		, Utils
		, Session
		, Storage
		, Files
		, App
		, Tabs
		, Modals
		, ProjectView
		, FileView
		, Supports
		, Crunchable
		, Settings
		, Messages
		, GlobalSettings
		) {
	
	console.log('Building core...');
		
	var manifest = require('./package.json');
	global.APP_VERSION = manifest.version;

	var val = '', pro = false;
	if(parseInt(Storage.get('z')) === 1852) {
		pro = true;
		val = 'Pro'
		document.title = 'Crunch 2 Pro';
	}

	UA.e({
		ec: "App"
		, ea: "Open"
		, sc: "start"
		, an: "Crunch 2 " + val
		, av: manifest.version
		, ua: navigator.userAgent
	}).send();


	// Put the window back where it was
	var gui = require('nw.gui');
	var win = gui.Window.get();

	if(Storage.get('x')) {
		try {
			var x = Storage.get('x');
			var y = Storage.get('y');
			var width = Storage.get('width');
			var height = Storage.get('height');
			
			if(x > 0 && y > 0) {
				win.moveTo(x, y);
			}
			if(width > 400 && height > 300) {
				win.resizeTo(width, height);
			}
			
		}
		catch(e) {
			console.log("Couldn't restore window.");
		}

	}
	if(!Storage.get('run')) {
		CRUNCH_FIRST_RUN = true;
		Storage.put('run', true);
	}
	
	win.on('move', function(x, y) {
		Storage.put('x',x);
		Storage.put('y',y);
	});
	win.on('resize', function(width, height) {
		Storage.put('width',width);
		Storage.put('height',height);
	});

	UA.timing("Startup", "Building core START", (new Date()) - CRUNCH_START_TIME);

	var closing = false;
	var canThrowError = true;
	// Set up grabbing exceptions
	global.process.on('uncaughtException', function(err) {
		
		try {
		
			console.log(err.stack);
			if (!canThrowError) return;

			var gui = require('nw.gui');
			var win = gui.Window.get();
			
				// Prevent confirm dialog while dealing with another confirm dialog
			canThrowError = false;

			// Presumably, this might happen while app is loading
			if(!closing && Storage.get('crashed') === true) {
				// This might mean that Crunch settings are corrupted, reset;
				UA.exception({ 
					exd: err.stack
					, exf: true
					, av: global.APP_VERSION 
				}).send();

				if(confirm('Error: ' + err.toString() + ' -- Unfortunately, this means Crunch 2 needs to reset your ' +
					'settings and close. Sorry! If you are on Pro, you will need to ' +
					're-activate Crunch 2 Pro after your restart the app. (Help > Activate...)')) {

					setTimeout(function() {
						gui.App.quit();
					},60000);

					closing = true;
					Storage.keys().forEach(function(key) {
						Storage.del(key);
					});
					
					console.log('Closing and wiping Storage.');

					win.close();
					
				}
				else {
					setTimeout(function() {
						canThrowError = true;
					},1000);
				}
			}
			else {
				
				UA.exception({
					exd: err.stack
					, exf: true
					, av: global.APP_VERSION 
				}).send();
				

				if(confirm('Error: ' + err.toString() + ' -- Oops, something unexpected happened you should probably close Crunch 2 and restart. Continue at your own risk! ')) {
					setTimeout(function() {
						gui.App.quit();
					},60000);

					closing = true;
					Storage.put('crashed', true);
					win.close();
					console.log('Closing....');
					
				}
				else {
					setTimeout(function() {
						canThrowError = true;
					},1000);
				}
			}
		}
		catch(ex) {
			// If some other exception happened, get the hell out!
			console.log('Something wrong with error handling itself!');

			gui.App.quit();
		}
	});

	var Crunch = {
		UI: {
			Tabs: Tabs
			, Modals: Modals
			, ProjectView: ProjectView
			, GlobalSettings: GlobalSettings
			, FileView: FileView
			, Crunchable: Crunchable
			, Messages: Messages
		}
		, ua: UA
	};
	
//	Crunch.Plugins = Plugins;  // currently json.js has a node-webkit load problem
	Crunch.Settings = Settings;
	Crunch.Messages = Messages;
	Crunch.Session = Session;
	Crunch.Files = Files;
	Crunch.Supports = Supports;
	Crunch.Storage = Storage;

	// Spawn two processes, one for watching the directory,
	// and one for compiling and saving the result.
	
	var __dirname = require('./html/util.js').dirname;

	var process = require('child_process');	
	var watcher = process.fork(__dirname + '/' + global.__jsdirname + '/watcherProcess.js');
	var compiler = process.fork(__dirname + '/' + global.__jsdirname + '/compilerProcess.js'); 
	


	Crunch.Process = {
		Watcher: watcher
		, Compiler: compiler
	}
	
	Crunch.App = App(Crunch);
	UA.timing("Startup", "Building core FINISH", (new Date()) - CRUNCH_START_TIME);

	// Pre-AMD compatibility and good for testing
	window.Crunch = global.Crunch = Crunch;
	return Crunch;
});