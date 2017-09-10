

var methods = [
	'stat',
	'readFile',
	'open'
].reduce(function(res, meth) {
  res.push(meth);
  res.push(meth + 'Sync');
  return res;
}, []);

var files = [];

function FS(fsLib) {
	this.lib = require(fsLib);
	this._orig = {};
}
FS.prototype.getFiles = function() {
	return files;
}
FS.prototype.resetFiles = function() {
	files = [];
}

FS.prototype.addFile = function(filename) {
	if(filename.indexOf('node_modules') === -1 && files.indexOf(filename) === -1) {
		files.push(filename);
	}
}
FS.prototype.readFile = function(filename, options, callback) {
	var _this = this;
	try {
		this._orig.readFile.call(this, filename, options, function(err, data) {
			if(!err) {
				_this.addFile(filename);
			}
			callback(err, data);
		});
		this.addFile(filename);
	}
	catch (e) {
		throw e;
	}

};

FS.prototype.readFileSync = function(filename, options) {
	var contents = this._orig.readFileSync.call(this, filename, options);
	if(contents) {
		this.addFile(filename);
	}
	return contents;
};
FS.prototype.createReadStream = function(path, options) {
	this.addFile(path);
	return this._orig.createReadStream.call(this, path, options);
};
FS.prototype.stat = function(filename, callback) {
	var _this = this;
	return this._orig.stat.call(this, filename, function(err, stats) {
		if(!err) {
			_this.addFile(filename);
		}
		callback.call(_this, err, stats);
	});
};

FS.prototype.statSync = function(filename) {
	try {
	    var stats = this._orig.statSync.call(this, filename);
	    if (stats && stats.isFile()) {
	        this.addFile(filename);
	    }
	    return stats;
	}
	catch (e) {
	    throw e;
	}
};

FS.prototype.open = function(path, flags, mode, callback) {
	
	var _this = this;
	try {
		this._orig.open.call(this, path, flags, mode, function(err, data) {
			if(!err) {
				_this.addFile(path);
			}
			callback(err, data);
		});
	}
	catch (e) {
		throw e;
	}
};
FS.prototype.openSync = function(path, flags, mode) {
	var handler = this._orig.openSync.call(this, path, flags, mode);
	this.addFile(path);
	return handler;
};
FS.prototype.patch = function() {
  
  methods.forEach(function(meth) {
    this._orig[meth] = this.lib[meth];
    this.lib[meth] = this[meth].bind(this);
  }, this);

  return this.lib;
}

var Fs = new FS("fs");
Fs.patch();
try {
	var graceful = new FS("graceful-fs");
	graceful.patch();
	Fs = graceful;
}
catch(ex) {}

module.exports = Fs;