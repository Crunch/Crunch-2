def(function() {
	var Files = {
		compilers: {},
		registerCompiler: function(extensions) {
			_.forEach(extensions, function(val, key) {
				// TODO: We need to attach compiler interfaces to file extensions
				// That way, we can surface that in the UI.
				// e.g. If you open a .less file, we should be able to tell which compilers
				// can compile it. For .less, there's one. For .js, there may be multiple

				// if(!Files.compilers[ext]) {
				// 	Files.compilers[ext] = [];
				// }
				// Files.compilers[ext].push()
			});
			
		},
	};
	
	
	return Files;
});