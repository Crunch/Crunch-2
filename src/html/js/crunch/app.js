define(['lib/lodash', 'utils/updater', 'js!lib/theme-crunch', 'js!lib/theme-crunch-dark'], function(_, updater) {


console.log('Starting app...');
 
 
var Legacy = function(Crunch) {

	var Plugins = Crunch.Plugins;
	var Prefs = Crunch.Prefs;
	var Session = Crunch.Session;
	var Files = Crunch.Files;
	var UI = Crunch.UI;
	var Supports = Crunch.Supports;
	var Process = Crunch.Process;
	var Settings = Crunch.Settings;
	var Messages = Crunch.Messages;
	

	return function() {
		"use strict";

		var Parser;
		var pendingClose = false;
		var scrollWidth = 100;
		var selectedTab = null;
		var tabMenu = null;
		var currentFileObj = null;
		var currentSessionFile = null;
		var currentDirObj = null;
		var topFile = null;

		var $lineModal = $('#dropdowns-outer')
		
		ace.require("ace/ext/language_tools");
		var editor = ace.edit("editor");
		ace.require("ace/config").setDefaultValue("session", "useWorker", false);
		
		Settings.addListener(function() {
			if (editor.session)
				editor.session.setUseWrapMode(Settings.App.config.editor.wrapMode);
		});
		

		global.editor = editor;

		// Node-webkit window
		var gui = require('nw.gui');
		var win = gui.Window.get();

		var isPlatformMac = navigator.platform.indexOf('Mac') > -1;

		
		var Commands = {
			
			undo: function() {
				if(editor.isFocused()) {
					editor.undo();
				}
				else {
					document.execCommand('undo');
				}
			},
			redo: function() {
				if(editor.isFocused()) {
					editor.redo();
				}
				else {
					document.execCommand('redo');
				}
			},
			newFile: function() {
				newTab();
			},
			openFile: function() {

				Files.openNew(function(fileObj, path) {
					if(fileObj.empty !== true) {
						openFile(fileObj.file);
					}
				});
				 

			},
			closeProject: function() {
				Session.projects.close();
				UI.ProjectView.update();
				$('.views').removeClass('active-files').addClass('active-projects');
				UI.Tabs.update(true);
			},
			openProject: function(project) {
				// console.log(arguments, project);
				// Project doesn't pass check
				if(arguments.length === 1 && !project) {
					Session.projects.removeLoading();
					return;
				}
				var openPath = project ? project.path : '';

				Files.openProject(openPath, function(dirObj, path) {
					if(!dirObj.file.exists) {
						if(Session.projects.active() === project) {
							project.open = false;
						}
						Messages.add({
					        type: 'error'
					        , message: 'Directory "' + dirObj.file.nativePath + '" is not accessible.'
						});
						Session.projects.removeLoading();
						UI.ProjectView.update();
						return;
					}
					
					
					if(dirObj && dirObj.empty !== true) {
						
						currentDirObj = dirObj;
						var alreadyOpen = Session.projects.open(dirObj.file);

						if(alreadyOpen && UI.FileView.ractive) {
							Session.projects.removeLoading();
							UI.ProjectView.update();
							$('#tabs').removeClass('transition');
							return setActiveProject();
						}
						else {
							$('#tabs').addClass('transition');
						}

						UI.Tabs.update(true);

						checkProject(Session.projects.active());
						//UI.ProjectView.update();
						
	
						Files.getDirectoryListing(dirObj.file.name, dirObj.file.fullPath(), true, false, null, function() {
							//console.log('Directory listing done.');
							//UI.FileView.update(true);
							//UI.Tabs.update(true);
							setActiveProject();

							if(Session.files.active() && Session.files.active().flipped && Session.files.active().crunchable)
								updateFlipState();
							setActive();
							Session.projects.removeLoading();
							if(!alreadyOpen || !UI.FileView.ractive)
								$('#tabs').removeClass('transition');
							UI.ProjectView.update();
						});
						
							
						
					}
					
				});

			},
			save: function() {
				trySave(currentFileObj, false);
			},
			saveAs: function() {
				saveAsFile(currentFileObj, false);
			},
			crunch: function(event) {
				
				var currentFile = Session.files.active();
				if(!currentFile) return;
				
				if(currentFile.hasCompiler) {
					if(!currentFile.crunchable) {
						selectOutput(currentFile);
					}
					else {
						Files.crunchAll(currentFileObj);
					}
				}

			},
			checkForUpdates: function(alertNothing) {
				// TODO: App updater
				var manifest = require('./package.json');
				// Check for update
				updater.checkAndPrompt(manifest, alertNothing);
			},
			exit: function() {
				closeWindow();
			},
			closeTab: function() {
				tryCloseTab(currentSessionFile);
			},
			nextTab: function() {
				Session.files.setIndex(Session.projects.active().activeTabIndex+1);
				UI.Tabs.update();
			},
			prevTab: function() {
				Session.files.setIndex(Session.projects.active().activeTabIndex-1);
				UI.Tabs.update();
			},
			find: function() {
				if(currentSessionFile)
					editor.execCommand("find");
			},
			findNext: function() {
				if(currentSessionFile)
					editor.findNext();
			},
			findPrevious: function() {
				if(currentSessionFile)
					editor.findPrevious();
			},
			selectAll: function() {
				if(currentSessionFile)
					editor.selectAll();
			},
			gotoLine: function() {
				if(currentSessionFile)
					toggleDropdown($lineModal);
			},
			replace: function() {
				if(currentSessionFile)
					editor.execCommand("replace");
			},
			openAbout: function() {
				UI.Modals.open({
					template: 'win/about.html'
					, data: {
						appVersion: require('./package.json').version
						, i: 0
					}
					, width: 520
					, height: 550
				});
			},
			openReload: function(event) {
				UI.Modals.open({
					template: 'win/dialog.html'
					, data: {
						title: event.name
						, icon: true
						, text: 'This file has been modified outside of Crunch. Should we discard your unsaved changes and reload it?</p><p>It seemed rude to do it without asking.' 
						, primary: {
							label: 'Discard &amp; Reload'
						}
						, secondary: {
							label: 'Do Nothing.'
						}
					}
					, events: {
						primaryAction: function() {
							Files.updateSession(event.path);
							UI.Tabs.update();
							this.fire('beginTeardown');
						}
						, secondaryAction: function() {
							this.fire('beginTeardown');
						}
					}
					
				});
			}

		};

		if(Settings.App.config.theme === 1 || Settings.App.config.theme === "1") {
			editor.setTheme("ace/theme/crunch-dark");
			$('html').addClass('dark');
		}
		else {
			editor.setTheme("ace/theme/crunch");
			$('html').removeClass('dark');
		}
		
		editor.setShowPrintMargin(false);
		editor.setBehavioursEnabled(false);
		editor.setDisplayIndentGuides(true);
		editor.setShowInvisibles(true);

		function addCompleter() {
			if(editor.completer) {
				editor.completer.exactMatch = true;
				editor.commands.removeListener('afterExec', addCompleter);
			}
		}
		editor.commands.on('afterExec', addCompleter);

		var editorOptions = {
			scrollPastEnd: true,
	    tooltipFollowsMouse: false
		};
		if(Settings.v()) {
			editorOptions['enableBasicAutocompletion'] = true;
			editorOptions['enableLiveAutocompletion'] = true;
		}
		editor.setOptions(editorOptions);

		editor.$blockScrolling = Infinity;

		editor.renderer.on("afterRender", function() {
			var session = editor.getSession();
			if(session.screenWidth > 2000) {
				session.setUseWrapMode(true);
			}
		});
		
		
		window.addEventListener( 'resize', function() {
			refreshEditor();
		});

		
		var el = document.getElementById('editor');
		el.style.textIndent = "0.1px";
		el.style.webkitTextStroke = "0.1px transparent";

		// TODO -- still needed??

		editor.commands.addCommands([{
			name : "inspect",   
			bindKey : {
				win : "Ctrl-Shift-=",
				mac : "Command-Shift-=",
				sender : "editor"
			},
			exec : function() { if(Crunch.Settings.v() || /unminified/.test(function(){/*unminified*/})) win.showDevTools(); }
		},{
			name : "crunch",
			bindKey : {
				win : "Ctrl-Enter",
				mac : "Command-Enter",
				sender : "editor"
			},
			exec : Commands.crunch
		},{
			name : "gotoline",
			bindKey : {
				win : "Ctrl-G",
				mac : "Command-L",
				sender : "editor"
			},
			exec : Commands.gotoLine
		},{
			name : "nextTab",
			bindKey : {
				win : "Ctrl-Tab",
				mac : "Ctrl-Tab",
				sender : "editor"
			},
			exec : Commands.nextTab
		},{
			name : "prevTab",
			bindKey : {
				win : "Ctrl-Shift-Tab",
				mac : "Ctrl-Shift-Tab",
				sender : "editor"
			},
			exec : Commands.prevTab
		}
		]);


		editor.on('change', function(e) {
			if(Files.changeDirty(currentFileObj)) {
				UI.Tabs.update();
			}
		});

		
		// Get stored state
		
		
		function addOpenFile(file, subtab, output) {
			var fileObj = Files.add(file);
			var Path = require('path');
			if(subtab) {
				return Session.files.addSub(file, output);
			}
			else {
				Session.files.addOpen(file);
				// if(fileObj.crunchable && fileObj.crunchable.output) {
				// 	var outputFile = new Files.File(Path.resolve(file.fullPath(), '..', fileObj.crunchable.output.path), true);
				// 	Files.add(outputFile);
				// 	Session.files.addSub(outputFile, true);
				// }
			}
			
		}

		function addRecentProject(dir) {
			Session.projects.addRecent(dir);
		}
		

		// Keyboard mappings -- TODO - Still needed??


		var modifier = isPlatformMac ? "cmd" : "ctrl";

		win.on('close', closeWindow);

		var WIPE_SETTINGS = false;
		function closeWindow(force) {
			var dirties, storageKeys = 0;
			
			function delCallback(key) {
				storageKeys--;
				if(storageKeys <= 0) {
					win.close(true);
				}
			}
			if(!force) {
				dirties = Files.getDirtyFiles();
			}
			if(force || dirties.length === 0) {
				win.hide(); // Pretend to be closed already
				console.log("We're closing...");
				
				// Kill our child processes
				Process.Watcher.kill();
				Process.Compiler.kill();
	
				Crunch.ua.e({
					ec: "App"
					, ea: "Close"
					, sc: "end"
				},function() {
					if(WIPE_SETTINGS) {
						storageKeys = Crunch.Storage.keys().length;
						localStorage.clear();
						Crunch.Storage.keys().forEach(function(key) {
							Crunch.Storage.del(key, delCallback);
						});
					}
					else {
						win.close(true);
					}
					
				}).send();
			}
			else {
				pendingClose = true;
				console.log(dirties);
				var saveList = [];
				var savePaths = [];
				_.each(dirties, function(val,i) {
					saveList.push(true);
				});

				UI.Modals.open({
					template: 'win/saveAll.html'
					, id: 'saveall'
					, width: 520
					, height: 225
					, data: { 
						icon: 'ico-floppy'
						, getDirties: function() {
							return dirties;
						}
						, saveList: saveList
					}
					, events: {
						nosave: function(event) {
							this.fire('beginTeardown');
							pendingClose = false;
							closeWindow(true);
						}
						, save: function(event) {
							var _this = this;
							
							pendingClose = false;
							saveList = this.get('saveList');
							_.each(saveList, function(val, i) {
								if(val === true) {
									savePaths.push(dirties[i].nativePath);
								}
							});

							Files.savePaths(savePaths, true, function() {
								_this.fire('beginTeardown');
								closeWindow(true);
							});
						}
						, cancel: function(event) {
							pendingClose = false;
							this.fire('beginTeardown');
						}
					}
				});
			}
		}

		function setActiveProject() {
			$('.views').removeClass('active-projects').addClass('active-files');
			// temp

		}
		// Hook into tab's ractive rather than manage all tab switching logic in this file
		function setActive(idx1, idx2, context) {
			if(!idx1 && idx1 !== 0) {
				// Not sure what's causing a zero  activeTabIndex when there is nothing in session
				// This is a workaround
				// Session.files.updateActiveIndex();
				//console.log(idx1, idx2);
				//console.log(Session.projects.active(), Session.files.active());

				idx1 = Session.projects.active().activeTabIndex;
				if(Session.files.active()) {
					idx2 = Session.files.active().activeIndex;
				}
			}
			if(idx1 > -1) {
				var fileName;
				if(idx1.jquery) {
					// This is a jquery object
					idx1 = idx1.index();
				}
				if(idx2 || idx2 === 0) {
					Session.files.active().activeIndex = idx2;

					currentSessionFile = { 
						context: Session.files.open[idx1].collection[idx2]
						, index: {
							i: idx1
							, j: idx2
						}
					};
				}
				else {
					if(Session.files.open[idx1]) {
						currentSessionFile = { 
							context: Session.files.open[idx1].collection[Session.files.open[idx1].activeIndex]
							, index: {
								i: idx1
							}
						};
					}
					else return;
				}

				if(currentSessionFile.context) {
					fileName = currentSessionFile.context.path;
					currentFileObj = Files.collection[fileName];

					updateFlipState();
					// Need to figure out all cases where this isn't true.
					//console.log(currentFileObj);
					
					if(currentFileObj && currentFileObj.session) {
						$('#editor-window').removeClass('hidden').addClass('nosplash');

						var session = currentFileObj.session();
						session.setUseWrapMode(Settings.App.config.editor.wrapMode);
						
						editor.setSession(session);
						editor.setReadOnly(currentFileObj.file.readOnly || (context && context.output === true));						

						// Necessary to update scrollbars
						editor.resize();
						var el = document.getElementById('editor');

						// "Recycle type to try to circumvent Chrome bug"
						 setTimeout(function() {
							var el = document.getElementById('editor');
							el.style.textIndent = "0px";
							el.style.webkitTextStroke = "0px transparent";
 							editor.focus();
						},100);
						 
					}
				}
			}
			else {
				$('#editor-window').addClass('hidden').removeClass('nosplash');
				currentSessionFile = null;
				currentFileObj = null;
			}

		}
		function getSessionFilename(sessionFile) {
			var fileName, j;

			if(sessionFile.path) {
				fileName = sessionFile.path;
			}
			else {
				if(!sessionFile.index.j) {
					j = 0;
				}
				else {
					j = sessionFile.index.j;
				}
				fileName = Session.files.open[sessionFile.index.i].collection[j].path;
			}
			return fileName;
		}
		function tryCloseTab(sessionFile) {
			if(!sessionFile) return;

			var fileName = getSessionFilename(sessionFile);
			var fileObj = Files.collection[fileName];

			//if(!fileObj) return;

			var realSession;

			if(sessionFile.file) {
				realSession = Session.files.get(fileName);
			}
			else {
				realSession = Session.files.open[sessionFile.index.i];
			}

			if(fileObj) {

				if((!realSession || realSession.flipped === true || realSession.collection.length === 1) && fileObj.dirty) {
					UI.Modals.open({
						template: 'win/save.html'
						, width: 520
						, height: 225
						, data: { data: fileObj, icon: 'ico-floppy' }
						, events: {
							nosave: function(event) {
								Files.updateSession(fileObj);
								closeTab(sessionFile, fileName);
								this.fire('beginTeardown');
							}
							, save: function(event) {
								var _this = this;
								Files.save(fileObj, function(e) {
									closeTab(sessionFile, fileName);
									_this.fire('beginTeardown');
								});
								
							}
						}
					});
					return false; //?
				}
				else if(realSession && realSession.collection.length > 1 && realSession.flipped === false) {
					var saveList = [];
					var savePaths = [];
					var tmpObj;
					var dirties = [];

					_.each(realSession.collection, function(val, i) {
						tmpObj = Files.collection[val.path];
						if(tmpObj && tmpObj.dirty) {
							dirties.push(tmpObj.file);
							saveList.push(true);
						}
					});

					if(dirties.length === 0) {
						closeTab(sessionFile, fileName);
					}
					else {

						UI.Modals.open({
							template: 'win/saveAll.html'
							, id: 'saveall'
							, data: { 
								icon: 'ico-floppy'
								, headline: 'This Magic Tab™ has unsaved files!'
								, getDirties: function() {
									return dirties;
								}
								, saveList: saveList
							}
							, events: {
								nosave: function(event) {
									this.fire('beginTeardown');
									_.each(realSession.collection, function(val, i) {
										tmpObj = Files.collection[val.path];
										if(tmpObj) {
											Files.updateSession(tmpObj);
										}
									});
									closeTab(sessionFile, fileName);
								}
								, save: function(event) {
									var _this = this;
									
									saveList = this.get('saveList');
									_.each(saveList, function(val, i) {
										if(val === true) {
											savePaths.push(dirties[i].nativePath);
										}
									});

									Files.savePaths(savePaths, false, function() {
										_this.fire('beginTeardown');
										_.each(realSession.collection, function(val, i) {
											console.log(val.path);
											if(savePaths.indexOf(val.path) === -1) {
												tmpObj = Files.collection[val.path];
												console.log(tmpObj);
												if(tmpObj) {
													Files.updateSession(tmpObj);
												}
											}
										});
										closeTab(sessionFile, fileName);
									});
								}
								, cancel: function(event) {
									this.fire('beginTeardown');
								}
							}
						});
					}
				}
				else {
					closeTab(sessionFile, fileName);
				}
			} else {
				closeTab(sessionFile, fileName);
			}
		}

		function closeTab(sessionFile, fileName) {
			var tmpSession;

			function closeCollection(collection) {
				_.each(collection, function(val) {
					Files.remove(val.path);
				});
			}
			if(!pendingClose) {
				if(!sessionFile) {
					sessionFile = currentSessionFile;
				}
				if(!fileName) {
					fileName = getSessionFilename(sessionFile);
				}
				fileName = fileName || sessionFile.file.nativePath;

				if(sessionFile.file) {
					tmpSession = Session.files.get(fileName);
					if(tmpSession) {
						closeCollection(tmpSession.collection);
					}
					Session.files.removeOpen(fileName);
				}
				else {
					tmpSession = Session.files.open[sessionFile.index.i];
					if(tmpSession && !sessionFile.index.j) {
						closeCollection(tmpSession.collection);
					}
					Session.files.remove(sessionFile.index.i, sessionFile.index.j);
				}
				setActive();
				updateFlipState();
				UI.Tabs.update();
				//Files.remove(fileName);
			}	
			else {
				closeWindow();
			}
			
			return false;
		}


		function newTab() {

			var file = Files.create();
			
			// TODO: Update session to not save Untitled files
			Session.files.addOpen(file);
			setActive(0);
			updateFlipState();
			UI.Tabs.update();
		}

		function toggleDropdown(e) {
			
			if(e.is(":visible")) {
				e.find("input").focus().select();
				return;
			}
			else {
				e.css('display', 'block');
				e.find("input").val('').focus().select();
			}

			$('.widget-line').addClass('active');

			
			// $("#dropdowns-outer > div:visible").each(function() {
			// 	$(this).find(".close").click();
			// });

			
			//e.show().animate({top : '0'}, 100, function() { $(this).find("input").focus().select(); }).parent().show();
		}

		function findText(val) {
			editor.find(val, {
				wrap : true,
				caseSensitive : false,
				wholeWord : false,
				regExp : false,
				skipCurrent: true
			});
			editor.execCommand("find");
			return false;
		}

		function gotoLine(val) {
			editor.gotoLine(val, 0, true);
			return false;
		}

		
		var lastCrunch;
		

		function openFile(file, subtab, output) {
			if(!file.nativePath)
				file = new Files.File(file);
			
			if(!file.exists) {
				return Messages.add({
			        type: 'error'
			        , message: 'File ' + file.nativePath + ' does not exist.'
				});
			}

			if(!Settings.v() && !Supports.allow(file.type)) {  //  && file.name !== Settings.projectFile)
			 	Crunch.ua.e('PurchaseFlow', 'FileBlock').send();
			 	UI.Modals.openPurchase();

			 	return Messages.add({
			 		type: 'purchase'
			 		, obj: file.type
			 	});
			}
			
			// Wait a tick, what if it's already open (in main tabs)?
			var idx;
			if(subtab === true) {
				idx = Session.files.indexOfFile(file, subtab);
			}
			else {
				idx = Session.files.indexOfFile(file);
			}

			if(idx > -1) {
				// TODO: Refresh file if modified?
				Session.files.setIndex(idx, subtab);
				UI.Tabs.update();
			}
			else {
				addOpenFile(file, subtab, output);
				Session.files.setIndexForFile(file, subtab);
				UI.Tabs.update();
				// What kind of files do people open most?
				Crunch.ua.e('FileOpen', '.' + file.type).send();
			}
			return;

		}


		function trySave(fileObj, crunch, closeWindow) {
			if(!fileObj) return;

			if(closeWindow) {
				closeWindow.close();
			} else
				closeWindow = false;
			
			if(fileObj.file.promise) {
				saveAsFile(fileObj, crunch, closeWindow);
			} else {
				saveFile(fileObj, crunch, false);
				if(closeWindow)
					closeTab();
			}
		}

		function saveFile(fileObj, crunch, ask, update) {

			Files.save(fileObj, function(e) {
				UI.Tabs.update();
			});
	

		}

		function saveAsFile(fileObj, crunch, closeAfterSave) {
			if(!fileObj) return;

			var oldFilePath = fileObj.file.nativePath;

			Files.saveAs(fileObj, function(newFile) {
				if(!newFile) return;

				var idx = Session.files.updateOpen(oldFilePath, newFile);
				if(closeAfterSave) {
					closeTab(newFile);
				}
				
				UI.Tabs.update();

				var project = Session.projects.active();
				var files = Session.files.active();

				setActive(project.activeTabIndex, files.activeIndex);
				
			});


		}

		
		function selectOutput(context) {
			var path, name, type, engine;
			var Path = require('path');

			if(context.root === true) {
				engine = Supports.compiler(context.ext, Settings.v());
				if(!engine) return;
				name = context.name + '.' + engine[0].output;
				path = context.path;
				type = context.ext.replace('.', '');
			}
			else {
				engine = Supports.compiler(context.root.type, Settings.v());
				if(!engine) return;
				name = context.root.name.replace(new RegExp(context.root.type + '$'), engine[0].output);
				path = context.root.path;
				type = context.root.type;
			}
			

			Files.openDialog({ 
				type: 'saveas'
				, path: require('path').dirname(path)
				, name: name
			}, function() {
				var outputPath = $(this).val();
				var ext = Path.extname(outputPath);

				if(ext === '') {
					outputPath = outputPath + '.' + engine[0].output;
				}
				else if(ext === '.') {
					outputPath = outputPath + engine[0].output;
				}
				Files.crunch(Supports.compiler(type, Settings.v())[0].engine, path, outputPath);

			});
		
		}

		function updateFlipState() {
			var activeFile = Session.files.active();

			if(activeFile && activeFile.flipped && activeFile.crunchable) {
				UI.Crunchable.update(true);
				$('.views').addClass('active-crunchable');
				$('#tabs').addClass('sub-open');
				refreshEditor();
			}
			if(!activeFile || activeFile && !activeFile.flipped) {
				$('#tabs').removeClass('sub-open');
				$('.views').removeClass('active-crunchable');
				refreshEditor();
			}
		}
		
		function openSettings(root, output) {
			
			var opt = Settings.getFileOptions(root.path);

			// TODO - this should be in output "engines"
			var engine = opt.compilers[0];
			var settings = Settings._compilers[engine];
			var values = Settings.getCompilerOptions(engine, root.path);
			var projectPath = Settings.getProjectPath(root.path);

			var data = {
				settings: settings.options
				, values: values
				, icon: 'ico-cog'
			};
			UI.Modals.open({
				template: 'win/settings.html'
				, data: data
				, events: {
					updateValue: function(e, item) {
						console.log(e, item);
						console.log(this.data);
					}
				}
				, observers: {
					'values.*': function(newValue, oldValue, keyPath) {
						//console.log(this.get('values'));
						var update = {
							compilers: {}
						};
						// var key = keyPath.replace('values.', '');
						update.compilers[engine] = this.get('values');
						// update.compilers[engine][key] = newValue;

						Settings.updateProject(projectPath, update);
					}
				}
				//, events
			});
		}

		// This craziness is to try to get the editor to correctly resize after closing sub-tabs
		function refreshEditor() {
			editor.resize(true);
			setTimeout(function() {
				editor.resize(true);
			},200);
			// setTimeout(function() {
			// 	editor.resize(true);
			// },500);
			setTimeout(function() {
				editor.resize(true);
			},1000);
			setTimeout(function() {
				editor.resize(true);
			},2500);
		}
		function bindUI() {
			UI.FileView.on({
				back: function(event) {
					$('.views').addClass('active-projects').removeClass('active-files');
				}
				, fileSelect: function(event, root) {
					openFile(event.context.path);
					if(root.search && root.searchText && event.context.matches.length > 0) {
						findText(root.searchText);
					}
				}
				, open: function(event) {

					if(event.context.type === 'folder') {
						if(event.context.traversed === false) {
							Files.getDirectoryListing(event.context.name, event.context.path, false, true, event.keypath);
						}
						
					}

				}
				, openPurchase: function(event) {
					UI.Modals.openPurchase();
				}

			});

			UI.ProjectView.ractive.on({
				add: function(event) {
					Crunch.ua.e('Project', 'Add').send();
					Commands.openProject();
				}
				, select: function(event) {
					Crunch.ua.e('Project', 'Open').send();
					Commands.openProject(event.context);
				}
			});
			UI.GlobalSettings.on({
				openPurchase: function(event) {
					UI.Modals.openPurchase();
				}
			});

			UI.Crunchable.on({
				back: function(event) {
					$('#tabs').removeClass('sub-open');
					$('.views').removeClass('active-crunchable');
					UI.Tabs.update();
					refreshEditor();
				}
				, fileSelect: function(event, root) {
					openFile(event.context.path, true, event.context.output);
					if(root.search && root.searchText && event.context.matches > 0) {
						findText(root.searchText);
					}
				}
				, selectOutput: function(e, root) {
					selectOutput(root);
				}
				, openSettings: function(e, root, output) {
					openSettings(root, output);
				}
				, crunch: function() {
					Commands.crunch();
				}
			});
			UI.Messages.on({
				jumpToLine: function(event) {
					//console.log(event);
					openFile(event.context.root, 0);
					if(event.context.root !== event.context.obj.filename) {
						openFile(event.context.obj.filename, true);
					}
					gotoLine(event.context.obj.line);
				}
				, selectMain: function(event) {
					//console.log(event);
					openFile(event.context.root);
					openFile(event.context.root, true);
				}
				, selectOutput: function(event) {
					openFile(event.context.root);
					openFile(event.context.output, true);
				}
				, purchase: function(event) {
					//console.log(event);
					UI.Modals.openPurchase();
				}
			});

			UI.Tabs.on({ 
				selectMain: function(event) {
					setActive(event.index.i);
					Session.set();
					UI.Tabs.update();
					if(event.context.flipped && event.context.crunchable) {
						updateFlipState();
						UI.Crunchable.update(true);
						$('.views').addClass('active-crunchable');
					}
					else
						$('.views').removeClass('active-crunchable');
				}
				, newFile: function(event) {
					Commands.newFile();
				}
				, selectSub: function(event) {
					//console.trace();
					setActive(event.index.i, event.index.j, event.context);
					Session.set();
				}
				, close: function(event) {
					//console.log('Close event.');
					//console.log(event);
					tryCloseTab(event);
					updateFlipState();
				}
				, updateIndex: function(idx) {
					setActive(idx);
					if(Session.files.open[idx] && Session.files.open[idx].flipped && Session.files.open[idx].crunchable) {
						updateFlipState();
						$('#tabs').addClass('sub-open');
						refreshEditor();
					}
					Session.set();
				}
				, updateSubIndex: function(idx) {
					setActive(null, idx);
					Session.set();
				}
				, selectOutput: function(event) {
					selectOutput(event);
				}
				, flipup: function(event) {
					if(!event.context.crunchable) {
						//selectOutput(event.context);
						// Open select output popover
					}
					else {
						updateFlipState();
						Session.set();
					}
				}
				, isFlipped: updateFlipState
				, flipdown: function(event) {
					$('.views').removeClass('active-crunchable');
					refreshEditor();
					Session.set();
				}
			});
		}
		function checkProject(dirObj) {
			//console.log(dirObj);
			//return;
			
			if(dirObj.files.length === 0) {
				setActive(-1);
			}
			else {

				// Verify that files stored in session are still valid
				// If valid, add a file handler
				var i = dirObj.files.length;
				var fileObjs = [];
				var before, fObj;

				while (i--) {
					var tab = dirObj.files[i];
					var j = tab.collection.length;
					while (j--) {
					    var file = new Files.File(tab.collection[j].path);

					    if(!file.exists) {
					        tab.collection.splice(j,1);
					    }
					    else {
					        fileObjs.push(file);
					    }
						// Sanity check to make sure the activeIndex is valid regardless
						Session.files.updateActiveIndex();
						before = Session.files.active().activeIndex;
						Session.files.updateActiveIndex(null, tab, 'activeIndex', 'collection');
						if(Session.files.active().activeIndex !== before) {
							setActive();
						}
					}
					if(tab.collection.length === 0) {
						dirObj.files.splice(i, 1);
					}
					_.each(fileObjs, function(val, idx) {
						fObj = Files.add(val);
						if(val.nativePath === tab.collection[0].path && !fObj.crunchable && tab.activeIndex !== 0) {
							tab.activeIndex = 0;
							tab.flipped = false;
							tab.collection.splice(1);
							Session.set();
						}
					});
					fileObjs = [];
				}
				

				before = Session.projects.active().activeTabIndex;
				Session.files.updateActiveIndex();
				
				if(Session.projects.active().activeTabIndex !== before) {
					setActive();
				}
				Session.set();

				// if(Session.projects.active().activeTabIndex > -1) {
				// 	setActive();
				// }
				// else {
				// 	newTab();
				// }
			}
		}
		function setupPopups() {
			var $w = $('#widgets'), $widget = {
				crunch: $w.find('.widget-crunch')
				, search: $w.find('.widget-search')
				, replace: $w.find('.widget-replace')
				, line: $w.find('.widget-line')
			};

			$lineModal.on('click', '.close', function() {
				$lineModal.css('display', 'none');
				$widget.line.removeClass('active');
			});
			$lineModal.on('keyup', 'input', function(e) {
				var val = $(this).val();
				if(val != '')
					gotoLine($(this).val());
			});


			$widget.crunch.on('click', function() {
				Commands.crunch();
			});
			$widget.search.on('click', function() {
				Commands.find();
			});
			$widget.replace.on('click', function() {
				Commands.replace();
			});
			$widget.line.on('click', function() {
				Commands.gotoLine();
			});

			var sb, config = ace.require('ace/config');
			config.loadModule("ace/ext/searchbox", function(e) {
				var sb = new e.SearchBox(editor);

				var old_hide = e.SearchBox.prototype.hide,
					old_show = e.SearchBox.prototype.show;

				e.SearchBox.prototype.hide = function() {
					$('.widget-search, .widget-replace').removeClass('active');
					old_hide.call(editor.searchBox);
				};
				e.SearchBox.prototype.show = function(value, isReplace) {
					if(isReplace) {
						$('.widget-replace').addClass('active');
						$('.widget-search').removeClass('active');
					}
					else {
						$('.widget-search').addClass('active');
						$('.widget-replace').removeClass('active');
					}
					old_show.call(editor.searchBox, value, isReplace);
				};
				sb.hide();
			});
			
			

			// editor.commands.on('afterExec', function(e) {
			// 	if (e.command.name === "find") {
			// 		$widget.search.toggleClass('active');
			// 	}
			// });

			$(document).on('keyup', ".search > input", function(e) {
			    var $this = $(this);
			    var searchFiles = $this.hasClass('files-search');
			    var searchText = $this.val();
			    var rootFile = null;

			    if(searchText && searchText.length < 2) {
			    	$this.parent().addClass('incomplete');
			    	return;
			    }
			    else {
			    	$this.parent().removeClass('incomplete');
			    }
			    if(!searchFiles && Session.files.active()) {
			    	rootFile = Files.collection[Session.files.active().root.path];
			    }

			    if(e.keyCode === 10 || e.keyCode === 13) {
			    	
		    		$this.parent().addClass('loading').find('i').removeClass('ico-close').addClass('ico-spinner8');
		    		// Give class time to paint
		    		process.nextTick(function() {
			    		Files.search(searchFiles, $this.val(), function(success) {
			    			
			    			if(searchFiles) 
			    				UI.FileView.update(true);
			    			else
			    				UI.Crunchable.update(true);
			    		
			    			$this.parent().removeClass('loading').find('i').addClass('ico-close').removeClass('ico-spinner8');
			    		}, rootFile);
		    		});
					
			    }
			    else {
			    	if($this.val() !== '') {
			    		$this.addClass('has-value');
			    	}
			    	else {
			    		$this.removeClass('has-value');
			    	}
			    }
			});
			$(document).on('click', '.search .ico-close', function(e) {
				var $this = $(this);
				var searchFiles = $this.siblings('input').hasClass('files-search');
				$this.siblings('input').val('').removeClass('has-value');
				
				var rootFile = null;

				if(!searchFiles && Session.files.active()) {
			    	rootFile = Files.collection[Session.files.active().root.path];
			    }

				Files.search(searchFiles, '', function() {
					if(searchFiles)
						UI.FileView.update(true);
					else
						UI.Crunchable.update(true);
				}, rootFile);
			});
		}
		function init() {

			Commands.checkForUpdates();

			// Check for updates every 4 hours
			setInterval(Commands.checkForUpdates, 1000 * 60 * 60 * 4);

			Files.Events.subscribe(function(event) {

				if(event.type) {
					if(event.type === 'dirUpdate') {
						UI.FileView.update(event.files, event.keypath, event.refresh);
					}
					else if(event.type === 'updateDirty') {
						Commands.openReload(event);
					}
				}
				if(UI.Crunchable.ractive) {
					UI.Crunchable.update();
				}
				UI.Tabs.update();
				editor.resize();
			});

			UI.ProjectView.create(Crunch);
			UI.Messages.create(Crunch);
			UI.GlobalSettings.create(Crunch);

			checkProject(Session.projects.active());

			if(Session.projects.active().root !== true) {	
				Commands.openProject(Session.projects.active());
			}
			

			UI.Tabs.create(Crunch);
			bindUI();

			// Enable file drag / drop
			var holder = document.getElementById('container');
			holder.ondragover = function () { 
			//	this.className = 'hover'; 
				return false; 
			};
			holder.ondragleave = function () { 
				//this.className = ''; 
				return false; 
			};
			holder.ondrop = function (e) {
			  e.preventDefault();
			  //this.className = '';

			  for (var i = 0; i < e.dataTransfer.files.length; ++i) {
			    openFile(e.dataTransfer.files[i].path);
			  }
			  return false;
			};

			setTimeout(function() {
				document.body.className = 'loaded';
			},100);

			setupPopups();
			CreateMenus();

			if(Settings.v()) {
				$('#container').addClass('pro');
			}
			else {
				$('#container').addClass('free');
			}
			
			if(CRUNCH_FIRST_RUN) {
				UI.Modals.showActivationModal();
			}
		}

		function CreateMenus() {
			
			var nativeMenuBar = new gui.Menu({ type: "menubar" });
			try {
				nativeMenuBar.createMacBuiltin("Crunch", {
					hideEdit: true,
  					hideWindow: true
				});
			} catch (ex) {
				//console.log(ex.message);
			}

			// TODO: context menu
			// tabMenu = createTabMenu();
			
			var fileMenu = new gui.MenuItem({ 
				label: 'File'
				, submenu: createFileMenu()
			});
			
			var editMenu = new gui.MenuItem({
				label: 'Edit'
				, submenu: createEditMenu()
			});

			var helpMenu = new gui.MenuItem({
				label: 'Help'
				, submenu: createHelpMenu()
			});


			// var projectMenu = new gui.MenuItem({
			// 	label: 'Project'
			// 	, submenu: createProjectMenu()
			// });

			nativeMenuBar.append(fileMenu);
			nativeMenuBar.append(editMenu);
			nativeMenuBar.append(helpMenu);

			if(isPlatformMac) {
				var appMenu = nativeMenuBar.items[0].submenu;
				for(var i=appMenu.items.length; i >= 0; i--) {
					try { 
						appMenu.removeAt(i);
					}
					catch(ex) {}
				}
				createAppMenu(nativeMenuBar.items[0].submenu);
			}

		
			win.menu = nativeMenuBar;
			

			// CONTEXT MENUS
			createProjectItemMenu();
			createRefreshMenu();

		}
		function addMenuItem(menu, label, func, keyEq, keyMod) {

			var item = new gui.MenuItem({
			  label: label,
			  key: keyEq,
			  modifiers: keyMod ? modifier + keyMod : modifier
			});
			if(typeof func === "function") {
				item.click = func;
			}
			menu.append(item);
		}
		
		function createAppMenu(menu) {

			addMenuItem(menu, "Check for updates...", function() { Commands.checkForUpdates(true); });
			addMenuItem(menu, "Quit Crunch 2", gui.App.quit, "q");
			
		}
		function createFileMenu() {
			var fileMenu = new gui.Menu();

			addMenuItem(fileMenu, "New", Commands.newFile, "n");
			addMenuItem(fileMenu, "Open File...", Commands.openFile, "o");
			addMenuItem(fileMenu, "Open Project...", Commands.openProject, "o", "-shift");
			addMenuItem(fileMenu, "Close Tab", Commands.closeTab, "w");
			
			fileMenu.append(new gui.MenuItem({ type: 'separator' }));
			
			addMenuItem(fileMenu, "Save", Commands.save, "s");
			addMenuItem(fileMenu, "Save As...", Commands.saveAs, "s", "-shift");

			fileMenu.append(new gui.MenuItem({ type: 'separator' }));
			
			addMenuItem(fileMenu, "Crunch!", Commands.crunch, String.fromCharCode(13));
			
			fileMenu.append(new gui.MenuItem({ type: 'separator' }));
			
			if(!isPlatformMac) {
				addMenuItem(fileMenu, "Exit", gui.App.quit, "e");
			}
		

			return fileMenu;
		}

		function createEditMenu() {
			var editMenu = new gui.Menu();
			//editMenu.addEventListener(air.Event.SELECT, selectCommandMenu);

			addMenuItem(editMenu, "Undo", Commands.undo, "z");
			addMenuItem(editMenu, "Redo", Commands.redo, "y");

			editMenu.append(new gui.MenuItem({ type: 'separator' }));

			addMenuItem(editMenu, "Select All", Commands.selectAll, "a");
			

			addMenuItem(editMenu, "Cut", function() { document.execCommand("cut"); } , "x");
			addMenuItem(editMenu, "Copy", function() { document.execCommand("copy"); }, "c");
			addMenuItem(editMenu, "Paste", function() { document.execCommand("paste"); }, "v");

			editMenu.append(new gui.MenuItem({ type: 'separator' }));

			addMenuItem(editMenu, "Find...", Commands.find, "f");
			addMenuItem(editMenu, "Find Next...", Commands.findNext, isPlatformMac ? "k" : "f3");
			addMenuItem(editMenu, "Find Previous...", Commands.findPrevious, isPlatformMac ? "k" : "f3", "-shift");

			addMenuItem(editMenu, "Replace...", Commands.replace, "r");

			editMenu.append(new gui.MenuItem({ type: 'separator' }));

			addMenuItem(editMenu, "Goto Line...", Commands.gotoLine, isPlatformMac ? "l" : "g");

			//var preferencesCommand = editMenu.addItem(new air.NativeMenuItem("Preferences"));
			//preferencesCommand.addEventListener(air.Event.SELECT,selectCommand);

			return editMenu;
		}
		function createProjectMenu() {
			var menu = new gui.Menu();
			addMenuItem(menu, "Open...", Commands.openProject, "o", "-shift");
			addMenuItem(menu, "Close", Commands.closeProject, "x", "-shift");

			return menu;
		}
		function createHelpMenu() {
			var menu = new gui.Menu();
			addMenuItem(menu, "About Crunch 2", Commands.openAbout);
			
			if(!isPlatformMac) {
				addMenuItem(menu, "Check for updates...", function() { Commands.checkForUpdates(true); });
			}
			if(!Settings.v()) {
				addMenuItem(menu, "Upgrade to Pro!", UI.Modals.openPurchase);
				addMenuItem(menu, "Activate Crunch 2 Pro", UI.Modals.showActivationModal);
			}
			menu.append(new gui.MenuItem({ type: 'separator' }));

			addMenuItem(menu, "Twitter", function() { gui.Shell.openExternal("https://twitter.com/GetCrunch"); });
			addMenuItem(menu, "Facebook", function() { gui.Shell.openExternal("https://www.facebook.com/GetCrunch"); });
			
			menu.append(new gui.MenuItem({ type: 'separator' }));
			
			addMenuItem(menu, "Reset Crunch 2 Settings...", function() {
				UI.Modals.open({
					template: 'win/dialog.html'
					, data: {
						title: 'Reset Settings'
						, icon: true
						, text: 'This will wipe all of Crunch 2 settings (including activation). Er, are you sure?' 
						, primary: {
							label: 'Let It Be Done'
						}
						, secondary: {
							label: 'Cancel'
						}
					}
					, events: {
						primaryAction: function() {
							WIPE_SETTINGS = true;
							Commands.exit();
							this.fire('beginTeardown');
						}
						, secondaryAction: function() {
							this.fire('beginTeardown');
						}
					}
					
				});
			});


			addMenuItem(menu, "Report a bug", function() { gui.Shell.openExternal("https://github.com/Crunch/Crunch-2/issues"); });
			
			return menu;
		}

		function createProjectItemMenu() {
			var menu = new gui.Menu();
			var $current;

			menu.append(new gui.MenuItem({
				label: "Remove Folder"
		        , click: function() {
		        	var isOpen = Session.projects.remove($current.data('path'));
		        	UI.ProjectView.update();
		        	if(isOpen) {
		        		UI.Tabs.update(true);
		        	}
		        }
			}));
			$(document).on("contextmenu", '.project', function(e) {
				$current = $(this);
				e.preventDefault();
	    		menu.popup(e.originalEvent.x, e.originalEvent.y);
	    	});
		}

		function createRefreshMenu() {
			var menu = new gui.Menu();

			menu.append(new gui.MenuItem({
				label: "Refresh"
		        , click: function() {
		        	try {
						Process.Watcher.send({ refreshPaths: true }, null, function(err) {
							Messages.add({
								type: 'error'
								, schema: 'node'
								, obj: err.toString()
							});
						});
						Crunch.ua.exception({
							exceptionDescription: 'process: Watcher -- ' + err.toString()
							, av: global.APP_VERSION
						}).send();
					}
					catch(ex) {
						Crunch.ua.exception({
							exceptionDescription: 'process: Watcher -- ' + ex.toString()
							, av: global.APP_VERSION 
						}).send();
		        	}
		        }
			}));
			$(document).on("contextmenu", '.files .scrollable', function(e) {
				e.preventDefault();
	    		menu.popup(e.originalEvent.x, e.originalEvent.y);
	    	});
		}

		function createTabMenu() {
			var $current;
			// var tabMenu = new air.NativeMenu();
			// tabMenu.addEventListener(air.Event.SELECT, selectCommandMenu);

			// addMenuItem(tabMenu, "Close", function() {
			// 	tryCloseTab(selectedTab);
			// });


			// addMenuItem(tabMenu, "Close others", function() {
			// 	$("#tabs .tab-out").each(function(idx, val) {
			// 		if($(this).attr("id") == selectedTab.attr("id")) return;
			// 		tryCloseTab($(this));
			// 	});
			// });	

			// addMenuItem(tabMenu, "Close tabs to the left", function() {
			// 	$("#tabs li.t").each(function() {
			// 		if($(this).attr("id") == selectedTab.attr("id")) return false;
			// 		tryCloseTab($(this));
			// 	});
			// });

			// addMenuItem(tabMenu, "Close tabs to the right", function() {
			// 	$.each($("#tabs .tab-out").get().reverse(), function() {
			// 		if($(this).attr("id") == selectedTab.attr("id")) return false;
			// 		tryCloseTab($(this));
			// 	});
			// });	

			// return tabMenu;		
		}

		


		return {
			editor: editor,
			init : init,
			closeTab : closeTab,
			trySave : trySave,
			openFile : openFile,
			Parser: Parser,
			pendingClose: pendingClose
		};
	}();
	
};	
return Legacy;

});


