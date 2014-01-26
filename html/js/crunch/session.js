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
	Session.set("openApps", {
		"/site1/": {
			files: [{
				activeIndex: 0 // activeIndex == 0 therefore the "LESS" tab is active
				, collection: [
					{ type: "LESS", name: "style.less", path: "bar/" }
					, { type: "CSS", output: true, name: "style.css", path: "bar/" }
					, { type: "LESS", name: "mixins.less", path: "bar/" }
				]
			}
			, {
				activeIndex: 1 // therefore the "CSS" tab is active
				, collection: [
					{ type: "LESS", name: "bootstrap.less", path: "less/" }
					, { type: "CSS", output: true, name: "bootstrap.css", path: "less/" }
					, { type: "LESS", name: "mixins.less", path: "less/" }
				]
			}
			, {
				activeIndex: 0 
				, collection: [ { type: "COFFEE", name: "thisIsALongFileName.coffee", path: "" }
					, { type: "JS", output: true, name: "thisIsALongFileName.js", path: "js/"}
				]
			}
			, { activeIndex: 0, collection: [{ type: "TXT", name: "plain.txt", path: "" }] }
			]
		} , "/site2/": {

			// ...
		}
	});
	return Session;
});
