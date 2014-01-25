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
		update: function() {
			localStorage.setObject("sessionState", this.state);
		}
	};
	Session.state = localStorage.getObject("sessionState");
	
	// open files data model
	var openFiles = [
		{
			activeIndex: 0
			, project: [
				{  // activeIndex == 0 therefore the "LESS" tab is active
					type: "LESS"
					, name: "style.less"
					, path: "/foo/bar/"
				}
				, {
					type: "CSS"
					, output: true
					, name: "style.css"
					, path: "/foo/bar/"
				}
				, {
					type: "LESS"
					, name: "mixins.less"
					, path: "/foo/bar/"
				}
			]
		}
		, {
			activeIndex: 1  // activeIndex == 0 therefore the "CSS" tab is active
			, project: [
				{
					type: "LESS"
					, name: "bootstrap.less"
					, path: "/bar/foo/"
				}
				, {
					type: "CSS"
					, output: true
					, name: "bootstrap.css"
					, path: "/bar/foo/"
				}
				, {
					type: "LESS"
					, name: "mixins.less"
					, path: "/bar/foo/"
				}
			]
		}
		, {
			activeIndex: 0  // activeIndex == 0 therefore the "CSS" tab is active
			, project: [
				{
					type: "COFFEE"
					, name: "thisIsALongFileName.coffee"
					, path: "/coffee/"
				}
				, {
					type: "JS"
					, output: true
					, name: "thisIsALongFileName.js"
					, path: "/js/"
				}
			]
		}
		, {
			activeIndex: 0  // activeIndex == 0 therefore the "CSS" tab is active
			, project: [
				{
					type: "COFFEE"
					, name: "thisIsALongFileName.coffee"
					, path: "/coffee/"
				}
				, {
					type: "JS"
					, output: true
					, name: "thisIsALongFileName.js"
					, path: "/js/"
				}
			]
		}
	];
	return Session;
});
