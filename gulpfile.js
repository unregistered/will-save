var gulp = require('gulp');
var clean = require('gulp-clean');
var es = require('event-stream');
var fs = require('fs');
var rseq = require('gulp-run-sequence');
var zip = require('gulp-zip');
var shell = require('gulp-shell');
var chrome = require('./vendor/chrome/manifest');
var firefox = require('./vendor/firefox/manifest');
var browserify = require('browserify');
var gutil = require('gulp-util');
var tsify = require('tsify');
var factor = require('factor-bundle');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var merge = require('multistream-merge');
var uglify = require('gulp-uglify');

function pipe(src, transforms, dest) {
  if (typeof transforms === 'string') {
    dest = transforms;
    transforms = null;
  }

  var stream = gulp.src(src);
  transforms &&
    transforms.forEach(function(transform) {
      stream = stream.pipe(transform);
    });

  if (dest) {
    stream = stream.pipe(gulp.dest(dest));
  }

  return stream;
}

function bundle(debugMode) {
  var TS_SOURCE_DIR = './ts/';
  var BUILD_DEST_DIR = './build/artifacts/';

  var srcFileNames = fs.readdirSync(TS_SOURCE_DIR).filter(e => /\.ts$/.test(e));
  var srcFilePaths = srcFileNames.map(fname => TS_SOURCE_DIR + fname);
  var destFileNames = srcFileNames.map(fname => fname.replace(/\.ts$/, '.js'));

  var destStreams = destFileNames.map(f => source(f));

  var b = browserify({
    entries: srcFilePaths,
    debug: debugMode,
    // Any packages that don't use require() can be added here for a speed boost
    noParse: ['jquery', 'lodash'].map(p => require.resolve(p)),
    cache: {},
    packageCache: {}
  });

  var commonStream = b
    .plugin(tsify)
    .plugin('factor-bundle', { o: destStreams })
    .bundle()
    .pipe(source('lib.js'))
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .on('log', gutil.log.bind(gutil, 'Browserify Log'));

  var stream = merge.obj(destStreams.concat(commonStream)).pipe(buffer());

  if (!debugMode) {
    stream = stream.pipe(uglify());
  }

  return stream.pipe(gulp.dest(BUILD_DEST_DIR));
}

gulp.task('clean', function() {
  return pipe('./build', [clean()]);
});

gulp.task('bundle', function() {
  return bundle(true);
});

gulp.task('bundle-release', function() {
  return bundle(false);
});

gulp.task('chrome', ['bundle'], function() {
  return es.merge(
    pipe('./build/artifacts/*.js', './build/chrome/js'),
    pipe('./img/**/*', './build/chrome/img'),
    pipe('./css/**/*', './build/chrome/css'),
    pipe('./html/**/*', './build/chrome/html'),
    pipe('./vendor/chrome/manifest.json', './build/chrome/')
  );
});

gulp.task('firefox', ['bundle'], function() {
  return es.merge(
    pipe('./build/artifacts/*.js', './build/firefox/js'),
    pipe('./img/**/*', './build/firefox/img'),
    pipe('./css/**/*', './build/firefox/css'),
    pipe('./html/**/*', './build/firefox/html'),
    pipe('./vendor/firefox/manifest.json', './build/firefox/')
  );
});

gulp.task('safari', function() {
  return es.merge(
    pipe('./build/artifacts/*.js', './build/safari/willsave.safariextension/js'),
    pipe('./img/**/*', './build/safari/willsave.safariextension/img'),
    pipe('./css/**/*', './build/safari/willsave.safariextension/css'),
    pipe('./html/**/*', './build/safari/willsave.safariextension/html'),
    pipe('./vendor/safari/Info.plist', './build/safari/willsave.safariextension'),
    pipe('./vendor/safari/Settings.plist', './build/safari/willsave.safariextension')
  );
});

gulp.task('chrome-dist', function() {
  gulp
    .src('./build/chrome/**/*')
    .pipe(zip('chrome-extension-' + chrome.version + '.zip'))
    .pipe(gulp.dest('./dist/chrome'));
});

gulp.task('firefox-dist', function() {
  gulp
    .src('./build/firefox/**/*')
    .pipe(zip('firefox-extension-' + firefox.version + '.zip'))
    .pipe(gulp.dest('./dist/chrome'));
});

gulp.task('safari-dist', function() {
  pipe('./vendor/safari/Update.plist', './dist/safari');
});

gulp.task('firefox-run', shell.task(['cd ./build/firefox && ../../tools/addon-sdk-1.16/bin/cfx run']));

gulp.task('dist', function(cb) {
  return rseq('clean', ['chrome', 'firefox', 'safari'], ['chrome-dist', 'firefox-dist', 'safari-dist'], cb);
});

gulp.task('watch-firefox', ['clean', 'firefox'], function() {
  gulp.watch(['./js/**/*', './ts/**/*', './css/**/*', './vendor/**/*', './img/**/*', './html/**/*'], ['firefox']);
});

gulp.task('watch-chrome', ['clean', 'chrome'], function() {
  gulp.watch(['./js/**/*', './ts/**/*', './css/**/*', './vendor/**/*', './img/**/*', './html/**/*'], ['chrome']);
});

gulp.task('run', function(cb) {
  return rseq('firefox', 'firefox-run', cb);
});

gulp.task('addons', shell.task(['cp -R ./dist ../addons']));

gulp.task('default', function(cb) {
  return rseq('clean', ['chrome', 'firefox', 'safari'], cb);
});
