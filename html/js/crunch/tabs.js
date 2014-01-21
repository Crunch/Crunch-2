def(['crunch/core', 'text!template/tab.html'], function(Crunch, tab) {
	Crunch.UI.Tabs = (function() {
		
		function newTab() {

		}
		return {
			"new": newTab
		}
	})();

	return Crunch.UI.Tabs;
});