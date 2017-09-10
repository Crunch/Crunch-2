define(['lib/lodash'], function(_) {

	var baseView = function() {
		return {
			_eventQueue: []
			, on: function(events) {
				if(this.ractive) {
					this.ractive.on(events);
				}
				else {
					this._eventQueue.push(events);
				}
			}
		};
	};
	return baseView;
});