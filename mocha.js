util = require('util')
fs   = require('fs')
path = require('path')
var currentWindow;
//make messages more friendly on the parent process console
hookConsole = function()
  {
    console_log_writer = function(message,args) { process.stdout.write(util.format.apply(this,arguments)+'\n') }
    console.error = console_log_writer
    console.log   = console_log_writer
  }

//get files from tests folder
get_Test_Files = function()
  {
    return fs.readdirSync(path.join(__dirname, 'tests')).filter(function (file)
      {
          console.log('Adding ' + file);
          return file.substr(-3) === '.js';
      });
  }

//queue targetFiles tests
queue_Tests = function(targetFiles)
  {
    targetFiles.forEach(function (file)
    {
      console.log('Queuing ' + file);
      jsFile = path.join(__dirname, 'tests', file);
      jsCode= fs.readFileSync(jsFile, 'utf8');
      new Function('currentWindow', jsCode)(currentWindow);
    })
  }

setup_and_Run_Mocha = function(test_Files)
{
  var Mocha = require('mocha')
  var mocha = new Mocha;
  mocha.suite.emit('pre-require', window, null, mocha);

  queue_Tests(test_Files)
  return mocha.run(function (failures)
    {
      currentWindow.close()
    });
}
module.exports = function(win) {
  currentWindow = win;

  hookConsole()
  var test_Files = get_Test_Files()
  var runner     = setup_and_Run_Mocha(test_Files)
};




//events that can be hooked
//mocha.suite.beforeEach(function() {} )
//mocha.suite.afterEach(function() {} )
//mocha.suite.afterAll( function() {} )

//runner.on('end', function() { console.log(data)})
//runner.on('suite', function(data) { console.log(data)})
//runner.on('fail', function(data) { console.log(data)})
//runner.on('test', function(data) { console.log(data)})