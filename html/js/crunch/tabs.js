def(['lib/lodash', 'crunch/core', 'text!template/tab.html'], function(_, Crunch, tab) {
	Crunch.UI.Tabs = (function() {
		
		// Create a new tab
		function newTab() {

		}
		return {
			"new": newTab
		}
	})();

	return Crunch.UI.Tabs;
});