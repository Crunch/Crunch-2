define([
	  'lib/lodash'
	, 'crunch/storage'
	, 'crunch/files'
	, 'crunch/supports'
	, 'crunch/settings'
	, 'crunch/utils'
], function(_, Storage, Files, Supports, Settings, Utils) {

	console.log('Starting session...');
	// Load previous session

	Utils.Array.checkMove();

	var Session = {
		STORAGE_SCHEMA_VERSION: '0.1.36'
		, checkDbVer: function() {
			var dbVer = Storage.get('dbver');

			if(dbVer != Session.STORAGE_SCHEMA_VERSION) {
				Storage.del('sessionState');
				Storage.put('dbver', Session.STORAGE_SCHEMA_VERSION);
			}
		}
		, set: function(key, value) {
			if(typeof key !== 'undefined') {
				this.state[key] = value;
			}
			Storage.put('sessionState', Session.state);
		}
	};

	Session.checkDbVer();
	
	// We set up inheritance so that some session properties come from disk (local storage),
	// and some properties are dynamic and are not saved.
	function DiskSession(obj) {
		this.recentFiles = obj.recentFiles;
		this.projects = obj.projects;
		// this.openFiles = {};
		// this.openFiles.activeTabIndex = obj.openFiles.activeTabIndex;
		// this.openFiles.files = [];

	}
	function MemorySession(obj) {
		DiskSession.call(this, obj);
		var _this = this;

		_.each(_this.projects, function(dirObj, idx) {
			_.each(dirObj.files, function(fileObj, idx) {
				addFile(dirObj, fileObj, true);
				//updateActiveIndex();
			});
		});

	}
	

	// MemorySession.prototype = Object.create(DiskSession.prototype);
	// MemorySession.prototype.constructor = MemorySession;

	// This is the cool shit right here.
	function hasCompiler (fileObj) {
		if(!this.root) {
			return undefined;
		}
		return Supports.compiler(this.root.type, Settings.v()) ? true : false; 
	};
	function crunchable (fileObj) { 
		if(!this.root) {
			return undefined;
		}
		return Files.collection[this.root.path] && Files.collection[this.root.path].crunchable ? true : false; 
	};

	//MemorySession.prototype.project = function() { return 0; };
	// MemorySession.prototype.
	function addFile(dirObj, fileObj, modify) {
		//console.log(dirObj, fileObj, modify);
		// Experimented first with adding tabs from the inner-most position
		// Outer may be more intutitive
		var push = true;
		var tabObject;

		if(modify) {
			tabObject = fileObj;
		}
		else {
			tabObject = {};
			tabObject.activeIndex = 0;
			tabObject.collection = [ fileObj ];

			var index;
			if(push) {
				dirObj.files.push(tabObject);
				index = dirObj.files.length - 1;
			}
			else {
				dirObj.files.unshift(tabObject);
				index = 0;
			}

			//tabObject = dirObj.files[index];
		}
		
		//var _this = this;

		// if(!fileObj.collection) {
		// 	newObj.activeIndex = 0;
		// 	newObj.collection = [ fileObj ];
		// }
		// else {
		// 	newObj.activeIndex = fileObj.activeIndex;
		// 	newObj.collection = fileObj.collection;
		// }
		//newObj.flipped = fileObj.flipped;

		addProperty(tabObject, 'root', function() {
			return tabObject.collection[0];
		});

		_.each(tabObject.collection, function(val, idx) {
			Object.defineProperty(val, 'dirty', {
				get: function() {
					if(Files.collection[val.path]) {
						return Files.collection[val.path].dirty;
					}
					else
						return false;
					
				}
			});	
		});
		addProperty(tabObject, 'dirty', function() {
			var isDirty = false;
			_.each(tabObject.collection, function(val, idx) {
				isDirty = isDirty || val.dirty;
			});
			return isDirty;
		});


		addProperty(tabObject, 'hasCompiler', _.bind(hasCompiler, tabObject));
		addProperty(tabObject, 'crunchable', _.bind(crunchable, tabObject));
		addProperty(tabObject, 'project', function() {
			return dirObj;
		});

		function addProperty(obj, name, func) {
			Object.defineProperty(obj, name, {
			    get: func
			});	
		}

		return index;
		
	}

	var diskObject = Storage.get("sessionState");

	if(!diskObject) {
		Session.state = new MemorySession({
			projects: [{
				root: true
				, path: ''
				, open: true
				, activeTabIndex: -1
				, files: []
			}]
			, recentFiles: []
			// , openFiles: {
			// 	activeTabIndex: -1
			// 	, files: []
			// }
		});
		Session.set();
	}
	else {
		Session.state = new MemorySession(diskObject);
	}
	//console.log(diskObject, Session.state);

	function updateActiveIndex(idx, obj, indexKey, collKey) {
		if(!indexKey) {
			indexKey = 'activeTabIndex';
		}
		if(!collKey) {
			collKey = 'files';
		}
		if(!obj && obj !== 0) {
			obj = Session.projects.active();
		}
		if(!idx && idx !== 0) {
			idx = obj[indexKey];
		}
		if(obj[collKey].length === 0) {
			obj[indexKey] = -1;
		}
		else if(obj[collKey][idx]) {
			obj[indexKey] = idx;
		}
		else if(obj[collKey][idx-1]) {
			obj[indexKey] = idx-1;
		}
		else if (obj[collKey][idx+1]) {
			obj[indexKey] = idx+1;
		}
		else {
			obj[indexKey] = 0;
		}
	}

	// TODO: Abstract state for tabs from session state
	// - Ex: "crunchable", "hasCompiler" should not be stored in session
	// - Also, untitled files (with file.promise) should not be stored until saved

	// Convenience structure
	Session.projects = {
		activeIndex: function() {
			// May not need this, but trying to prevent the "zero project" bug
			if(Session.state.projects.length === 0) {
				Session.state.projects.push({
					root: true
					, path: ''
					, open: true
					, activeTabIndex: -1
					, files: []
				});
				Session.set();
				return Session.state.projects[0];
			}
			return _.findIndex(Session.state.projects, { open: true });
		}
		, active: function() {
			var idx = Session.projects.activeIndex();
			if(idx === -1) {
				Session.state.projects[0].open = true;
				return Session.state.projects[0];
			}
			else {
				return Session.state.projects[idx];
			}
		}
		, close: function() {
			var idx = Session.projects.activeIndex();
			if(idx !== -1) {
				Session.state.projects[idx].open = false;
			}
			Session.set();
		}
		, open: function(dir) {
			var projectIndex = _.findIndex(Session.state.projects, { path: dir.nativePath });
			var prevOpenIndex = Session.projects.activeIndex();
			
			// Already open
			if(projectIndex === prevOpenIndex)
				return true;
			
			if(prevOpenIndex > -1) {
				Session.state.projects[prevOpenIndex].open = false;
			}
			if(projectIndex > -1) {
				var project = Session.state.projects[projectIndex];
				if(!project.open) {
					project.open = true;
					Utils.Array.move.bind(Session.state.projects, projectIndex, 0);
					//Session.state.projects.move(projectIndex, 0);
				}
				
				// Bubble open item to top 
				
			}
			else {

				// If no project was originally open, then merge open files with 
				// selected project
				if(Session.state.projects.length === 1
					&& Session.state.projects[0].root === true) {
				
					var project = Session.state.projects[0];
					project.root = false;
					project.name = dir.name;
					project.path = dir.nativePath;
					project.open = true;
				}
				else {
					Session.state.projects.unshift({ 
						name: dir.name
						, path: dir.nativePath
						, open: true 
						, activeTabIndex: -1
						, files: []
					});
				}
			}
			if(Session.state.projects.length > 10) {
				Session.state.projects.pop();
			}
			Session.set();
		}
		, removeLoading: function() {
			var project = _.find(Session.state.projects, { loading: true });
			if(project) {
				project.loading = false;
				Session.set();
			}
		}
		, remove: function(path) {
			var idx = _.findIndex(Session.state.projects, { path: path });
			var isOpen = false;
			if(idx > -1) {
				isOpen = idx === Session.projects.activeIndex();
				Session.state.projects.splice(idx, 1);
				if(Session.state.projects.length === 0) {
					Session.state.projects.push({
						root: true
						, path: ''
						, open: true
						, activeTabIndex: -1
						, files: []
					});
				}
				else if(isOpen) {
					Session.state.projects[0].open = true;
				}
				Session.set();
			}

			return isOpen;
		}
	};

	Session.files = {
		//open: Session.projects.active().files
		active: function() {
			return Session.files.open[Session.projects.active().activeTabIndex];
		}
		, recent: Session.state.recentFiles
		, updateActiveIndex: updateActiveIndex
		, indexOfFile: function(file, subtab) {
			var context;
			if(subtab) {
				return _.findIndex(Session.files.active().collection, { path: file.nativePath });
			}
			else {
				return  _.findIndex(Session.files.open, { root: { path: file.nativePath } });
			}
		}
		, setIndex: function(idx, subtab) {
			if(subtab === true) {
				Session.files.active().activeIndex = idx;
				// Sanity check
				updateActiveIndex(idx, Session.files.active(), 'activeIndex', 'collection');
			}
			else {
				Session.projects.active().activeTabIndex = idx;
				updateActiveIndex(idx);
				if(subtab || subtab === 0) {
					Session.files.active().activeIndex = subtab;
					updateActiveIndex(subtab, Session.files.active(), 'activeIndex', 'collection');
				}
			}
			Session.set();
		}
		, setIndexForFile: function(file, subtab) {
			Session.files.setIndex(Session.files.indexOfFile(file, subtab), subtab);
		}
		, addOpen: function(file) {

			if(_.find(Session.files.open, { root: { path: file.nativePath }})) 
				return false;

			var index = addFile(Session.projects.active(), {
				type: file.type
				, path: file.nativePath
				, name: file.name
				, key: file.key
			});
			
			Session.files.addRecent(file);
			Session.projects.active().activeTabIndex = index;
			
			return true;
		}
		, attachOutput: function(root, output) {
			var idx = Session.files.indexOfFile(root);

			if(idx > -1) {
				var sessionObj = Session.files.open[idx];
				if(sessionObj.collection[1] && sessionObj.collection[1].output) {
					if(sessionObj.collection[1].path === output.nativePath) 
						return;
					else {
						sessionObj.collection.splice(1,1);
						Session.files.addSub(output, true, root);
					}
				}
				else {
					Session.files.addSub(output, true, sessionObj);
				}
			}
		}
		, addSub: function(file, output, sessionObj) {
			if(!sessionObj) 
				sessionObj = Session.files.active();

			if(sessionObj.collection) {
				var newFile = {
					type: file.type
					, path: file.nativePath
					, name: file.name
					, key: file.key
				}
				if(output) {
					newFile.output = true;
				}
				Object.defineProperty(newFile, 'dirty', {
					get: function() {
						if(Files.collection[newFile.path]) {
							return Files.collection[newFile.path].dirty;
						}
						else
							return false;
						
					}
				});	
				sessionObj.collection.push(newFile);
				if(!output) {
					sessionObj.activeIndex = sessionObj.collection.length - 1;
				}
				Session.set();
			}
		}
		, move: function(i, j, subtab) {
			// Move file
			if(!subtab) {
				var files = Session.projects.active().files;
				var idx = Session.projects.active().activeTabIndex;
				//console.log(i, j, idx);

				files.splice(j, 0, files.splice(i, 1)[0]);

				if(idx == i) {
					Session.projects.active().activeTabIndex = j;
				}
				else {
					if(i > idx && j <= idx)	
						Session.projects.active().activeTabIndex++;
					if(i < idx && j >= idx)
						Session.projects.active().activeTabIndex--;
				}
			}
			else {
				var files = Session.files.active().collection;
				var idx = Session.files.active().activeIndex;
				Utils.Array.move.bind(files, i, j);
				//files.move(i, j);

				//console.log(i, j, idx);

				if(idx == i) {
					Session.files.active().activeIndex = j;
				}
				else {
					if(i > idx && j <= idx)	
						Session.files.active().activeIndex++;
					if(i < idx && j >= idx)
						Session.files.active().activeIndex--;
				}
				
			}
			Session.set();
		}
		, remove: function(i, j) {
			// Also applies to j === 0 because you can't remove root and leave subs
			var removedPath;
			if(!j) {
				removedPath = Session.files.open[i].root.path;
				Session.files.open.splice(i, 1);
				updateActiveIndex(i);
			}
			else {
				removedPath = Session.files.open[i].collection[j].path;
				Session.files.open[i].collection.splice(j, 1);
				updateActiveIndex(j, Session.files.open[i], 'activeIndex', 'collection');
				if(Session.files.open[i].collection.length === 0) {
					Session.files.open.splice(i, 1);
					updateActiveIndex(i);
				}
				else {
					updateActiveIndex();
				}
			}
			Session.set();
			return removedPath;
		}
		, get: function(fileName) {
			return _.find(Session.files.open, { root: { path: fileName } });
		}
		, removeOpen: function(fileName) {
			var idx;
			var removedPath;
			// Allow removal by index
			function isInt(value) {
			  var x = parseFloat(value);
			  return !isNaN(value) && (x | 0) === x;
			}
			if(isInt(fileName)) {
				idx = parseFloat(fileName);
			}
			else {
				idx = _.findIndex(Session.files.open, { root: { path: fileName } });
			}
			if(idx > -1) {
				removedPath = Session.files.open[idx];
				Session.files.open.splice(idx, 1);
				updateActiveIndex(idx);
			}
			Session.set();
			return removedPath;
		}
		, addRecent: function(file) {
			var files = Session.files.recent;
			if(files.indexOf(file.nativePath) === -1) {
				files.unshift(file.nativePath);
				if(files.length > 10)
					files.pop();
			}
			Session.set();
		}
		// For legacy support
		, updateOpen: function(oldFilePath, newFile) {

			var innerIdx;
			var outerIdx = _.findIndex(Session.files.open, function(obj) {

				var idx = _.findIndex(obj.collection, { path: oldFilePath });
				if(idx > -1) {
					innerIdx = idx;
					return true;
				}
				else {
					return false;
				}
			});
			
			if(outerIdx > -1) {
				Session.files.open[outerIdx].collection[innerIdx] = {
					type: newFile.file.type
					, path: newFile.file.nativePath
					, name: newFile.file.name
				}
				Session.set();
			}
			
		}
	};
	// Property shim after refactoring files to be inside of projects
	Object.defineProperty(Session.files, 'open', {
	    get: function() {
	    	return Session.projects.active().files;
	    }
	});	


	return Session;
});
