var $, manifest, runSequence, shelljs;

var gulp = require('gulp');
var NwBuilder = require('nw-builder');

shelljs = require('shelljs');
runSequence = require('run-sequence');
manifest = require('./package.json');
var srcManifest = require('./src/package.json');

$ = require('gulp-load-plugins')();

gulp.task('clean', function() {
  shelljs.rm('-rf', './opt');
  shelljs.rm('-rf', './build');
  return shelljs.rm('-rf', './dist');
});

var runscripts = false;

gulp.task('scripts', function() {
  if(runscripts) return;
  runscripts = true;

  // var paths = {
  //   scripts: ['./src/html/js/**/*.js', '!./src/html/js/lib/**/*.js']
  // };
  return $.merge(
    gulp.src(['./src/html/js/**/*', '!./src/html/js/crunch/**/*.js', '!./src/tests/**/*'])
      .pipe($.debug({title: 'copy:'}))
      .pipe(gulp.dest('./src/html/dist'))
    , gulp.src(['./src/html/js/crunch/**/*.js'])
      .pipe($.debug({title: 'uglify:'}))
      .pipe($.uglify({ mangle: true }).on('error', $.util.log))
      .pipe(gulp.dest('./src/html/dist/crunch'))
    )
});

['win32', 'osx64', 'linux32', 'linux64'].forEach(function(platform) {
  return gulp.task('build:' + platform, function() {
    if (process.argv.indexOf('--toolbar') > 0) {
      shelljs.sed('-i', '"toolbar": false', '"toolbar": true', './src/package.json');
    }
    var buildDir = './build/Crunch 2/' + platform;

    var sourceFiles = [ './src/**', '!./src/html/js/**' ];
    var dest;

    var nw = new NwBuilder({
        platforms: [platform],
        files: sourceFiles,
        winIco: './assets-windows/favicon.ico',
        macIcns: './assets-osx/icon.icns',
        appName: "Crunch 2",
        version: '0.16.1',
        flavor: 'normal',
        zip: false,
        macPlist: {
          NSHumanReadableCopyright: 'crunch2.com',
          CFBundleIdentifier: 'com.crunch2.crunch2'
        }
    });
    nw.on('log', function(msg) {
      $.util.log('node-webkit-builder', msg);
    })
    // nw.on('end', function() {
      
    // });

    return nw.build().then(function() {
      if (process.argv.indexOf('--toolbar') > 0) {
        return shelljs.sed('-i', '"toolbar": true', '"toolbar": false', './src/package.json');
      }
    }).catch(function (err) {
        $.util.log('node-webkit-builder', err);
    });

  });
});

gulp.task('sign:osx64', ['build:osx64'], function() {
  shelljs.exec('codesign -v -f -s "Developer ID Application" ./build/Crunch\\ 2/osx64/Crunch\\ 2.app/Contents/Versions/52.0.2743.116/*');
  shelljs.exec('codesign -v -f -s "Developer ID Application" ./build/Crunch\\ 2/osx64/Crunch\\ 2.app');
  shelljs.exec('codesign -v --display ./build/Crunch\\ 2/osx64/Crunch\\ 2.app');
  return shelljs.exec('codesign -v --verify ./build/Crunch\\ 2/osx64/Crunch\\ 2.app');
});

gulp.task('pack:osx64', ['sign:osx64'], function() {
  shelljs.mkdir('-p', './dist');
  shelljs.rm('-f', './dist/Crunch2.dmg');
  //shelljs.rm('-rf', './src/html/dist');
  return gulp.src([]).pipe(require('gulp-appdmg')({
    source: './assets-osx/dmg.json',
    target: './dist/Crunch2.dmg'
  }));
});

