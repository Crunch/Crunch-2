var path = require('path');
var node_modules = path.join(process.cwd(), 'node_modules');

process.on('message', function(data) {
	try {
		accord = require(path.join(process.cwd(), './node_modules/accord'));
		jade = accord.load('jade', node_modules);
		console.log('Rendering file...');
		jade.renderFile(path.join(process.cwd(),'../tests/fixtures/jade/basic.jade')).then(function(res) {
			process.send(res);
		}, function(err) {
			process.send(err);
		});
	}
	catch(ex) {
		console.log(ex.stack);
		process.send(ex);
	}

});
