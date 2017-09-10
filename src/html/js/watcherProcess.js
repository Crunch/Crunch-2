"use strict";

var filewatcher = require('filewatcher')
	, watcher = filewatcher()
	, filePaths = new Map()
	, dirPaths = new Map()
	, watchPaths
	, Path = require('path');

function refreshPaths() {
	dirPaths.forEach(function(keypath, file) {
		try {
			process.send({ event: 'update', path: file, keypath: keypath });
		}
		catch(ex) {}
	});
}

watcher.on('change', function(file, stat) {
	
	var changeType;
	if (!stat)
		changeType = 'delete';
	else
		changeType = 'update';

	//console.log('File modified: %s', file, changeType);

	if(dirPaths.has(file)) {
		try {
			process.send({ event: changeType, path: file, keypath: dirPaths.get(file), stat: stat, type: 'dir' });
		}
		catch(ex) {
			process.exit();
			return;
		}
	}
	else {
		try {
			process.send({ event: changeType, path: file, stat: stat, type: 'file' });
		}
		catch(ex) {
			process.exit();
			return;
		}
	}

	
	//if (!stat) console.log('deleted');
});

watcher.on('fallback', function(limit) {
	console.log('Ran out of file handles after watching %s files.', limit);
	console.log('Falling back to polling which uses more CPU.');
	console.log('Run ulimit -n 10000 to increase the limit for open files.');
});

console.log('Booting Watcher process...');
process.on('exit', function() {
	
	console.log('Stop watching our paths');
    clearWatchers();
});

function clearWatchers(type) {
	console.log('Clearing ' + type + ' watchers...');

	if(!type) {
		watcher.removeAll();
		dirPaths.clear();
		filePaths.clear();
	}
	else {
		if(type === 'dir') {
			for(let item of dirPaths) {
				if(item[1] !== null)
					watcher.remove(item[1]);
			}
			dirPaths.clear();

		}
		else if(type === 'file') {
			for(let item of filePaths) {
				if(item[1] !== null)
					watcher.remove(item[1]);
			}
			filePaths.clear();
		}
	}

    console.log('Watchers cleared...');
}

function addPath(watchCollection, val, keypath) {
	if(!watchCollection.has(val)) {
		try {
			watcher.add(val);
			//console.log('Watching... '+val);
			watchCollection.set(val, keypath);
			if(watchCollection === filePaths) {
				var parent = Path.join(val, '..');
				if(!dirPaths.has(parent)) {
					watcher.add(parent);
					//console.log('Watching parent... '+parent);
				}
			}
			
		}
		catch(ex) {
			console.log(ex);
		}
	}
}

process.on('message', function(data) {

	if(data.refreshPaths) {
		return refreshPaths();
	}

	if(data.unwatch) {
		clearWatchers('dir');
		return;
	}
	
	if(data.watcher === 'dir') {
		watchPaths = dirPaths;
	}
	else {
		watchPaths = filePaths;
	}

	if(Array.isArray(data.path)) {
		data.path.forEach(function(val) {
			addPath(watchPaths, val, data.keypath);
		});
	}
	else {
		addPath(watchPaths, data.path, data.keypath);
	}

});


