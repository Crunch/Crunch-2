define([
	'lib/lodash'
	, 'crunch/storage'
	, 'crunch/messages'
	, 'crunch/utils'
	], function(_, Storage, Messages, Utils) {
	
	console.log('Starting settings...');

	var fs = require('fs');
	var FS = require('graceful-fs');
	FS.gracefulify(fs);

	var Settings = {

		// Project
		projectFile: '.crunch'
		, v: (function(l) {
			return function() {
				if(Settings._validated) {
					return Settings._validated.value;
				}
				else {
					var val = l.get('z');
					
					if(val && val.toString().indexOf('1') === 0) {
						Settings._validated = { value: true };
					}
					else {
						Settings._validated = { value: true }; // was false, but Crunch 2 now free!
					}
					return Settings._validated.value;
				}
				return false;
			} 
		})(Storage)
		, _compilers: {}
		, watchFiles: {}
		, _paths: {}
		, _sortedPaths: []
		, _listeners: []
		
		// Methods
		, initGlobal: function() {
			var settings = {
				compilers: {}
				, config: {}
			};

			// TODO: Should this abstracted into "plugins"?
			_.each(Settings._compilers, function(obj, key) {
				settings.compilers[key] = {};
				_.each(obj.options, function(values, option) {
					settings.compilers[key][option] = values.initialValue;
				});
			});

			_.each(Settings._config, function(obj, key) {
				if(obj.options) {
					settings.config[key] = {};
					_.each(obj.options, function(values, option) {
						settings.config[key][option] = values.initialValue;
					});
				}
				else {
					settings.config[key] = obj.initialValue;
				}
			});

			var App = Settings.getStorage('app');

			if(!App) {
				// Assign defaults
				Settings.App = settings;
			}
			else {
				Settings.App = _.merge(settings, App);
			}
			// Update object in either case, in case there are new defaults
			Settings.save('global');

		}
		, setStorage: function(key, value) {
			Storage.put(key, value);
		}
		, getStorage: function(key) {
			return Storage.get(key);
		}
		, save: function(type) {
			switch(type) {
				case 'global':
					Settings.setStorage('app', Settings.App);
					break;
				case 'project':
					break;
			}
			Settings._listeners.forEach(function(cb) {
				cb(Settings.App);
			});
		}
		, addListener: function(cb) {
			Settings._listeners.push(cb);
		}
		, removeListener: function(cb) {
			if(Settings._listeners.indexOf(cb)) {
				Settings._listeners.splice(Settings._listeners.indexOf(cb), 1);
			}
		}
		, updateGlobal: function(setting) {
			// e.g. { compilers: { less: { ieCompat: false }}}
			Settings.App = _.merge(Settings.App, setting);
			Settings.save('global');
		}
		, addCompiler: function(name, options) {
			Settings._compilers[name] = options;
		}
		, isRoot: function(filePath) {

			var root = false;
			_.each(Settings._paths, function(pathObj) {
				_.each(pathObj.files, function(fileObj, key) {
					//console.log(key, filePath);
					if(key === filePath) {
						root = true;
					}
				});
			});
			return root;
		}
		, checkFileWatched: function(filePath, pathObject, root) {
			var watchFile = Settings.watchFiles[filePath];
			if(!watchFile) {
				Settings.watchFiles[filePath] = { paths: [ pathObject ] };
				if(root) {
					Settings.watchFiles[filePath].roots = [ root ];
				}
			}
			else {
				if(watchFile.paths.indexOf(pathObject) === -1) {
					watchFile.paths.push(pathObject);
				}
				if(root) {
					if(watchFile.roots) {
						if(watchFile.roots.indexOf(root) === -1)
							Settings.watchFiles[filePath].roots.push(root);
					}
					else {
						Settings.watchFiles[filePath].roots = [ root ];
					}
				}
			}
		}
		, getWatchedFiles: function() {
			return _.keys(Settings.watchFiles);
		}
		, includedFiles: function(path, pathObject) {
			var Path = require('path');
			if(pathObject.files) {
				var files = [];
				var fullPath;
				_.each(pathObject.files, function(obj, key) {
					files.push(key);
					Settings.checkFileWatched(key, pathObject);
					if(obj.sources) {
						_.each(obj.sources, function(val, idx) {
							fullPath = Path.resolve(Path.join(key,'..'), val);
							Settings.checkFileWatched(fullPath, pathObject, key);
							files.push(fullPath);
						});
					}
				});
				return files;
			}
			return [];
		}
		, addPath: function(path, options) {
			if(Settings._paths[path] || path === '.')
				return;
			var Path = require('path');
			var fileItem;
			if(!options) {
				try {
					var content = FS.readFileSync(Path.join(path, Settings.projectFile), { encoding: 'utf8' });
					if(content) {
						options = JSON.parse(content);
						if(options.files) {
            				var newOptions = Utils.cloneObject(options);
            				_.each(options.files, function(obj, key) {

            					// Make all root file paths absolute in memory
            					var newKey = Path.resolve(path, key).replace(/[\\\/]/g, Path.sep);
            					newOptions.files[newKey] = Utils.cloneObject(options.files[key]);
            					delete newOptions.files[key];
            					fileItem = newOptions.files[newKey];
            					
            					// Update schema of .crunch from earlier beta version
            					if(!fileItem.engines) {
            						fileItem.engines = [];
            						if(fileItem.compilers) {
		            					_.each(fileItem.compilers, function(compiler) {
		            						var obj = {
		            							compiler: fileItem.engines.compiler 
		            						};
		            						if(fileItem.output) {
		            							obj.output = fileItem.output;
		            						}
		            						if(options.compilers && options.compiler[compiler]) {
		            							obj.options = options.compiler[compiler];
		            						}
		            						fileItem.push(obj);
		            					});
		            					delete fileItem.compilers;
		            				}
	            				}

            				});
            				options = newOptions;
            			}
					}
					else {
						options = {};
					}
				}
				catch(e) {
					options = {}; 
				}
				
			}

		  	// delete old schema of compiler options separate from files
		    if(options.compilers) {
		    	delete options.compilers;
		    }
		    if(!options.files) {
		    	options.files = {};
		    }
			Settings._paths[path] = options;

			Settings._sortedPaths.push({ path: path, settings: Settings._paths[path] });
			Settings._sortedPaths.sort(function(a, b) {
				if(a.path.length > b.path.length) {
					return -1;
				}
				if(a.path.length < b.path.length) {
					return 1;
				}
				return 0;
			});
			return Settings.includedFiles(path, Settings._paths[path]);
		}
		, removePath: function(path) {
			if(Settings._paths[path]) {
				var pathObject = Settings._paths[path];
				_.each(Settings.watchFiles, function(obj, key) {
					if(obj.paths.indexOf(pathObject) > -1) {
						obj.paths.splice(obj.paths.indexOf(pathObject), 1);
						if(obj.paths.length == 0)
							delete Settings.watchFiles[key];
					}
				});
				delete Settings._paths[path];
			}
		}
		// , addCrunchable: function(compiler, rootPath, outputPath, watchFiles) {
		// 	var crunch = getSavePathAndSettings(rootPath);
		// }
		// get current options for this file
		// global overriden by each .crunch file starting with closest (or same as) the file
		, getCompilerOptions: function(name, path) {
			var pathIsInside = require('path-is-inside');
			var options = Settings.App.compilers[name];

			_.each(Settings._sortedPaths, function(obj, idx) {
				if(pathIsInside(path, obj.path)) {
					_.each(obj.settings.files, function(file, key) {
						//console.log(key, path);
						if(key === path) {
							// TODO: Support more than one engine -- probably need to return all engines, not just options
							if(file.engines[0].compiler === name) {
								options = _.merge(options, file.engines[0].options);
							}
						}
					});
				}
				// if(pathIsInside(path, obj.path) && obj.compilers && obj.compilers[name]) {
				// 	options = _.merge(options, obj.compilers[name]);
				// }
			});
			return options;
		}
		// Not sure if this needs to be re-written, since files could be included in multiple places?
		, getFileOptions: function(path) {

			var projectPath = Settings.getProjectPath(path);
			console.log(path, projectPath);

			if(Settings._paths[projectPath] 
				&& Settings._paths[projectPath].files
				&& Settings._paths[projectPath].files[path]) {

				return Settings._paths[projectPath].files[path];
			}
			return false;
		}
		// , setProjectPath: function(path) {
		// 	Settings._paths
		// }
		, getProjectPath: function(path, projectDir) {

			// Should just be the current project path
			var length = Number.MAX_VALUE;
			var savePath = null;
			var pathIsInside = require('path-is-inside');
			var Path = require('path');
			
			//console.log(path, projectDir);

			if(projectDir && projectDir[0] && projectDir[0].path && pathIsInside(path, projectDir[0].path)) {
				return projectDir[0].path;
			}
			// Should it pick the nearest one if not in current dir?
			_.each(Settings._sortedPaths, function(obj, idx) {
				if(pathIsInside(path, obj.path)) {
					savePath = obj.path;
					return false;
				}
			});

			//if(savePath) return savePath;

			var i = 0;

			function walkUp(path) {
				i++;
				if(FS.existsSync(Path.join(path, Settings.projectFile))) {
					return path;
				}
				else {
					// Sanity check in case path never equals Settings.root for whatever reason
					if(i < 20 && path !== Settings.root) {
						return walkUp(Path.join(path, '..'));
					}
					else {
						return false;
					}
				}
			}
			
			var currentPath = Path.join(path, '..');
			var newPath = walkUp(currentPath);  // Look for a .crunch file up the filesystem tree
			if(!newPath) {
				newPath = currentPath;
			}
			Settings.addPath(newPath);
			if(savePath)
				return savePath;
			else
				return newPath;
			
		}
		// Should make this easier to update a files's settings
		, updateProject: function(projectPath, filePath, options) {
			var Path = require('path');
			//console.log(projectPath, options, Settings._paths[projectPath]);

			projectPath = projectPath.replace(/[\\\/]/g, Path.sep);
			filePath = filePath.replace(/[\\\/]/g, Path.sep);

			if(Settings._paths[projectPath]) {
		
				if(!Settings._paths[projectPath].files) {
					Settings._paths[projectPath].files = {};
				}
				if(Settings._paths[projectPath].files[filePath]) {
					Settings._paths[projectPath].files[filePath] = _.extend(Settings._paths[projectPath].files[filePath], options);
				}
				else {
					Settings._paths[projectPath].files[filePath] = options;
				}

				_.each(Settings._paths[projectPath].files[filePath], function(obj, key) {
					if(obj.sources && obj.sources.length) {
						Settings._paths[projectPath].files[filePath][key].sources = _.uniq(obj.sources).sort();
					}
				});
				//}
				//Settings._paths[path] = _.extend(Settings._paths[path], options);
				var savedOptions;
				
				// Make paths relative in .crunch file itself
				savedOptions = Utils.cloneObject(Settings._paths[projectPath]);
				_.each(savedOptions.files, function(obj, key) {
					var newKey = Path.relative(projectPath, key).replace(/[\\\/]/g, "/");
					savedOptions.files[newKey] = Utils.cloneObject(savedOptions.files[key]);
					delete savedOptions.files[key];
				});
				
				
				FS.writeFile(Path.join(projectPath, Settings.projectFile), JSON.stringify(savedOptions, null, '\t'), { encoding: 'utf8' }, function(err) {
					if(err) {
						Messages.add({ type: 'error', err: err });
						Crunch.ua.exception({
							exd: 'fs: writeFile - Settings.projectFile -- ' + err.toString()
							, av: global.APP_VERSION 
						}).send();
					}
				});

				return Settings.includedFiles(projectPath, Settings._paths[projectPath]);
			}
			else return null;
		}
		, init: function() {
			var path = require("path");
			var os = require("os");
			Settings.root = (os.platform == "win32") ? process.cwd().split(path.sep)[0] : "/";
			
			Settings._config = {
				updates: {
					initialValue: 1 
					, label: "Crunch Updates"
					, values: [{0: "Newest"}, {1: "Stable"}]
				}
				, theme: {
					initialValue: 0
					, values: [{0: "Vanilla Crunch"},{1: "Cocoa Crunch"}]   //,
					, label: "Theme"
				}
				, editor: {
					label: "Editor"
					, options: {
						softTabs: {
							initialValue: false
							, label: 'Soft Tabs'
							, type: 'bool'
						}
						, tabSize: {
							initialValue: 4
							, label: 'Tab Size'
							, type: 'number'
						}
						, wrapMode: {
							initialValue: false
							, label: 'Wrap Lines'
							, type: 'bool'
						}
					}
				}
				
						
						// Auto-display code according to tab settings
						// , peacefulResolution: {
						// 	type: "bool"
						// 	, label: "Peaceful Resolution"
						// 	, initialValue: true
						// 	, hidden: true
						// }
					
				
				
			};
			Settings.addCompiler("scss", {
				options: {
					style: {
						initialValue: 0
						, label: 'Output Style'
						, values: [{0: 'nested'}, {1: 'expanded'}, {2: 'compact'}, {3: 'compressed'}]
					}
					, comments: {
						initialValue: false
						, type: 'bool'
						, label: 'Preserve Comments'
					}
				}
			});
			Settings.addCompiler("coffee-script", {
				options: {
					bare: {
						initialValue: false
						, label: 'Bare'
						, type: 'bool'
						, description: 'Compile without function closure.'
					}
				}
			});
			Settings.addCompiler("LiveScript", {
				options: {
					bare: {
						initialValue: false
						, label: 'Bare'
						, type: 'bool'
						, description: 'Compile without function closure.'
					}
					, "const": {
						initialValue: false
						, label: 'Const'
						, type: 'bool'
						, description: 'Compile all variables as constants.'
					}
				}
			});
			Settings.addCompiler("stylus", {
				options: {
					sourcemap: {
						initialValue: true
						, type: 'bool'
						, label: 'Sourcemap'
					}
					, include: {
						initialValue: ""
						, label: "Include"
						, type: "text"
					}
					// , "import": {
					// 	initialValue: ""
					// 	, label: "Import"
					// 	, type: "text"
					// }
				}
			});
			Settings.addCompiler("marked", {
				options: {
					gfm: {
						initialValue: true
						, label: 'GitHub Markdown (GFM)'
						, type: 'bool'
						, description: 'Enable GitHub Flavored Markdown.'
					}
					, tables: {
						initialValue: true
						, label: 'Tables (GFM)'
						, type: 'bool'
						, description: 'Enable GFM tables. This option requires the gfm option to be true.'
					}
					, breaks: {
						initalValue: true
						, label: 'Breaks (GFM)'
						, type: 'bool'
						, description: 'Enable GFM line breaks. This option requires the gfm option to be true.'
					}
					, pedantic: {
						initalValue: false
						, label: 'Pedantic Markdown'
						, type: 'bool'
						, description: "Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior."
					}
					, sanitize: {
						initialValue: false
						, label: 'Sanitize'
						, type: 'bool'
						, description: 'Sanitize the output. Ignore any HTML that has been inputted.'
					}
					, smartLists: {
						initalValue: true
						, label: 'Smart Lists'
						, type: 'bool'
						, description: 'Use smarter list behavior than the original markdown.'
					}
					, smartypants: {
						initalValue: false
						, label: 'Smart Typography'
						, type: 'bool'
						, description: 'Use "smart" typographic punctuation for things like quotes and dashes.'
					}
				}
			});



			Settings.addCompiler("less", {
				options: {
					compress: {
						initialValue: false
						, type: 'bool'
						, label: 'Compress'
						// , values: ["1", "2", "3"] -- if not boolean
					}
					, ieCompat: {
						initialValue: false
						, type: 'bool'
						, label: 'IE8- Compatibility'
					}
					, strictMath: {
						initialValue: false
						, type: 'bool'
						, label: 'Strict Math'
					}
					, strictUnits: {
						initialValue: false
						, type: 'bool'
						, label: 'Strict Units'
					}
					, javascriptEnabled: {
						initialValue: false
						, hidden: false
						, type: 'bool'
						, label: 'Inline JavaScript'
					}
					// TODO Less.js requires "false" or {} / true
					, sourceMap: {
						initialValue: true
						, type: 'bool'
						, label: 'Sourcemap'
					}
					// , outputSourceFiles: {
					// 	initialValue: true
					// 	, type: 'bool'
					// 	, label: 'Include .less in Source Map'
					// }
				}
			});
			Settings.initGlobal();
		}

	};
	
	Settings.init();
	
	// var prefsPath = air.File.applicationStorageDirectory;
	// var prefsFile = prefsPath.resolvePath("prefs.json");

	// if(prefsFile.exists) {
	// 	var stream = new air.FileStream(); 
	// 	stream.open(prefsFile, air.FileMode.READ); 
	// 	var storedPrefs = stream.readUTFBytes(stream.bytesAvailable); 
	// 	stream.close();		
	// 	$.extend(true, App, JSON.parse(storedPrefs));
	//  	copyPaths();
	// }

	// function updateAppState() {
	// 	var str = JSON.stringify(App);
	// 	var stream = new air.FileStream(); 
	// 	stream.open(prefsFile, air.FileMode.WRITE); 
	// 	stream.writeUTFBytes(str); 
	// 	stream.close(); 
	// 	//copyPaths();
	// }
	
	
	return Settings;
});