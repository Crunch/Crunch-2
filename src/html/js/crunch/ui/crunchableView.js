define([
	'lib/lodash'
	, 'crunch/ui/baseView'
	, 'crunch/supports'
	, 'crunch/settings'
	, 'crunch/utils'
	, 'text!template/crunchable.html'
	, 'Ractive'
	, 'lib/ractive/Ractive-transitions-fly'
	, 'lib/ractive/Ractive-transitions-slide' ], function(_, base, Supports, Settings, Utils, template, Ractive, fly, slide) {
	
	var Path = require('path');
	var Crunchable = {
		ractive: null
		, highlighted: null
		, openFolders: new Set()
		, create: function(Crunch) {

			if(Crunchable.ractive) {
				Crunchable.ractive.update();
				return;
			}

			var crunchable = Utils.cloneObject(Crunch.Files.collection[Crunch.Session.files.active().root.path].crunchable);
			Crunchable.projectPath = Settings.getProjectPath(crunchable.root.path, Crunch.Files.currentDir);
			//Crunchable.rootPath = Crunch.Session.files.active().root.path;

			var ractive = new Ractive({
				el: document.getElementById('crunchable')
				, template: template
				, lazy: 300
				, transitions: {
					fly: fly
					, slide: slide
				}
				, data: { 
					top: crunchable
					, getSettings: function(compiler) {
						return Settings._compilers[compiler];
					}
					, getOpen: function(context) {
						if(!context.path)
							return;
						return Crunchable.openFolders.has(context.path) || context.open === true;
					}
					, log: function(thing) {
						console.log(thing);
					}
				}

			});
			

			ractive.on({
				updateSettings: function (e, one, two) {
					var currentOptions = ractive.get('top');
					var options = {
						engines: []
					};
					_.each(currentOptions.engines, function(val) {
						//console.log(val.options);
						options.engines.push({ 
							compiler: val.compiler
							, output: val.output.origPath
							, options: val.options 
						});
					});
					Settings.updateProject(Crunchable.projectPath, currentOptions.root.path, options);
				}
				, back: function(event) {
					Crunch.Session.files.active().flipped = false;
				}
				, select: function(event) {
					if(event.context.type === 'folder') {
						ractive.fire('open', event);
					}
					else {
						ractive.fire('fileSelect', event, ractive.get('top'));
					}
				}
				, open: function(event, skipLocal) {
					//console.log(event);
					if(!skipLocal) {
						var isOpen = Crunchable.openFolders.has(event.context.path) || event.context.open === true;
						if(isOpen) {
							Crunchable.openFolders.delete(event.context.path);
						}
						else {
							Crunchable.openFolders.add(event.context.path);
						}
						
						ractive.set(event.keypath + '.open', !isOpen);
					}

				}
				, highlight: function(event) {
					
					if(event.context.type === 'file' 
						&& !Supports.format(event.context.ext, Settings.v()))
						return;

					if(Crunchable.highlighted) {
						ractive.set(Crunchable.highlighted, false);
					}
					Crunchable.highlighted = event.keypath + '.selected';
					ractive.set(Crunchable.highlighted, true);
				}
			});
			
			while(Crunchable._eventQueue.length > 0) {
				ractive.on(Crunchable._eventQueue.shift());
			}
			

			Crunchable.ractive = ractive;
			

		}
		, update: function(force) {
			if(!this.ractive) {
				this.create(Crunch);
			}
			else {
				var activeFile = Crunch.Session.files.active();
				if(activeFile) {
					
					var crunchable = Crunch.Files.collection[activeFile.root.path].crunchable;
					if(!crunchable) return;
					
					var newPath = Settings.getProjectPath(crunchable.root.path, Crunch.Files.currentDir);
					
					if(Crunchable.projectPath !== newPath) {
						
						this.openFolders.clear();
						Crunchable.projectPath = newPath;

						if(!crunchable.search) {
							crunchable.search = false;
							crunchable.searchText = '';
						}
					}

					this.ractive.set('top', crunchable);
					
				}
			}
		}
	}

	return _.extend(Crunchable, base());
});