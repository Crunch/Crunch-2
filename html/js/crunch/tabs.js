def(['lib/lodash', 'text!template/tabs.html', 'lib/ractive.min'], function(_, tabs, Ractive) {
	var Tabs = function() {
		
		// Create the tabs
		// very much WIP, likely to change
		this.ractive = null;
	};
	Tabs.prototype.create = function(Crunch) {
		var ractive = new Ractive({
			el: document.getElementById('files')
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