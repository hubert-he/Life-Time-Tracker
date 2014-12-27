var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var reactify = require('reactify');
var watchify = require('watchify');
var watch = require('gulp-watch');
var notify = require("gulp-notify");
var react = require("gulp-react");
var scriptsDir = './';
var buildDir = './build';
var inject = require("gulp-inject");
var rename = require('gulp-rename');
var NwBuilder = require('node-webkit-builder');

function handleErrors(err) {
    var args = Array.prototype.slice.call(arguments);
    notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);
    gutil.log(err.message);
    this.emit('end'); // Keep gulp from hanging on this task
}


var main = "boot.js";
var mainDestFile = 'bundle.js';
var jsDestDir = buildDir;

// Based on: http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
function buildScript(scriptsDir, main, destFile, buildDir, watch) {
    var props = {
        entries: [scriptsDir + '/' + main],
        debug: true
    };
    var bundler = watch ? watchify(browserify(props)) : browserify(props);
    bundler.transform(reactify);

    function rebundle() {
        var stream = bundler.bundle();
        return stream.on('error', handleErrors)
            .pipe(source(destFile))
            .pipe(gulp.dest(buildDir))
            .pipe(gulp.dest(scriptsDir));
    }
    bundler.on('update', function() {
        rebundle();
        gutil.log('File Update, Rebundle...');
    });
    return rebundle();
}

gulp.task('buildHTML', function() {
    gutil.log('Watching html file...');
    var htmlFile = './index.src.html';
    var appResources = [
        './nw/initNW.js',
        './bundle.js',
        './css/lib/normalize.css',
        './css/lib/**/*.css',
        './css/ltt.css',
        './css/main.css',
        './css/**/*.css',
    ];
    injectScript(gulp.src(htmlFile), appResources, 'index.html', buildDir);
    gulp.watch(htmlFile, function () {
        var target = gulp.src(htmlFile);
        injectScript(target, appResources, 'index.html', buildDir);
    });

    var addLogHTML = './node_modules/ltt-addLog/index.html',
        addLogResources = [
            './node_modules/ltt-addLog/addLog.js',
            './css/**/*.css'
        ];

    injectScript(gulp.src(addLogHTML), addLogResources, 'addLog.html', buildDir);
    gulp.watch(addLogHTML, function () {
        var target = gulp.src(addLogHTML);
        injectScript(target, addLogResources, 'addLog.html', buildDir);
    });


    function injectScript(file, resources, destFile, buildDir) {
        gutil.log('Rebuild ' + destFile + ' file...');
        var sources = gulp.src(resources, {
            read: false
        });
        return file.pipe(inject(sources, {relative: true}))
            .pipe(rename(destFile))
            .pipe(gulp.dest(buildDir))
            .pipe(gulp.dest('./build'));
    }
});


//sync resources file
gulp.task('sync', function() {
    gutil.log('Watching file...');
    gulp.src([
        './bower_components/bootstrap/dist/css/bootstrap.css',
        './bower_components/bootstrap/dist/css/bootstrap-theme.css',
        './bower_components/jquery-ui/jquery-ui.css'
    ]).pipe(gulp.dest('./css/lib'));
    gulp.src([
        './bower_components/jquery-ui/jquery-ui.js'
    ]).pipe(gulp.dest('./libs'));

    gulp.src([
        './node_modules/lodash/**/*',
    ]).pipe(gulp.dest('./build/node_modules/lodash/'));

    gulp.src([
        './node_modules/moment/**/*',
    ]).pipe(gulp.dest('./build/node_modules/moment/'));

    gulp.src([
        './node_modules/ltt-nw/**/*',
    ]).pipe(gulp.dest('./build/node_modules/ltt-nw/'));

    var cssFiles = './css/**/*.css',
        images = './images/**/*',
        fonts = './fonts/**/*',
        lttNw = './node_modules/ltt-nw/**/*',
        index = './index.html',
        js = './nw/**/*.js';
    gulp.src(cssFiles)
        .pipe(watch(cssFiles, function(files) {
            return files.pipe(gulp.dest([buildDir, 'css/'].join('/')));
        }));

    gulp.src(lttNw)
        .pipe(watch(lttNw, function (files) {
            return files.pipe(gulp.dest([buildDir, 'node_modules/ltt-nw'].join('/')));
        }));
    gulp.src(images)
        .pipe(watch(images, function(files) {
            return files.pipe(gulp.dest([buildDir, 'images/'].join('/')));
        }));
    gulp.src(js)
        .pipe(watch(js, function(files) {
            return files.pipe(gulp.dest(buildDir + '/nw/'));
        }));
    gulp.src(index)
        .pipe(watch(index, function(file) {
            return file.pipe(gulp.dest(buildDir));
        }));
    return gulp.src(fonts)
        .pipe(watch(fonts, function(files) {
            return files.pipe(gulp.dest([buildDir, 'fonts/'].join('/')));
        }));
    //.pipe(minifyCSS({
    //    keepBreaks: true
    //}))
    //.pipe(concat('main.css'))
    /*.pipe(rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify({
        message: 'CSS压缩完成'
    }));*/
});

var addLogScriptDir = './node_modules/ltt-addLog';
var addLogMain = 'app.js';
var addLogDest = 'addLog.js';
gulp.task('build', function() {
    buildScript(addLogScriptDir, addLogMain, addLogDest, jsDestDir, false);
    return buildScript(scriptsDir, main, mainDestFile, jsDestDir, false);
});


gulp.task('nw', function () {
    var nw = new NwBuilder({
        files: [ './build/**/**'],
        platforms: ['osx64'],
        buildDir: './production'
    });
    // Log stuff you want
    nw.on('log', function (msg) {
        gutil.log('node-webkit-builder', msg);
    });
    // Build returns a promise, return it so the task isn't called in parallel
    return nw.build().then(function () {
       console.log('build nw all done!');
    }).catch(function (error) {
        gutil.log('node-webkit-builder', error);
    });
});


gulp.task('default', ['build'], function() {
    buildScript(addLogScriptDir, addLogMain, addLogDest, jsDestDir, true);
    return buildScript(scriptsDir, main, mainDestFile, jsDestDir, true);
});