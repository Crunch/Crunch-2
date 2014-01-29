def(function() {
	var interface = {
		settings: {
			namespace: 'less',
			require: ["less-1.6.0.js"],
			input: ["less"],
			output: ["css"],
			supports: {
				crunchable: true,  // means it is a "project"
			},
		},
		init: function() {}
	};
	
	return interface;
});