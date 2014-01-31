def(['lib/lodash', 'text!template/tabs.html', 'Ractive'], function(_, tabs, Ractive) {
	var Tabs = function() {
		
		// Create the tabs
		// very much WIP, likely to change
		this.topTabs = null;
	};
	Tabs.prototype.create = function(Crunch) {
		Crunch.Session.state.openFiles.maxLength = function(collection) {
			var nameLength = 0;
			_.forEach(collection, function(fileObj, key) {
				if(fileObj.name.length > nameLength)
					nameLength = fileObj.name.length;
			});
			var minLength = (nameLength * 11) + 20;
			if(minLength > 220)
				minLength = 220;
			return minLength + 'px';
		};  // TODO: this should get moved later into the file model


		var ractive = new Ractive({
			el: document.getElementById('tabs')
			, template: tabs
			, magic: false // auto-update when the model changes.. doesn't work?
			, data: Crunch.Session.state.openFiles  // hmm... we need to validate files first
		});
		ractive.on({
			activate: function(event) {
				ractive.set({ activeTabIndex: event.index.i });
			}
			, select: function(event) {
				ractive.set("files." + event.index.i + ".activeIndex", event.index.j);
			}
			, flipup: function(event) {
				if(ractive.data.activeTabIndex == event.index.i)
					ractive.set(event.keypath + ".flipped", true);
			}
			, flipdown: function(event) {
				ractive.set(event.keypath + ".flipped", false);
			}
		});
		this.topTabs = ractive;
		console.log(this.topTabs);


		// FOR TESTING!
		var button = new Ractive({
			el: document.getElementById('newtab')
			, template: '<button on-click="doSomething">Create Tab!</button>'
		});
		button.on({
			doSomething: function(event) {
				Crunch.Session.state.openFiles.files.unshift({
					project: 0
					, activeIndex: 0 
					, hasCompiler: true  
					, crunchable: true 
					, flipped: false 
					, collection: [
						{ type: "less", name: "newProject.less", path: "new/" }  
						, { type: "css", output: true, name: "newProject.css", path: "new/" }
						, { type: "less", name: "bootstrap.less", path: "new/" }
						, { type: "less", name: "variables.less", path: "new/" }
						, { type: "less", name: "mixins.less", path: "new/" }
						, { type: "less", name: "grid.less", path: "new/" }
					]
				});
				// huh, Ractive doesn't seem to update in magic mode...
				ractive.update();
			}
		});
		

	};
	Tabs.prototype.update = function() {
		
	};

	return new Tabs;
});