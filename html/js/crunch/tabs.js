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
			, magic: true // auto-update when the model changes
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
		this.ractive = ractive;
		console.log(this.ractive);
	};
	Tabs.prototype.update = function() {
		
	};

	return new Tabs;
});