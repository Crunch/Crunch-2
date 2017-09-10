define([
	'lib/lodash'
	, 'crunch/ui/baseView'
	, 'crunch/supports'
	, 'crunch/settings'
	, 'text!template/files.html'
	, 'lib/Sortable'
	, 'Ractive' 
	, 'lib/ractive/Ractive-transitions-fly'
	, 'lib/ractive/Ractive-transitions-slide' ], function(_, base, Supports, Settings, filesTemplate, Sortable, Ractive, fly, slide) {
	
	var Path = require('path');
	var FileView = {
		ractive: null
		, projectPath: ''
		, lastPath: ''
		, highlighted: null
		, openFolders: new Set()
		, gettingListing: new Set()
		, create: function(files) {

			// if(FileView.ractive) {
			// 	FileView.ractive.set(keypath, files);
			// 	return;
			// }

			if(!files) {
				files = Crunch.Files.currentDirectoryListing();
			}
			//var currentDir = 
			
			//if(currentDir && currentDir.path) FileView.projectPath = currentDir.path;


			function getMatches(path, keywords) {
				var found = false;
				_.each(keywords, function(val) {
					if(path.indexOf(val) > -1) {
						found = true;
						path = path.replace(val, '!@#' + val + '#@!');
					}
				});

				if(found) { 
					// Just in case a keyword contains "class" or something, we use tokens
					return path.replace(/!@#/g, '<s class="m">').replace(/#@!/g, '</s>');
				}
				else {
					return false;
				}
			}

			var ractive = new Ractive({
				el: document.getElementById('files')
				, template: filesTemplate
				, transitions: {
					fly: fly
					, slide: slide
				}
				, data: { 
					root: files
					, getFolders: function(str) {
						var arr = str.split('/');
						if(!arr) return "";

						return arr.reverse().map(function(v) { if(!v) return ""; return "<span>" + v + ' <i class="ico-chevron-right"></i></span>'; }).join("");
					}
					, getOpen: function(context, keypath) {

						keypath = keypath || false;

						var isOpen = FileView.openFolders.has(context.path) || context.open === true;
						//console.log(keypath, isOpen, context.traversed, FileView.gettingListing.has(keypath));

						if(keypath && isOpen && context.traversed === false && !FileView.gettingListing.has(keypath) ) {	
							FileView.gettingListing.add(keypath);
							//console.log('Getting...' + context.path);
							//ractive.fire('open', { keypath: keypath, context: context }, true);
						}

						return isOpen;
					}
					, getPath: function(path, keywords) {
						var thisPath = Path.dirname(path);
						var rootPath = ractive.get('root.path');
						if(FileView.lastPath === thisPath)
							return '';
						else {
							FileView.lastPath = thisPath;

							if(rootPath == thisPath) {
								return thisPath;
							}
							else {
								var outputPath = '.' + Path.sep + Path.relative(rootPath, thisPath);
								if(keywords) {
									var matched = getMatches(outputPath, keywords);
									return matched ? matched : outputPath;
								}
								else return outputPath;
							}
						}
					}
					, highlightMatch: function(name, ext, keywords) {
						var file = name + ext;
						var matched = getMatches(file, keywords);
						if(matched)
							return matched;
						else {
							return name + '<s class="f">'+ ext + '</s>';
						}
					}
				}
				, onupdate: function() {
					var currentDir = FileView.ractive.get('root');
					if(currentDir && currentDir.path) FileView.projectPath = currentDir.path;
				}
				, onrender: function() {
					// var b = new Sortable(this.el, {
					// 	group: "files"
					// 	, draggable: '.file'
					// 	, onStart: function (evt) {
					//         console.log(evt);
					//     }
					// });
				}
				
			});
			ractive.on({
				select: function(event) {
					if(event.context.type === 'folder') {
						ractive.fire('open', event);
					}
					else {
						ractive.fire('fileSelect', event, ractive.get('root'));
					}
				}
				, open: function(event, skipLocal) {
					if(!skipLocal) {
						var isOpen = FileView.openFolders.has(event.context.path) || event.context.open === true;
						if(isOpen) {
							FileView.openFolders.delete(event.context.path);
						}
						else {
							FileView.openFolders.add(event.context.path);
						}
						
						ractive.set(event.keypath + '.open', !isOpen);
					}

				}
				, highlight: function(event) {
					if(event.context.type === 'file' 
						&& !Supports.format(event.context.ext, Settings.v()))
						return;

					if(FileView.highlighted) {
						ractive.set(FileView.highlighted, false);
					}
					FileView.highlighted = event.keypath + '.selected';
					ractive.set(FileView.highlighted, true);
				}
			});

			while(FileView._eventQueue.length > 0) {
				ractive.on(FileView._eventQueue.shift());
			}

			FileView.ractive = ractive;
			

		}
		, update: function(files, keypathOrig, refresh) {

			var _this = this;

			if(files === true) {
				files = Crunch.Files.currentDirectoryListing();
			}

			var keypath = keypathOrig ? keypathOrig : 'root';
			var outerKeypath, innerKeypath;
			var currentVal;

			if(!keypathOrig) {
				this.openFolders.clear();
			}

			if(!this.ractive) {
				this.create(files);
			}
			else {
				if(files) {
					
					FileView.gettingListing.delete(keypath); 
					var currentVal = this.ractive.get(keypath);

					// Refresh just a portion of the tree
					if(currentVal && currentVal.traversed === true) {
						if(files.files) {
							_.each(files.files, function(val, idx) {
								if(val && val.files) {
									_.each(currentVal.files, function(current) {
										if(val && current && val.path === current.path) {
											val.files = current.files;
											return false;
										}
									});
								}
							});
						}
					}

					this.ractive.set(keypath, files);
				}
				else {
					this.ractive.update();
				}
			}
		}
	};

	return _.extend(FileView, base());
});