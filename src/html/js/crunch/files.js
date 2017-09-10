define(['lib/lodash'
	, 'crunch/utils'
	, 'crunch/supports'
	, 'crunch/settings'
	, 'crunch/ui/messageView'
	], function(_, Utils, Supports, Settings, Messages) {

	console.log('Starting files...');

	function makeId() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
	var untitledCount = 1;
	var Promise = require('bluebird');

	var FS = Promise.promisifyAll(require('fs'));
	
	var Path = require('path');
	var defaultPath = require('homedir')(); 
	var Watcher;
	var Compiler;
	var $scrollbars;

	function FileItem(obj) {
		this.type = 'file';
		this.name = obj.name;
		this.ext = obj.ext;
		this.path = obj.path;
		this.c = obj.c;
		this.f = obj.f;
		this.hasCrunch = obj.hasCrunch;
		this.matches = obj.matches || 0;
	}
	function FolderItem(obj) {
		this.type = 'folder';
		this.name = obj.name;
		this.path = obj.path;
		this.files = [];
		this.traversed = obj.traversed ? true : false;
		this.matches = obj.matches || 0;
	}

	// Create an abstracted file object for later filesystem plugins (and AIR migration)
	function File(filePath, readOnly) {

		if(!filePath) {
			this.name = 'untitled-' + untitledCount++;
			this.nativePath = 'tmp-' + makeId();  // generate fake path
			this.path = this.nativePath;
			this.key = makeId();
			this.modificationDate = new Date();
			this.exists = false;
			this.isDirectory = false;
			this.type = 'txt';
			this.promise = true;  // Not a real file yet.
			this.readOnly = readOnly;
		}
		else {
			filePath = Path.normalize(this.fullPath(filePath));
			this.path = filePath;
			this.exists = true;
			this.key = makeId();
			this.readOnly = readOnly;

			var stats;

			try {
				stats = FS.lstatSync(filePath);
			}
			catch(e) {
				this.exists = false;
				this.promise = true;
			}
			if(this.exists) {
				this.promise = false;
				this.modificationDate = stats.mtime;
				this.isDirectory = stats.isDirectory();
			}
			
			this.name = Path.basename(filePath);
			this.nativePath = this.shortPath(filePath); 
			this.type = Path.extname(filePath).replace('.','');
			
		}
	}

	File.prototype.resolvePath = function() {
		return new File();
	};
	File.prototype.shortPath = shortPath;

	File.prototype.updateModificationDate = function() {
		try {
			stats = FS.lstatSync(this.path);
			this.modificationDate = stats.mtime;
		}
		catch(e) {}
	}

	function shortPath(path) {
		if(!path) {
			path = this.nativePath;
			if(!path) return;
		}
		if(path.indexOf(defaultPath) === 0) {
			return path.replace(defaultPath, '~');
		}
		else
			return path;
	}
	File.prototype.fullPath = fullPath;
	
	function fullPath(path) {
		if(!path) {
			path = this.nativePath;
		}
		if(path.indexOf('~') === 0) {
			return path.replace('~', defaultPath);
		}
		else
			return path;
	}

	var monitored = {};
	var timer = null;
	var interval = 2000;
	var EditSession = ace.require("ace/edit_session").EditSession;
	var UndoManager = ace.require("ace/undomanager").UndoManager;
	var ModeList = ace.require("ace/ext/modelist");

	// From legacy filemonitor.js
	var F, Files;
	var F = Files = {
		collection: {}
		, File: File
		, fullPath: fullPath
		, shortPath: shortPath
		, currentWatchFiles: []  // Files not in current directory but open
		, currentDir: []
		, searchTree: []
		, currentDirectoryListing: function() {
			if(F.searchTree.length > 0 && F.searchTree[0].path === F.currentDir[0].path) {
				F.searchTree[0].open = true;
				F.searchTree[0].search = true;
				return F.searchTree[0];
			}
			if(F.currentDir.length === 0) {
				return F.currentDir;
			}
			else {
				F.currentDir[0].open = true;
				F.currentDir[0].search = false;
				F.currentDir[0].searchText = '';
				return F.currentDir[0];
			}
		}
		, updateCurrentDir: function(arr) {
			F.currentDir = arr;
			_.each(F.collection, function(fileObj, key) {
				F.checkCrunchable(fileObj);
			});
		}
		, addIfNeeded: function(path) {
			if(!F.collection[path]) {
				F.add(path);
			}
		}
		, getDirtyByKey: function(key) {
			var fileObj = null;
			_.each(F.collection, function(obj) {
				fileObj = _.find(obj, { file: { key: key } });
				if(fileObj) return false;
			});
			
			if(fileObj) {
				return fileObj.dirty;
			}
			else {
				return false;
			}
		}
		, checkInit: function() {
			if(!Watcher) {
				Watcher = global.Crunch.Process.Watcher;
				Compiler = global.Crunch.Process.Compiler;

				Watcher.on('message', Files.Events.fileUpdate);
				Compiler.on('message', Files.Events.crunchFinished);

				// Kill self
				checkInit = function() {};
			}
		}

		, getFilesToWatch: function() {

			var pathIsInside = require('path-is-inside');
			var filesOutsideDir = [];
			var rootPath = F.currentDir.length === 0 ? false : F.currentDir[0].path;

			_.each(Settings.getWatchedFiles(), function(val) {
				checkPath(val);
			});

			_.each(F.collection, function(fileObj, key) {
				if(!fileObj.file.isDirectory) { // && !fileObj.watched
					checkPath(fileObj.file.fullPath());
					//fileObj.watched = true;
				}
			});
			function checkPath(path) {
				//console.log(path);
				if(filesOutsideDir.indexOf(path) === -1) {
					filesOutsideDir.push(path);
				}
				// if(rootPath === false) {
				// 	filesOutsideDir.push(path);
				// }
				// else {
				// 	// !pathIsInside(path, rootPath) &&  -- may not be watching just because watching the root
				// 	if(!filesOutsideDir.indexOf(path) > -1) {
				// 		filesOutsideDir.push(path);
				// 	}
				// }
			}
			// Still seem to be returning more files than necessary ?
			return filesOutsideDir;
		}
		, getDirtyFiles: function() {
			return _.pluck(_.filter(F.collection, { dirty: true, file: { exists: true } }), 'file');
		}
		, searchCrunchable: function(searchText, callback, fileObj) {
			if(!fileObj.crunchable) return callback(false);
			var crunchable = fileObj.crunchable;
			var totalMatches = 0;

			if(searchText === '' || searchText.length < 2) {
				crunchable.search = false;
				return callback(false);
			}
			crunchable.search = true;
			crunchable.searchText = searchText;
			
			var seek = require('seek');
			var keywords = [ searchText ];

			// TODO - output will be an array of outputs soon
			var paths = [ crunchable.root.path ];
			crunchable.root.matches = 0;
			_.each(crunchable.engines, function(engine) {
				engine.output.matches = 0;
				paths.push(engine.output.path);
			});

			_.each(crunchable.sources, function(val, ext) {
				if(val) {
					addPaths(val);
				}
			});
			

			function addPaths(fileTree) {
				_.each(fileTree, function(val) {
					if(val) {
						val.matches = 0;
						paths.push(val.path);
						if(val.files) {
							addPaths(val.files);
						}
					}
				});	
			}
			function findMatch(path, matchLength, fileTree) {
				
				_.each(fileTree, function(val) {
					if(Array.isArray(val)) {
						findMatch(path, matchLength, val);
						return;
					}

					if(!val || !val.path) return;
					
					if(val.path === path) {
						val.matches = matchLength;
						totalMatches+=matchLength;
						return false;
					}
					if(path.indexOf(val.path) > -1) {
						val.matches += matchLength;
					}
					if(val.files) {
						findMatch(path, matchLength, val.files);
					}
				});
				
			}
			seek(paths, keywords, { 
				findAll: true
				, requireAll: true
				, filter: function(file) {
					return Supports.format(Path.extname(file), Settings.v());
				}
				, events: {
					found: function(file, matches) {
						if(crunchable.root.path === file) {
							crunchable.root.matches = matches.length;
							totalMatches+=matches.length;
						}
						_.each(crunchable.engines, function(engine) {
							if(engine.output.path === file) {
								engine.output.matches = matches.length;
								totalMatches+=matches.length;
							}
						});

						findMatch(file, matches.length, crunchable.sources);
						
					}
					, complete: function() {
						//console.log(crunchable);
						crunchable.totalMatches = totalMatches;
						callback(true);
					}
				} 
			});
		}
		, search: function(searchFiles, searchText, callback, fileObj) {
			if(!searchFiles)
				return F.searchCrunchable(searchText, callback, fileObj);

			if(searchText === '' || searchText.length < 3) {
				F.searchTree = [];
				return callback();
			}
			var totalMatches = 0;

			var seek = require('seek');
			// -- just one keyword for now for Ace compatibility
			var keywords = [ searchText ]; // searchText.split(' ');  

			var root = new FolderItem({
				name: F.currentDir[0].name
				, path: F.currentDir[0].path
			});
			root.keywords = keywords;
			root.searchText = searchText;

			var matchPaths = [ root ];
			var pathTest = {};

			// console.log('Starting search...', new Date());

			seek(Files.currentDir[0].path, keywords, { 
				findAll: true
				, requireAll: true
				, filter: function(file) {
					return Supports.format(Path.extname(file), Settings.v()) && file.indexOf('node_modules') === -1;
				}
				, events: {
					found: function(file, matches) {
						if(!pathTest[file]) {
							var fileObj = F.formatFileObject(file);
							fileObj.matches = matches || [];
							matchPaths[0].files.push(fileObj);
							pathTest[file] = true;
							totalMatches += matches && matches.length > 0 ? matches.length : 1;
						}
					}
					, scanned: function(file) {
						var pass = false;

						keywords.forEach(function(val) {
							if((Path.sep + Path.relative(F.currentDir[0].path, file)).toLowerCase().indexOf(val.toLowerCase()) > -1) {
								pass = true;
							}
						});
						
						return pass;
					}
					, complete: function() {
						function pathDepth(str) {
							var pDepth = 0;
							for (var i = str.length;i--;) {
								if (str[i] === Path.sep) 
									pDepth++;
							}
							return pDepth;
						}
						
						matchPaths[0].files.sort(function(a,b) {

							var lastA = a.path.lastIndexOf(Path.sep);
							var lastB = b.path.lastIndexOf(Path.sep);
							var c = Math.min(lastA, lastB);

							if(lastA !== lastB) {
								if(a.path.substr(0, c) === b.path.substr(0, c)) {
									return lastA - lastB;
								}
								return a.path.substr(0, c) < b.path.substr(0, c) ? -1 : 1;
							}
							return a.path < b.path ? -1 : 1;
							
						});
						matchPaths[0].totalMatches = totalMatches;
						

						// console.log('Completed search. Building tree...', new Date());
						F.searchTree = matchPaths;
						
						callback(true);
					}
				} 
			});
			
		}
		, formatFileObject: function(fullPath) {
			var ext = Path.extname(fullPath);
			var filename = Path.basename(fullPath).replace(ext,'');
			
			var compileFormat = Supports.compiler(ext, Settings.v()) ? true : false;
			return new FileItem({ 
				type: 'file', 
				name: filename,
				ext: ext, 
				path: fullPath, 
				c: compileFormat, 
				f: Supports.format(ext),
				hasCrunch: compileFormat ? Settings.isRoot(fullPath) : false
			});
			
		}
		, add: function(file, ignoreLink, dontWatch) {
			F.checkInit();
            if(_.isArray(file)) {
                _.each(file, function(val) {
                    Files.add(val, false, true);
                });
                //F.watch(F.getFilesToWatch());
                return;
            }
			if(!file.nativePath) {
				file = new File(file);
			}
			// Needs testing - should not add if it's not a real file but 
			// NOT a promise
			if(!file.exists && !file.promise) {
				return false;
			}

			if(!F.collection[file.nativePath]) {
				if(file.isDirectory) {
					F.collection[file.nativePath] = {
						file: file
					};
				}
				else {
					F.collection[file.nativePath] = {
						file: file
						, links: 1  // How many open references to this file object - doesn't work yet
						, session: function() { return F.getSession(this); }
					}
				}
				F.checkCrunchable(F.collection[file.nativePath]);
				if(!dontWatch && !F.collection[file.nativePath].crunchable) {
					F.watch(F.getFilesToWatch());
				}
			}
			else {
				if(!ignoreLink) {
					F.collection[file.nativePath].links++;
				}
			}
			return F.collection[file.nativePath];

		}
		, checkCrunchable: function(fileObj) {
			//console.log('Checking crunchable...', fileObj);
			
			var filePath = F.fullPath(fileObj.file.nativePath);
			if(!filePath) return;
			
			if(Supports.compiler(fileObj.file.type, Settings.v())) {

				var projectPath = Settings.getProjectPath(filePath, F.currentDir);
				var files;
				
				//console.log(projectPath);

				if(Settings._paths[projectPath] 
					&& Settings._paths[projectPath].files 
					&& Settings._paths[projectPath].files[filePath]) {

					files = Settings._paths[projectPath].files[filePath];
				}
				if(!files) {
					//console.log('Paths: ', Settings._paths);
				    _.each(Settings._paths, function(obj, key) {
				        if(obj.files && obj.files[filePath]) {
				            files = obj.files[filePath];
				        }
				    });
				}
				//console.log(files);

				if(files)
				  F.makeCrunchable(fileObj, files);
				
			}
		}
		, makeCrunchable: function(fileObj, settings) {
			var rootExt = Path.extname(fileObj.file.name);
			var projectPath = Path.join(fileObj.file.fullPath(),'..');

			//console.log(fileObj, settings);
			function byDepth(val) {

				var v = val.match(/[\\\/]/g);
				if(v)
					v = v.length;
				else
					v = '00';

				if(v < 10) {
					v = '0' + v;
				}
				return v + val.toLowerCase();
			}
			var root = F.formatFileObject(fileObj.file.fullPath());
			root.root = true;

			var crunch = {
				root: root
				, engines: []
			};

			var obj, matches;

			if(settings) {
				
				_.each(settings.engines, function(engine) {
					obj = JSON.parse(JSON.stringify(engine));
					obj.output = F.formatFileObject(Path.resolve(projectPath, engine.output));
					obj.output.output = true;
					obj.output.origPath = engine.output;
					crunch.engines.push(obj)
				});
				
				if(settings.sources && settings.sources.length > 0) {
					// Clone array
					//var sources = settings.sources.slice(0);
					var files = {}, crunchTree = {}, tempObj, fullPath;
					if(!fileObj.crunchList) {
						fileObj.crunchList = {};
					}
					var crunchList = fileObj.crunchList;

					settings.sources.sort(function(a, b) {
						return Path.extname(a) < Path.extname(b) ? -1 : 1;
					});

					_.each(settings.sources, function(val) {
						var ext = Path.extname(val).replace(/^./, '');
						if(!files[ext]) {
							files[ext] = [];
							crunchTree[ext] = [];
						}
						files[ext].push(val);
					});

					_.each(files, function(sources, list) {
						sources.sort(function(a, b) {
							return byDepth(a) < byDepth(b) ? -1 : 1;
						});
						var dirs = [];

						var path;

						_.each(sources, function(val, idx) {
							if(val.lastIndexOf('/') > -1) {
								path = val.substr(0, val.lastIndexOf('/'));
								if(dirs.indexOf(path) === -1) {
									dirs.push(path);
									fullPath = Path.resolve(projectPath, path);
									tempObj = new FolderItem({ name: path, path: fullPath });

									if(crunchList[fullPath]) {
										tempObj.matches = crunchList[fullPath].matches;
									}
									
									crunchList[fullPath] = tempObj;
									crunchTree[list].push(tempObj);
								}
							}
						});

						_.each(sources, function(val, idx) {
							var filename, ext;
							if(val.lastIndexOf('/') > -1) {
								path = val.substr(0, val.lastIndexOf('/'));
								_.each(crunchTree[list], function(tree) {
									if(tree.name == path) {
										fullPath = Path.resolve(projectPath, val);
										tempObj = F.formatFileObject(fullPath);
										if(crunchList[fullPath]) {
											matches = crunchList[fullPath].matches;
											tempObj = _.extend(tempObj, crunchList[fullPath], { matches: matches });
										}
										crunchList[fullPath] = tempObj;

										tree.files.push(tempObj);
										return false;
									}
								});

							}
							else {
								fullPath = Path.resolve(projectPath, val);
								tempObj = F.formatFileObject(fullPath);
								if(crunchList[fullPath]) {
									matches = crunchList[fullPath].matches;
									tempObj = _.extend(tempObj, crunchList[fullPath], { matches: matches });
								}
								crunchList[fullPath] = tempObj;
								crunchTree[list].push(tempObj);
							}
							
						});

						var c = crunchTree[list].length;
						while(c--) {
							if(crunchTree[list][c].type === 'folder') {
								var i = crunchTree[list].length;
								while(i--) {
									if(crunchTree[list][i].type === 'folder' 
										&& crunchTree[list][c].path.length !== crunchTree[list][i].path.length
										&& crunchTree[list][c].path.indexOf(crunchTree[list][i].path) > -1) {
											var nested = crunchTree[list].splice(c, 1)[0];
											nested.name = nested.name.replace(crunchTree[list][i].name + '/','');
											if(crunchTree[list][i].files) {
												crunchTree[list][i].files.unshift(nested);
											}
											break;
									}
								}
									
							}
						}
					});

					crunch.sources = crunchTree;

				}
			}
			//console.log(crunchTree);

			// Doesn't save to settings yet, but make sure we don't close open directories
			// or overwrite search settings
			if(fileObj.crunchable) {
				
				if(fileObj.crunchable.root) {
					
				}
				else {
					fileObj.crunchable.root = crunch.root;
				}

				// Make sure search matches in output aren't overwritten by Crunch updates
				var matchPaths = {};
				if(fileObj.crunchable.engines) {
					_.each(fileObj.crunchable.engines, function(engine) {
						matchPaths[engine.output.path] = engine.output.matches;
					});
					fileObj.crunchable.engines = crunch.engines;
					_.each(fileObj.crunchable.engines, function(engine) {
						if(matchPaths[engine.output.path]) {
							engine.output.matches = matchPaths[engine.output.path];
						}
					});
				}
				else {
					fileObj.crunchable.engines = crunch.engines;
				}
				
				fileObj.crunchable.sources = crunch.sources;
				
			}
			else {
				fileObj.crunchable = crunch;
			}
			F.watch(F.getFilesToWatch());
			//F.watch(Settings.getWatchedFiles());
			//console.log(crunchTree);

		}
		, addSettingsToFile: function(path, settings) {
			var fileObj = F.add(path, true);
			F.makeCrunchable(fileObj, settings);
		}
		// Almost the same as crunchAll but some differences
		, savePaths: function(paths, closing, callback) {
			var tmpObj, filesToSave = [], filePromises = [];

			_.each(paths, function(path, i) {
				tmpObj = F.collection[path];
				if(tmpObj && tmpObj.dirty) {
					filesToSave.push(tmpObj);
				}
			});

			_.each(filesToSave, function(val, i) {
				var data = val.session().getValue();
				val.updating = true;
				filePromises.push(FS.writeFileAsync(val.file.fullPath(), data, {encoding: 'utf8'}));
			});

			Promise.all(filePromises).then(function() {
				if(!closing) {
					_.each(filesToSave, function(fileObj) {
						fileObj.file.promise = false;
						fileObj.file.exists = true;
						fileObj.dirty = false;
						fileObj.file.updateModificationDate();
						fileObj.updating = false;
					});
				}
				callback();
			});

		}
		, crunchAll: function(fileObj) {
			var root = F.testCrunch(fileObj, true);
			var filesToSave = [];
			var filePromises = [];
			// get back root file object
			
			// Not a Crunch file
			if(!root) return;

			var tmpObj, fileObj = F.collection[F.shortPath(root)];

			if(fileObj) {
				if(fileObj.dirty) {
					filesToSave.push(fileObj);
				}
				if(fileObj.crunchList) {
					_.each(fileObj.crunchList, function(val, key) {
						tmpObj = F.collection[F.shortPath(key)];
						if(tmpObj && tmpObj.dirty) {
							filesToSave.push(tmpObj);
						}
					});
				}

				if(filesToSave.length !== 0) {
					_.each(filesToSave, function(val, i) {
						var data = val.session().getValue();
						val.updating = true;
						filePromises.push(FS.writeFileAsync(val.file.fullPath(), data, {encoding: 'utf8'}));
					});

					Promise.all(filePromises).then(function() {
						_.each(filesToSave, function(val, i) {
							val.dirty = false;
							val.file.updateModificationDate();
							val.updating = false;
						});
						F.testCrunch(fileObj.file.fullPath());
					});
				}
				else {
					F.testCrunch(fileObj.file.fullPath());
				}

			}

			
		}
		, crunch: function(compiler, rootPath, outputPath) {

			// TODO: support multiple compilers processing one file
			if(!Settings.v() && !Supports.allow(Path.extname(rootPath))) {
				return;
			}

			var rootPath = F.fullPath(rootPath);
			var options = Settings.getCompilerOptions(compiler, rootPath);
			var compilerPayload = { engine: compiler, filePath: rootPath, options: options, outputPath: outputPath };
			//console.log(compilerPayload);

			Messages.add({
		        type: 'loading'
		        , message: 'Crunching ' + Path.basename(rootPath) + '...'
			});
			Compiler.send(compilerPayload, null, function(err) {
				if(err) {
					Messages.add({
						type: 'error'
						, schema: 'node'
						, obj: err.toString()
					});
					Crunch.ua.exception({
						exd: 'Process: Compiler -- ' + err.toString()
						, av: global.APP_VERSION 
					}).send();
				}
			});

		}
		, testCrunch: function(path, skipCrunch) {
			var fileObj, returnVal;

			if(path.file) {
				fileObj = path;
				path = fileObj.file.path;
			}
			else {
				fileObj = path.file ? path : F.collection[F.shortPath(path)];
			}
			
			if(Settings.watchFiles[path]) {
				var watchFile = Settings.watchFiles[path];
				var settings;
				if(watchFile.roots) {
					_.each(watchFile.roots, function(val, idx) {
						//settings = Settings.getFileOptions(val);
						var shortPath = F.shortPath(val);
						settings = F.collection[shortPath] ? F.collection[shortPath].crunchable : false;
						if(settings) {
							if(skipCrunch) {
								returnVal = val;
								return false;
							}
							else {
								F.crunch(Supports.compiler(Path.extname(val), Settings.v())[0].engine, val, settings.engines[0].output.path);
								return false;
							}
						}
						
					});
					if(returnVal) return returnVal;
				}
				else {
					settings = fileObj ? fileObj.crunchable : false;
					if(settings) {
						if(skipCrunch) {
							return path;
						}
						else {
							F.crunch(Supports.compiler(Path.extname(path), Settings.v())[0].engine, path, settings.engines[0].output.path);
						}
					}
					
				}
			}
		}
		, getSession: function(fileObj, contents) {

			if(fileObj._session) {
				return fileObj._session;
			}
			else {
				// Lazily create detached Ace sessions for files
				// Could do this better with promises
				if(!contents && contents !== '') {
					contents = F.getContents(fileObj.file);
				}
				fileObj._session = F.createSession(contents, fileObj.file.nativePath);
				return fileObj._session;
			}
		}
		, createSession: function(contents, filePath) {
			var mode;
			if(filePath) {
				//console.log(filePath);
				if(Path.basename(filePath) === Settings.projectFile) {
					mode = 'ace/mode/json';
				}
				else if (Path.extname(filePath) === '.css') {
					mode = 'ace/mode/less';
				}
				else {
					mode = ModeList.getModeForPath(filePath).mode;
				}
				
				//session.setMode(mode);
			}
			else {
				mode = 'ace/mode/text';
			}
			
			var session = new EditSession(contents, mode);
			session.setUndoManager(new UndoManager());

			var config = Settings.App.config;

			try {
				session.setUseSoftTabs(config.editor.softTabs);
				session.setTabSize(config.editor.tabSize);
			}
			catch(ex) {}

			//session.setUseWorker(false); // Most of the Ace worker tips are stupid and wrong
			
			return session;
		}
		, updateSession: function(fileObj) {
			if(!fileObj.file) {
				fileObj = F.collection[F.shortPath(fileObj)];
			}
			if(!fileObj.file) return false;

			var contents = F.getContents(fileObj.file);
			if(contents) {			
				F.getSession(fileObj, '').doc.setValue(contents);
				fileObj.dirty = false;
			}
		}
		, create: function() {
			var file = new File();
			F.add(file);
			return file;
		}
		, changeDirty: function(fileObj) {
			if(!fileObj.dirty) {
				fileObj.dirty = true;
				return true;
			}
			return false;
		}
		, getContents: function(file) {
			// Eventually abstract node FS?
			// TODO: Make file calls async
			if(file.promise) {
				return "";
			}
			else {
				try {
					return FS.readFileSync(file.fullPath(), { encoding: 'utf8' });
				}
				catch(ex) {
					// File doesn't exist?
					return false;
				}
			}

		}
		, openNew: function(callback) {
			F.openDialog({ type: 'open' }, function() {
				var filePath = $(this).val();
				if(!filePath) {
					callback({ empty: true });
					return;
				}
				if(F.collection[filePath]) {
					callback({ exists: true }, F.collection[filePath].file.nativePath);
				}
				else {
					var fileObj = F.add(filePath);
					callback(fileObj);
				}
			});
		}

		, openProject: function(dirPath, callback) {

			if(!dirPath) {
				F.openDialog({ type: 'openDirectory' }, function() {

					dirPath = $(this).val();

					if(!dirPath) {
						callback({ empty: true });
						return;
					}
					finish();
				});
			}
			else {
				finish();
			}

			function finish() {
				var dirObj = F.add(dirPath);
				callback(dirObj);
			}
		}

		, save: function(fileObj, callback) {
			//console.log('Saving...', fileObj);
			if(fileObj.file.promise) {
				F.saveAs(fileObj, callback);
			}
			else {
				var data = fileObj.session().getValue();
				fileObj.updating = true;
				fileObj.saving = true;
				FS.writeFile(fileObj.file.fullPath(), data, { encoding: 'utf8' }, function() {
					fileObj.file.promise = false;
					fileObj.file.exists = true;
					fileObj.dirty = false;
					F.testCrunch(fileObj.file.fullPath());
					fileObj.file.updateModificationDate();
					fileObj.updating = false;
					callback(fileObj);
				});
			}
		}
		, saveAs: function(fileObj, callback) {
			var savePath = fileObj.file.promise ? null : Path.join(fileObj.file.nativePath, '..');
			if(!savePath) {
				if(F.currentDir[0] && F.currentDir[0].path) {
					savePath = F.currentDir[0].path;
				}
			}
			var path = require("path");
			var inMemorySession = fileObj.session().getValue();

			F.openDialog({ type: 'saveas', path: savePath, name: fileObj.file.name }, function() {
				// fileObj.dirty = false;
				var newPath = $(this).val();
				
				if(newPath && savePath !== newPath) {

					var newFile = new File(newPath);
					var newFileObj = F.add(newFile);

					newFileObj.file.promise = false;

					newFileObj._session = F.createSession(inMemorySession, newFile.nativePath);

					delete F.collection[savePath];
					F.save(newFileObj, callback);
				}
				else if (newPath && savePath === newPath) {
					fileObj.file.promise = false;
					F.save(fileObj, callback);
				}
				else {
					callback(false);
				}
				
			});
		}
		, openDialog: function(options, callback) {
			
			if(!options.path || options.path === '.') {
				if(F.currentDir.length !== 0) {
					options.path = F.currentDir[0].path;
				}
				else {
					options.path = defaultPath;
				}
			}
			var input = '<input type="file" ';

			var fullPath = F.fullPath(options.path);

			if(options.type) {
				if(options.type === 'saveas') {
					input+='nwsaveas="' + fullPath + Path.sep + options.name + '" ';
				}
				else if(options.type === 'openDirectory') {
					input+='nwdirectory ';
				}	
			}
			input+='nwworkingdir="' + fullPath + '" />';

			var $dialog = $(input);

			$dialog.on('change', function() {
				callback.call(this);
				$dialog = null;

			});
			$dialog.click();

		}
		, remove: function(fileName) {
			var files = fileName;
			if(!_.isArray(fileName)) {
				files = [ fileName ];
			}
			_.each(files, function(file) {
				var fileObj = F.collection[F.shortPath(fileName)];
				if(fileObj) {
					if(fileObj.links === 1) {
						fileObj._session = null;
						delete fileObj;
					}
					else {
						fileObj.links--;
					}
				}
			});
		}
		// TODO: figure out why so many directory updates get pushed on update

		, getDirectoryListing: function(dirName, dirPath, root, branchRoot, keypath, callback) {
			// Defer so that the UI is not blocked
			// In the future, file retrieval will be in another thread
			process.nextTick(function() {
				F._getDirectoryListing(dirName, dirPath, root, branchRoot, keypath, callback);
			});
		}
		, _getDirectoryListing: function(dirName, dirPath, root, branchRoot, keypathOrig, callback) {
			
			//console.log(dirName, dirPath, root, branchRoot, keypathOrig);

			var Watcher = global.Crunch.Process.Watcher;
			var Compiler = global.Crunch.Process.Compiler;
			var MAX_DEPTH = callback === true ? 1 : 2;  // just a directory refresh
			var iterator = [];
			var numDirs = 0;
			var treeRoot = [];

			var keypath = keypathOrig ? keypathOrig : 'root';

			var b;

			if(root) {
				if(F.currentDir.length > 0 && F.currentDir[0].path) {
					Settings.removePath(F.currentDir[0].path);
				}
				F.unwatch('dir');
			}
			read(dirName, dirPath, treeRoot, true, 0, branchRoot);

			function filterFunc(file) {
				var x = file.name;
			  return x !== '.DS_Store' 
			  	&& x !== 'Thumbs.db'
			  	&& x !== '.git';
			}
			
			F.watch(dirPath, 'dir', keypath);

			if(root) {
				Settings.addPath(dirPath);
			}
			function ifCallbackFire() {
				if(callback && callback !== true) {
					callback();
					// Only fire callback once
					callback = false;
				}
			}
						

			function read(filename, path, files, isDirectory, depth, skipCurrent) {
				if(depth > 0) {
					iterator[depth-1].count++;
				}

				var folderItem;

				if (isDirectory) {

					try {

						if(depth === 0) {
							folderItem = new FolderItem({ name: filename, path: path, traversed: true });
						}
						else {
							folderItem = new FolderItem({ name: filename, path: path, traversed: false }); 
						}
						files.push(folderItem);

						FS.readdir(path, function(err, dirList) {

							if(err) return;

							var dirCount = 0; //skipCurrent ? 1 : 0;

							var sub = dirList.map(function(v) { 
								return { 
									name: v,
									isDir: (function() { 
										// Some files aren't there? Or don't have stats?
										try {
											if(FS.statSync(path + Path.sep + v).isDirectory()) {
												dirCount++;
												return true;
											}
											else return false;
										}
										catch(err) {
											return 0;
										}
									})()
								}; 
							})
							.filter(filterFunc)
							// Sort folders on top
							.sort(function(a, b) {
								if(a.isDir) {
									if(b.isDir) {
										return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
									}
									else {
										return -1;
									}
								}
								else {
									if(b.isDir) {
										return 1;
									}
									else {
										return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
									}
								}
							});


							if(depth < MAX_DEPTH) {
								iterator[depth] = { count: 0, length: sub.length, dirs: dirCount };
								numDirs+=dirCount;

								sub.forEach(function (file, idx) {
									if(file.isDir !== 0) {
										read(file.name, path + Path.sep + file.name, folderItem.files, file.isDir, depth + 1);
									}
								});
								if(sub.length === 0) {
									ifCallbackFire();
									sendTreeUpdate();
								}
							}


							
						});
							
					}
					catch(err) {
						// Permission denied to read this folder?
						console.log(err);
					}

				}
				else {
					if(root && filename === Settings.projectFile) {
						Settings.addPath(Path.join(filename, '..'));
					}
					if(depth <= MAX_DEPTH) {
						files.push(F.formatFileObject(path));
					}
					
				}
				
				function sendTreeUpdate() {
					if(root) {
						F.updateCurrentDir(treeRoot);
					}
					//console.log(keypathOrig);

					F.Events.publish({ type: 'dirUpdate', root: root, files: treeRoot[0], keypath: keypathOrig, refresh: callback === true });
				}

				//console.log(depth, JSON.stringify(iterator));

				if(iterator[depth-1] && // (iterator[depth-1].dirs === 0 || // (depth > 1 || depth === 1 && MAX_DEPTH === 1) &&
					iterator[depth-1].count === iterator[depth-1].length) {
					
					ifCallbackFire();
					sendTreeUpdate();
					
				}

				//return files;
			}

			
		}
		, getFileArray: function(path, arr) {
			//console.log(path, arr.length);
			var result;

			if(!path) return;
			if(arr.length > 0) {
				var i = arr.length;
				while (i--) {
					console.log(arr[i].path);
				    if(path === arr[i].path) {
				    	return arr[i];
				    }
				    if(arr[i].files && arr[i].path.indexOf(path) > -1) {
				    	result = F.getFileArray(path, arr[i].files);
				    	if(result) return result;
				    }
				}
			}
		}
		, removeFromDirectory: function(path, arr) {
			if(!path) return;
			if(arr.length > 0) {
				var i = arr.length;
				// TODO: This makes for small code, but probably better to not alter array so much
				while (i--) {
				    if(path === arr[i].path) {
				    	arr.splice(i,1);
				    	break;
				    }
				    if(arr[i].files) {
				    	F.removeFromDirectory(path, arr[i].files);
				    }
				}
			}
		}
		, addToDirectory: function(path, arr) {
			if(!path) return;
			if(arr.length > 0) {
				var i = 0;
				var parent = Path.join(path, '..');
				var duplicate = false;
				// TODO: path can be undefined
				while (i<arr.length) {
				    if(parent === arr[i].path) {
				    	arr[i].files.forEach(function(val, idx) {
				    		if(val.path === path) {
				    			duplicate = true;
				    			return;
				    		}
				    	});
				    	if(duplicate) break;

				    	try {
							var stats = FS.lstatSync(path);
							var filename = Path.basename(path);
							if(stats.isDirectory()) {
								arr[i].files.push(new FolderItem({ name: filename, path: path }));
							}
							else {
								arr[i].files.push(F.formatFileObject(path));
							}
						}
						catch(e) {
							console.log(e);
						}
						arr[i].files.sort(function(a, b) {
							var a_prefix = a.type === 'folder' ? 'A' : 'B';
							var b_prefix = b.type === 'folder' ? 'A' : 'B';
							return (a_prefix + a.name.toLowerCase() > b_prefix + b.name.toLowerCase()) ? 1 : -1;
						});
				    	break;
				    }
				    if(arr[i].files) {
				    	// TODO: path can be undefined
				    	F.addToDirectory(path, arr[i].files);
				    }
				    i++;
				}
			}
		}
		, watch: function(path, context, keypath) {
			try {
				Watcher.send({ path: path, watcher: context, keypath: keypath }, null, function(err) {
					if(err) {
						Messages.add({
							type: 'error'
							, schema: 'node'
							, obj: err.toString()
						});
						Crunch.ua.exception({
							exd: 'Process: Compiler -- ' + err.toString()
							, av: global.APP_VERSION 
						}).send();
					}
				});
			}
			catch(ex) {
				Messages.add({
					type: 'error'
					, schema: 'node'
					, message: 'Can\'t watch files right now, oops. Details: ' + ex.toString()
					, obj: ex.toString()
				});
				Crunch.ua.exception({
					exd: 'Process: Compiler -- ' + ex.toString()
					, av: global.APP_VERSION 
				}).send();
			}
		}
		, unwatch: function(context) {
			try {
				Watcher.send({ unwatch: true, watcher: context }, null, function(err) {
					if(err) {
						Messages.add({
							type: 'error'
							, schema: 'node'
							, obj: err.toString()
						});
						Crunch.ua.exception({
							exd: 'process: Watcher -- ' + err.toString()
							, av: global.APP_VERSION 
						}).send();
					}
				});
			}
			catch(ex) {
				Messages.add({
					type: 'error'
					, schema: 'node'
					, message: 'Can\'t watch files right now, oops. Details: ' + ex.toString()
					, obj: ex.toString()
				});
				Crunch.ua.exception({
					exd: 'process: Watcher -- ' + ex.toString()
					, av: global.APP_VERSION 
				}).send();
			}
		}
		, Events: {
			listeners: []
			, subscribe: function(func) {
				F.Events.listeners.push(func);
			}
			, publish: function(event) {
				_.each(F.Events.listeners, function(func) {
					func(event);
				});
			}
			, crunchFinished: function(data) {
				
				if(data.err) {
					console.log(data);

					Crunch.ua.e({
						ec: "Crunch"
						, ea: data.engine
						, el: "Error"
						, ev: 1
						, exd: data.err.message
					}).send();

					if(data.err.filename) {
						var fileObj = F.collection[F.shortPath(data.err.filename)];
						if(fileObj) {
							if(data.err.hasOwnProperty('line')) {
								fileObj.session().setAnnotations([
									{
								        row: data.err.line-1,
								        column: data.err.column,
								        text: data.err.message,
								        type: "error"
								    }
								]);
							}
						}
						return Messages.add({
							type: 'error'
							, schema: 'crunch'
							, root: data.filePath
							, engine: data.engine
							, obj: data.err
							, collection: F.collection
						});
					}
					else {
						return Messages.add({
							type: 'error'
							, schema: 'node'
							, obj: data.err
						});
					}
				}
				Crunch.ua.e({
					ec: "Crunch"
					, ea: data.engine
					, el: "Success"
					, ev: 1
				}).send();

				var outputString = data.content;
				var rootParent = Path.join(data.filePath,'..');
				var absOutputPath = Path.resolve(rootParent, data.outputPath).replace(/[\\\/]/g, Path.sep);

				if(data.sourcemap && (data.options.sourcemap || data.options.sourceMap)) {
					if(Path.extname(data.outputPath) === '.css') {
						outputString += '\n/*# sourceMappingURL=' + Path.basename(data.outputPath).replace(/[\\\/]/g, "/") + '.map */';
					}
					else {
						outputString += '\n//# sourceMappingURL=' + Path.basename(data.outputPath).replace(/[\\\/]/g, "/") + '.map';
					}
				}
				var outputFileObj = F.collection[F.shortPath(Path.resolve(rootParent, data.outputPath))];
				if(outputFileObj) {
					outputFileObj.updating = true;
				}
				FS.writeFile(absOutputPath, outputString, { encoding: 'utf8' }, function(err) {
					if(err) {
						complete = false;
						Messages.add({
							type: 'error'
							, schema: 'node'
							, obj: err
						});
						Crunch.ua.exception({
							exd: 'fs: writeFile -- ' + err.toString()
							, av: global.APP_VERSION 
						}).send();
					}

					if(outputFileObj) {
						outputFileObj.updating = false;
					}
				});

				var sourcemap, sources, includeFiles = [];
				var pathIsInside = require('path-is-inside');

				if(data.files.length > 0) {
					_.each(data.files, function(val, idx) {
						fileObj = F.collection[F.shortPath(val)];
						if(fileObj) {
							fileObj.session().clearAnnotations();
						}
	
						includeFiles.push(Path.relative(rootParent, val).replace(/[\\\/]/g, "/"));
					});
					includeFiles = _.uniq(includeFiles).sort();
				};

				if(data.sourcemap) {
					if(data.options.sourcemap || data.options.sourceMap) {
						sourcemap = _.isString(data.sourcemap) ? JSON.parse(data.sourcemap) : JSON.parse(JSON.stringify(data.sourcemap));
						sources = sourcemap.sources && sourcemap.sources.length > 0 ? sourcemap.sources : null;
						
						var outputParent = Path.join(absOutputPath,'..');
						if(sources) {
							_.each(sources, function(val, idx) {
								sources[idx] = Path.relative(outputParent, sources[idx]).replace(/[\\\/]/g, "/");
							});
						}

						var outputMapObj = F.collection[F.shortPath(absOutputPath+'.map')];
						if(outputMapObj) {
							outputMapObj.updating = true;
						}
						FS.writeFile(absOutputPath+'.map', JSON.stringify(sourcemap), { encoding: 'utf8' }, function(err) {
							if(err) {
								Messages.add({
									type: 'error'
									, schema: 'node'
									, obj: err
								});
								Crunch.ua.exception({
									exd: 'fs: writeFile -- ' + err.toString()
									, av: global.APP_VERSION 
								}).send();
							}
							if(outputMapObj) {
								outputMapObj.updating = false;
							}
						});
					}
					// Put it back the way it was for saving to .crunch.json
					//sourcemap = _.isString(data.sourcemap) ? JSON.parse(data.sourcemap) : data.sourcemap;
					//sources = sourcemap.sources && sourcemap.sources.length > 0 ? sourcemap.sources : null;
				}

				var rootPath = data.filePath.replace(/[\\\/]/g, "/"); // Path.relative(projectPath, data.filePath);

				// Other source / output files are relative to the root file
				
				var outputPath = Path.relative(rootParent, absOutputPath).replace(/[\\\/]/g, "/");
				var projectPath = Settings.getProjectPath(data.filePath, F.currentDir);
				var fileObj = F.collection[F.shortPath(rootPath)];
				
				if(fileObj) {
					fileObj.session().clearAnnotations();
				}

				var settings = {
					engines: [{
						compiler: data.engine
						, output: outputPath
						, options: data.options
					}]
					//, lastCrunch: new Date().toString()
					, sources: includeFiles
				};

				Settings.updateProject(projectPath, rootPath, settings);

				F.addSettingsToFile(data.filePath, settings);
				fileObj = F.collection[F.shortPath(rootPath)];
				if(fileObj) {
					F.checkCrunchable(fileObj);
				}
				F.Events.publish({ 
					type: 'attachOutput'
					, root: F.add(rootPath, true)
					, output: F.add(absOutputPath, true)
				});

				Messages.add({
					type: 'success'
					, schema: 'crunch'
					, engine: data.engine
					, root: rootPath
					, output: absOutputPath
				});

			}
			, fileUpdate: function(data) {	
			

				function updateFileObj(fileObj, timer) {
					var counter = 0;
					//console.log(fileObj.updating, fileObj.dirty, timer);
					if(!fileObj) return;
					
					if(!fileObj.updating) {

						// File change caused by Crunch 2 file write, so exit
						if(fileObj.saving) {
							fileObj.saving = false;
							if(timer) clearInterval(timer);
							return;
						}

						F.testCrunch(fileObj);

						if(!fileObj.dirty) {
							F.updateSession(fileObj);
							fileObj.file.updateModificationDate();
						}
						else {
							F.Events.publish({ 
								type: 'updateDirty'
								, name: Path.basename(fileObj.file.path)
								, path: fileObj.file.path
							});
						}
						if(timer) clearInterval(timer);
					}
					else if(!timer) {
						fileObj.file.updateModificationDate();
						timer = setInterval(function() {
							counter++;
							if(counter > 20) {
								// if we're never completed updating, stop
								clearInterval(timer);
							}
							else {
								updateFileObj(fileObj, timer);
							}
						},200);
					}
				}

				if(data.path) {
					//console.log(data, F.Events.fileUpdate.lastTime);
					
					// We just want to refresh the file tree
					if(data.event !== 'update') {
						if(data.event === 'delete') 
							F.removeFromDirectory(data.path, F.currentDir);
						else if(data.event === 'create')
							F.addToDirectory(data.path, F.currentDir);
					}
					else {

						// If duplicate file events are sent within 200 ms, discard
						var ntime = +new Date();
						//console.log(ntime - F.Events.fileUpdate.lastTime);

						if(F.Events.fileUpdate.lastPath === data.path &&
							ntime - F.Events.fileUpdate.lastTime < 200) return;


						//console.log('File changed: ' + data.path);
						// This is a directory with a keypath to refresh
						if(data.keypath) {
							Files.getDirectoryListing(Path.basename(data.path), data.path, false, false, data.keypath, true);
						}
						else {
							var fileObj = F.collection[F.shortPath(data.path)];
							if(fileObj) {
								updateFileObj(fileObj);
							}
							// Maybe a directory that was just a parent?
							else {
								_.each(F.collection, function(obj, key) {
									if(obj && obj.file && data.path === Path.join(obj.file.path, '..')) {
										try {
											// Don't update file if it was just updated
											if(obj.file.path === F.Events.fileUpdate.lastPath
												&& ntime - F.Events.fileUpdate.lastTime < 200)
												return;
											var stats = FS.lstatSync(obj.file.path);
											//console.log(stats.mtime - obj.file.modificationDate, stats.mtime === obj.file.modificationDate);
											if(stats.mtime - obj.file.modificationDate !== 0) {
												updateFileObj(obj);
											}
										}
										catch(ex) {}
									}
								});
							}
						}
						F.Events.fileUpdate.lastPath = data.path;
						F.Events.fileUpdate.lastTime = ntime;
						
					}
					F.Events.publish(data);
				}
			}
		}
		
		
	};

	
		
	return Files;
});