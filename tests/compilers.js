assert = require('chai').assert;
path = require('path');
fs = require('fs');

rootAccordPath = 'node_modules/accord';
accord = require(path.join(process.cwd(), rootAccordPath));
require(path.join(process.cwd(), rootAccordPath, 'test/support/all'));

var should = global.should;

var child_process = require('child_process'); 
var compiler = child_process.fork(
  path.join(process.cwd(), 'html/js/compilerProcess.js'),
  { stdio: 'inherit' }
); 

function should_match_expected (engine, results, epath, done) {
  var util = require('util');
  var ext, output, compiler;

  // Special case Sass.js compiler
  if(engine === 'scss') {
    ext = 'scss';
    output = 'css';
  }
  else {
    compiler = accord.load(engine, require('path').join(process.cwd(), 'node_modules'));
    ext = compiler.extensions[0];
    output = compiler.output;
  }

  var expected_path = path.join(
      path.dirname(epath),
      'expected',
      (path.basename(epath)).replace(path.extname(epath), '.') + output
    )

  assert.isOk(fs.existsSync(expected_path));

  var expected = fs.readFileSync(expected_path, 'utf8');

  assert.equal(util.inspect(expected), util.inspect(results));
  return done()
}

function testCompiler(engine, filePath, done, options) {

  var compiler = child_process.fork(
    path.join(process.cwd(), 'html/js/compilerProcess.js'),
    { stdio: 'inherit' }
  ); 

  var listener = function(data) {
    compiler.removeListener('message', listener);
    compiler.send({ exit: true });
    done(data);
  }

  compiler.on('message', listener);
    
  var compilerPayload = {
    engine: engine
    , filePath: filePath
    , options: options
    , outputPath: 'test-out'
  };

  compiler.send(compilerPayload, null, function(err) {
    if(err) {
      console.log('Compiler process err: ' + err);
      done(err);
    }
  });
}

function accord_test(engine, extension, dir, options) {
  if(!dir) dir = engine;

  it('should render a file', function(done) {
    var lpath = path.join(process.cwd(), '../tests/fixtures', dir, 'basic' + extension);

    testCompiler(engine, lpath, function(data) {
      if(data.err) {
        console.log('Err: ', data.err, data.stdout);
        assert.isUndefined(data.err);
        return done();
      }
      return should_match_expected(engine, data.content, lpath, done);
    }, options);
  });
}
function error_test(engine, errMessage, options, line, column) {
  it('should return an error', function(done) {
    var lpath = path.join(process.cwd(), '../tests/errors/' + engine + '.txt');
    if(!require('fs').existsSync(lpath))
      lpath = path.join(process.cwd(), '../tests/errors/bad.txt');
    var errLine = line ? line : 1;
    testCompiler(engine, lpath, function(data) {
      assert.isDefined(data.err);
      if(line !== false)
        assert.equal(data.err.line, errLine);
      if(column !== false)
        assert.equal(data.err.column, column ? column : 1);
      assert.isDefined(data.err.filename);
      assert.isDefined(data.err.message);
      assert.equal(data.err.message, errMessage);
      done();
    }, options);
  });
}

