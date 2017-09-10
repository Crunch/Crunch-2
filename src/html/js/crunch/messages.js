define(['lib/lodash'], function(_) {

	var Messages = {
		all: []
		, add: function(type, msg) {
			Messages.all.push({ type: type, msg: msg });
			console.log(type, msg);
		}
		, Events: {
			listeners: []
			, subscribe: function(func) {
				Messages.Events.listeners.push(func);
			}
			, publish: function(event) {
				_.each(Messages.Events.listeners, function(func) {
					func(event);
				});
			}
		}
	};
	return Messages;
});
