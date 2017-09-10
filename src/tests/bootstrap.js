
var fs = require('fs');


var process = require('child_process');	
var compiler = process.fork('../html/js/compilerProcess.js'); 

var Crunch = {
	Settings: require('../html/js/crunch/settings')
	, Files: require('../html/js/crunch/files')
	, Supports: require('../html/js/crunch/supports')
	, Process: {
		Watcher: watcher
		, Compiler: compiler
	}
};

module.exports = Crunch;
