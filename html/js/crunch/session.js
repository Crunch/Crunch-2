def(function() {
	// Modify storage for localStorage JSON retrieval
	// http://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage
	Storage.prototype.setObject = function(key, value) {
	    this.setItem(key, JSON.stringify(value));
	};
	
	Storage.prototype.getObject = function(key) {
	    var value = this.getItem(key);
	    return value && JSON.parse(value);
	};
	
	// Load previous session
	var Session = {
		set: function(key, value) {
			this.state[key] = value;
			localStorage.setObject("sessionState", this.state);
		}
	};
	Session.state = localStorage.getObject("sessionState");
	
	// open files data model... VERY MUCH WIP
	
	if(Session.state === null) {
		Session.state = {};
	}
	else {
		console.log('loaded from session!');
		console.log(Session.state);
	}
	Session.set("openProjects", {
		// Only the first project in this object is visible in the sidebar.
		// See Google documentation on how this will work
		"/site1/": {
			fileSystem: 'node'  // What filesystem plugin are we using to load this?
			, files: [{
				activeIndex: 0 // activeIndex == 0 therefore the "LESS" tab is active
				, collection: [
				// we have an explicit type property because we may want to "cast" a file as a certain type
				// note: paths are relative to the project root to avoid redundant storage
					{ type: "less", name: "style.less", path: "bar/" }  
					// the output property creates the "mini" tab association, amongst other things 
					, { type: "css", output: true, name: "style.css", path: "bar/" }
					, { type: "less", name: "mixins.less", path: "bar/" }
				]
			}
			, {
				activeIndex: 1 // therefore the "CSS" mini tab is active
				, collection: [
					{ type: "less", name: "bootstrap.less", path: "less/" }
					, { type: "css", output: true, name: "bootstrap.css", path: "less/" }
					, { type: "less", name: "mixins.less", path: "less/" }
				]
			}
			, {
				activeIndex: 0 
				, collection: [ { type: "coffee", name: "thisIsALongFileName.coffee", path: "" }
					, { type: "js", output: true, name: "thisIsALongFileName.js", path: "js/"}
				]
			}
			, { activeIndex: 0, collection: [{ type: "txt", name: "plain.txt", path: "" }] }
			]
		} , "/site2/": {

			// ...
		}
	});
	return Session;
});