gulp.task('sign:win32', ['build:win32'], function() {
  shelljs.exec('osslsigncode -pkcs12 "../cert/Authenticode.p12" -pass ' + process.env.CERT_PASS + ' ' +
    '-n "Crunch 2" -i http://getcrunch.co/ ' +
    '-t http://timestamp.verisign.com/scripts/timstamp.dll ' +
    '-in "./build/Crunch 2/win32/Crunch 2.exe" -out "./build/Crunch 2/win32/Crunch 2_signed.exe"');
  shelljs.cp('-rf', "./build/Crunch 2/win32/Crunch 2_signed.exe", "./build/Crunch 2/win32/Crunch 2.exe");
  shelljs.rm('-rf', "./build/Crunch 2/win32/Crunch 2_signed.exe");

  return; 
});

gulp.task('pack:win32', ['sign:win32'], function() {
  shelljs.mkdir('-p', './dist');
  shelljs.rm('-f', './dist/CrunchSetup.exe');
  shelljs.exec('makensis ./assets-windows/installer.nsi');

  shelljs.exec('osslsigncode -pkcs12 "../cert/Authenticode.p12" -pass ' + process.env.CERT_PASS + ' ' +
    '-n "Crunch 2" -i http://getcrunch.co/ ' +
    '-t http://timestamp.verisign.com/scripts/timstamp.dll ' +
    '-in "./dist/CrunchSetup.exe" -out "./dist/CrunchSetup_signed.exe"');
  shelljs.cp('-rf', "./dist/CrunchSetup_signed.exe", "./dist/CrunchSetup.exe");
  shelljs.rm('-rf', "./dist/CrunchSetup_signed.exe");
});

[32, 64].forEach(function(arch) {
  return ['deb', 'rpm'].forEach(function(target) {
    return gulp.task("pack:linux" + arch + ":" + target, ['build:linux' + arch], function() {
      shelljs.rm('-rf', './opt');
      return gulp.src([
          './assets-linux/icon_256.png'
          , './assets-linux/crunch2.desktop'
          , './assets-linux/after-install.sh'
          , './assets-linux/after-remove.sh'
          , './build/Crunch 2/linux' + arch + '/**']).pipe(gulp.dest('./opt/Crunch2')).on('end', function() {
        var output, port;
        port = arch === 32 ? 'i386' : 'amd64';
        output = "./dist/Crunch2_linux" + arch + "." + target;
        shelljs.mkdir('-p', './dist');
        shelljs.rm('-f', output);
        return shelljs.exec("fpm -s dir -t " + target + " -a " + port + " -n Crunch2 --after-install ./opt/Crunch2/after-install.sh --after-remove ./opt/Crunch2/after-remove.sh --category Development --url \"https://crunch2.com\" --description \"The quirky editor and compiler for the web.\" -m \"" + process.env.DEVELOPER + "\" -p " + output + " -v " + manifest.version + " ./opt/Crunch2/");
      });
    });
  });
});

gulp.task('pack:all', function(callback) {
  return runSequence('pack:osx64', 'pack:win32', 'pack:linux32:deb', 'pack:linux64:deb', callback);
});

gulp.task('run:osx64', ['build:osx64'], function() {
  return shelljs.exec('open "./build/Crunch 2/osx64/Crunch 2.app"');
});

gulp.task('open:osx64', function() {
  return shelljs.exec('open "./build/Crunch 2/osx64/Crunch 2.app"');
});

gulp.task('release', function(callback) {
  return gulp.src('./dist/*').pipe($.githubRelease({
    draft: true,
    token: process.env.GITHUB_TOKEN,
    manifest: manifest,
    prerelease: srcManifest.version.indexOf('alpha') > -1 || srcManifest.version.indexOf('beta') > -1,
    tag: 'v' + srcManifest.version,
    repo: 'Crunch-2',
    owner: 'Crunch'
  }));
});

gulp.task('version', function() {
  var version;
  version = process.argv[3].substring(2);
  shelljs.sed('-i', /"version": ".*",/, '"version": "' + version + '",', './package.json');
  shelljs.sed('-i', /"version": ".*",/, '"version": "' + version + '",', './src/package.json');
  return shelljs.sed('-i', /download\/v.*\/Crunch2/g, 'download/v' + version + '/Crunch2', './src/package.json');
});

gulp.task('default', ['pack:all']);