describe('Accord compilers', function() {
  this.timeout(4000);
  describe('Babel', function() {
    accord_test('babel', '.js', 'babel', { presets: ['es2015'] });
    error_test('babel', 'SyntaxError: Unexpected token', { presets: ['es2015'] });
  });

  describe('Buble', function() { it('is not supported'); });

  // Doesn't support line numbers on errors, so ommitting
  // describe('CSJX', function() {
  //   accord_test('coffee-react-transform', '.cjsx', 'cjsx');
  //   error_test('coffee-react-transform', '');
  // });
  describe('CSJX', function() { it('is not supported'); });

  // Coffeescript is already dumb, we don't need more
  describe('Coco', function() { it('is not supported'); });

  describe('CoffeeScript', function() {
    accord_test('coffee-script', '.coffee', 'coffee');
    error_test('coffee-script', 'unmatched )');
  });

  // We only need 3 minifiers. TODO: integrate minifiers!
  describe('CSSO', function() { it('is not supported'); });

  // Doesn't throw proper parse errors and is based on a meme. Bye.
  // describe('DogeScript', function() {
  //   accord_test('dogescript', '.djs');
  //   error_test('dogescript', '');
  // });
  describe('DogeScript', function() { it('is not supported'); });
  
  // // Compiling template languages is not supported
  describe('DoT', function() { it('is not supported'); });
  describe('eco', function() { it('is not supported'); });
  describe('ejs', function() { it('is not supported'); });

  // // No value for Crunch
  describe('escape-html', function() { it('is not supported'); });

  // // Had problems running
  // // describe('HAML', function() {
  // //   accord_test('hamljs', '.haml', 'haml');
  // // });
  describe('haml', function() { it('is not supported'); });

  // describe('handlebars', function() { it('is not supported'); });

  describe('Pug/Jade', function() {
    accord_test('pug', '.jade', 'jade', { foo: 'such options' });
    error_test('pug', 'unexpected text ")&a)""', {}, 1, false);
  });

  describe('JSX', function() {
    accord_test('react-tools', '.jsx', 'jsx');
    error_test('react-tools', 'Unexpected token )');
  });

  describe('Less', function() {
    accord_test('less', '.less');
    error_test('less', 'Unrecognised input. Possibly missing opening \'(\'');
  });

  describe('Livescript', function() {
    accord_test('livescript', '.ls');
    error_test('livescript', 'unmatched `)`', {}, 1, false);
  });

  // Template binding to markdown
  describe('Marc', function() { it('is not supported'); });

  describe('Markdown', function() {
    accord_test('markdown', '.md');
    it('has no thrown errors');
  });

  describe('minify-css', function() {
    accord_test('clean-css', '.css', 'minify-css');
    it('has no thrown errors');
  });

  describe('minify-html', function() {
    accord_test('html-minifier', '.html', 'minify-html');
    error_test('html-minifier', 'Parse Error: <a\n\n<b>\n</c></  <d "wat">', {}, false, false);
  });

  describe('minify-js', function() {
    accord_test('uglify-js', '.js', 'minify-js');
    error_test('uglify-js', 'Unexpected token: punc ())');
  });

  // // Not supported
  describe('mustache', function() { it('is not supported'); });

  
  // Has unsupported C bindings (test again in NW.js>0.15)
  describe('myth', function() { it('is not supported'); });
  // describe('Myth', function() {
  //   accord_test('myth', '.myth');
  // });

  //Nope.
  describe('postcss', function() { it('is not supported'); });

  describe('SCSS', function() {
    accord_test('scss', '.scss');
    error_test('scss', 'Invalid CSS after ")": expected 1 selector or at-rule, was \')&a)"\'');
  });

  describe('Stylus', function() {
    accord_test('stylus', '.styl');
    error_test('stylus', 'unexpected ")"');
  });

  // Other template languages
  describe('swig', function() { it('is not supported'); });
  describe('toffee', function() { it('is not supported'); });

  // Really want to support, but the library it depends on is really old
  // We'll get to it later
  // describe('Typescript', function() {
  //   accord_test('typescript-compiler', '.ts', 'typescript');
  //   error_test('typescript-compiler', '');
  // });
  describe('Typescript', function() { it('is not (yet) supported'); });
});

describe('TODO Compiler Tests', function() {
  describe('Compiler Tests', function() {
    it('assert compilers supported in Crunch are listed as supported in tests');
    it('assert supported compilers have default settings');
    it('assert settings are usable? Not sure how to test?');
    it('assert proper compilers generate source maps')
  });
  describe('App Tests', function() {
    it('can load settings from session');
    it('can switch projects');
    it('can check for updates');
  });
});


describe('base functions', function() {
  it('supports should work', function() {
    assert.isOk(accord.supports('jade'));
    assert.isOk(accord.supports('markdown'));
    assert.isOk(accord.supports('marked'));
    // Should fail
    return assert.isNotOk(accord.supports('blargh'));
  });
  
});
