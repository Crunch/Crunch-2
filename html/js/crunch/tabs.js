def(['lib/lodash', 'crunch/core', 'text!template/tab.html'], function(_, Crunch, tab) {
	Crunch.UI.Tabs = (function() {
		
		// Create a new tab
		// very much WIP, likely to change
		function newTab(data) {
			var defaults = {
				tabActive: true
				, hasCompiler: true
				, minis: [
					// Will we ever need more than 2 minis? 
					{
						name: "LESS"
						, type: "i"  //input
						, filepath: ""
					}
					, {
						name: "CSS"
						, type: "o"  //output
						, filepath: ""
					}
				]
				, activeMiniIndex: 0
			};
			
			var ractive = new Ractive({
				el: container
				, template: tab
				, data: data
				
			});
			return ractive;
		}
		return {
			"new": newTab
		}
	})();

	return Crunch.UI.Tabs;
});