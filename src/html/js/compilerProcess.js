
var accord = require('accord');
var fs = require('./fs');
var Hook = require('hook-stdio');

//  Setup up a little container variable for stderr/stdout.
var messages = [];

//  Intercept messages passed to the stderr pipe and add them to the array of errors.

function addMessage(data) {
	if(data) messages.push(data);
}

var files;

//console.log('Booting compiler process...');

var unhookerr = Hook.stderr(addMessage, true);
var unhookout = Hook.stdout(addMessage, true);

process.on('message', function(data) {

try {

	messages = [];

	fs.resetFiles();

	var options;
	if(data.exit) {
		process.exit();
	}
	if(data.options) {
		options = JSON.parse(JSON.stringify(data.options));
	}
	else {
		data.options = options = {};
	}
	if(data.engine === 'babel') {
		if(options.presets) {
			var es2015 = require('babel-preset-es2015');
			options.presets = [es2015];
		}
	}

	// TODO: How do we do this in other accord adapters?
	// options.sourceMap = { sourceMapFullFilename: Path.basename(data.outputPath)+'.map' }
	
	// Accord expects / requires only a boolean true for options.sourcemap
	if(options.sourceMap) {
		options.sourcemap = true;
	}

	if(data.engine === 'scss') {
		var Sass = require('sass.js');
		var FS = fs;  // require('fs')
		var contents = FS.readFileSync(data.filePath, { encoding: 'utf8' });

		options.inputPath = data.filePath;

		var path = require('path');
		var root = path.parse(data.filePath);

		Sass.importer(function(request, done) {
			var resolved, stats;	

			function handleRead(err, data) {
				if(err) {
					done({ error: 'Import failed. File read error.' });
				}
				else {
					done({
						content: data
						, path: resolved
					});
				}
			}
			function tryFile(resolved) {
				try {
					stats = FS.statSync(resolved);
					if(stats && !(stats.isDirectory())) {
						FS.readFile(resolved, { encoding: 'utf8' }, handleRead);
						fs.addFile(resolved);
						return true;
					}
					return false;
				}
				catch(e) {
					return false;
				}
			}

			if(request.path) {
				done();
			} else if (request.resolved) {
				try {
					if(request.previous.indexOf(path.sep) === 0) {
						resolved = request.resolved;
					}
					else {
						resolved = path.resolve(root.dir, request.previous, '..' + path.sep + request.current);
					}
					if(!tryFile(resolved)) {
						resolved = resolved + '.scss';
						if(!tryFile(resolved)) {
							var obj = path.parse(resolved);
							resolved = obj.dir + '/_' + obj.base;
							if(!tryFile(resolved)) {
								done({
									error: 'Import failed. No match.'
								});
							}
						}
					}
				}
				catch(ex) {
					console.log('Failed');
					done({
						error: 'Import failed.'
					});
				}
			} else if (request.current === 'error') {
				// provide content directly
				// note that there is no cache
				done({
					error: 'Import failed.'
				});
			} else {
				// let libsass handle the import
				done();
			}
			
			//done();
		});

		Sass.compile(contents, options, function(result) {
			if(result.status === 0) {
				process.send({ 
					content: result.text
					, sourcemap: result.map
					, engine: data.engine
					, filePath: data.filePath
					, outputPath: data.outputPath
					, options: data.options 
					, files: fs.getFiles()
					, stdout: messages
				});
			}
			else {
				process.send({ 
					engine: data.engine
					, raw: result
					, err: errorFormatter(data, result) 
					, filePath: data.filePath
					, stdout: messages
				});	
			}
		});
	}	
	else {
		var tmpPath = require('path').join(process.cwd(), 'node_modules');
		var adapter = accord.load(data.engine, tmpPath);
		
		adapter.renderFile(data.filePath, options).then(
			function(res) {
				files = fs.getFiles();

				if(files.indexOf(data.filePath) > -1) {
					files.splice(files.indexOf(data.filePath), 1);
				}
				process.send({ 
					raw: res
					, content: res.result
					, sourcemap: res.sourcemap
					, engine: data.engine
					, filePath: data.filePath
					, outputPath: data.outputPath
					, options: data.options 
					, files: files
					, stdout: messages
				});
			}
			, function(err) {

				var obj = errorFormatter(data, err);
				var rawErr = {};
				for(var i in err) {
					if(err.hasOwnProperty(i)) {
						rawErr[i] = String(err[i]);
					}
				}
				process.send({ 
					engine: data.engine
					, err: obj
					, rawErr: rawErr
					, filePath: data.filePath
					, stdout: messages
				});
			});
	}
}
catch(ex) {
	console.log(ex.stack);
	process.send({ 
		engine: data.engine
		, err: { message: 'Application error: ' + ex.message }
		, rawErr: String(ex.stack)
		, filePath: data.filePath
	});
}
});


function errorFormatter(data, err) {
	var engine = data.engine;
	switch (engine) {
		case 'babel':
			var raw = String(err);
			raw = raw.substr(0, raw.indexOf('(')-1).replace(data.filePath + ': ', '');
			return {
				message: raw
				, filename: data.filePath
				, line: err.loc.line
				, column: err.loc.column + 1
			}
			break;
		case 'csso':
			var raw = String(err);
			return {
				message: raw
				, filename: data.filePath
				, line: err.parseError.line
				, column: err.parseError.column
			}
		case 'react-tools':  // JSX
			return {
				message: err.description
				, filename: data.filePath
				, line: err.lineNumber
				, column: err.column
			}
			break;
		case 'less':
			return {
				message: err.message
				, filename: err.filename
				, line: err.line
				, column: err.column + 1
			}
			break;
		case 'scss':
			return {
				message: err.message
				, filename: err.file
				, line: err.line
				, column: err.column
			};
			break;
		case 'pug':
			var re = /(.+):([0-9]+)(?:.*\n)+\n(.*)/;
			var matches = err.message.match(re);
			if(matches && matches.length > 0) {
				return { 
					message: matches[3]
					, filename: matches[1]
					, line: parseInt(matches[2])
				};
			}
			else {
				return { matches: matches };
			}
			
			break;
		case 'coffee-script':
			var re = /error:\s(.+)\n/i;
			var matches = err.toString().match(re);

			return {
				message: matches[1]
				, filename: err.filename
				, line: err.location.first_line + 1  // lines are zero-based
				, column: err.location.first_column + 1
			}
			break;
		case 'livescript':
		case 'LiveScript':
			var re = /(.+)\s.+line\s([0-9]+)\nat\s(.+)/;
			//var re = /line\s([0-9]+):\s(.+)\nat\s(.+)/; (old format)
			var matches = err.message.match(re);
			return {
				message: matches[1]
				, filename: matches[3]
				, line: parseInt(matches[2])
			};
			break;
		case 'marked':
			// Is it possible to trigger errors in markdown?
			break;
		case 'html-minifier':
			return {
				message: err.message
				, filename: data.filePath
			};
			break;
		case 'uglify-js':
			return {
				message: err.message
				, filename: data.filePath
				, line: err.line
				, column: err.col + 1
			};
			break;
		case 'stylus':
			var re = /(.+):([0-9]+):([0-9]+)(?:.*\n)+\n(.*)/;
			var matches = err.message.match(re);

			if(matches && matches.length > 0) {
				return { 
					matches: matches
					, message: matches[4]
					, filename: matches[1]
					, line: parseInt(matches[2])
					, column: parseInt(matches[3]) - 1
				};
			}
			else {
				return { matches: matches };
			}
			break;
		default:
			console.log(err);
			return { message: String(err) };

	}
}
