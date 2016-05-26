var gulp = require('gulp');
var rename = require('gulp-rename');
var cleanCSS = require('gulp-clean-css');
var sass = require('gulp-sass');
var rucksack = require('gulp-rucksack');
var livereload = require('gulp-livereload');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var base64 = require('gulp-base64');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var clean = require('gulp-clean');
var filesize = require('gulp-size');
var changed = require('gulp-changed');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserSync = require('browser-sync');
var streamify = require('gulp-streamify');
var riotify = require("riotify");
var browserifyShim = require('browserify-shim');

/* bundleLogger.js */
var prettyHrtime = require('pretty-hrtime');
var startTime;
bundleLogger = {
    start: function() {
        startTime = process.hrtime();
        gutil.log('Running', gutil.colors.green("'bundle'") + '...');
    },

    end: function() {
        var taskTime = process.hrtime(startTime);
        var prettyTime = prettyHrtime(taskTime);
        gutil.log('Finished', gutil.colors.green("'bundle'"), 'in', gutil.colors.magenta(prettyTime));
    }
};

/* handleErrors.js */
var notify = require("gulp-notify");
handleErrors = function() {
    var args = Array.prototype.slice.call(arguments);
    // Send error to notification center with gulp-notify
    notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);

    // Keep gulp from hanging on this task
    this.emit('end');
};
module.exports = bundleLogger;
module.exports = handleErrors;

var libs = [
    "riot"
];

// Bundle app JS files
gulp.task('bundle-app-js', function() {
    var bundler = browserify({
        // Required watchify args
        cache: {},
        packageCache: {},
        fullPaths: true,
        debug: true,

        // Specify the entry point of your app
        entries: ['src/js/app.js'],

        // Add file extentions to make optional in your requires
        extensions: ['.js, .component'],

        // list of transforms
        transform: [riotify, browserifyShim]
    });

    libs.forEach(function(lib) {
        bundler.external(lib);
    });

    var bundle = function() {
        // Log when bundling starts
        bundleLogger.start();

        return bundler
            .bundle()
            // Report compile errors
            .on('error', handleErrors)

        // Use vinyl-source-stream to make the stream gulp compatible. Specifiy the desired output filename here.
        .pipe(source('trivett.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
            .pipe(uglify())
            .on('error', gutil.log)
        .pipe(sourcemaps.write('./'))

        // Specify the output destination
        .pipe(gulp.dest('build/js/'))

        .pipe(filesize({ title: 'trivett.js'} ))

        // Log when bundling completes!
        .on('end', bundleLogger.end);
    };

    if (global.isWatching) {
        bundler = watchify(bundler);

        // Rebundle with watchify on changes.
        bundler.on('update', bundle);
    }

    return bundle();
});

/*  COMPILE SASS  */
gulp.task('compile-sass', function() {
    gulp.src('src/scss/trivett.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'compressed'
        })
        .on('error', sass.logError))
        .pipe(rucksack({
            autoprefixer: true,
            fallbacks: true
        }))
        .pipe(cleanCSS({
            processImport: false,
            keepSpecialComments: 0
        }))
        .pipe(rename('styles.css'))
        // .pipe(base64({
        //     maxImageSize: 8 * 1024,
        //     debug: true
        // }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('build/css'))
        .pipe(filesize({ title: 'styles.css'} ))
        .pipe(livereload());
});

/*  COMPILE VENDOR CSS  */
var vendorCSSFiles = [
    'src/vendors/css/font-awesome.css'
];
gulp.task('compile-vendor-css', function() {
    return gulp.src(vendorCSSFiles)
        .pipe(changed('build/css'))
        .pipe(cleanCSS({
            processImport: false,
            keepSpecialComments: 0
        }))
        .pipe(concat('vendors.css'))
        .pipe(gulp.dest('build/css'))
        .pipe(filesize({ title: 'vendors.css'} ))
        .on('error', gutil.log);
});

/*  CONCAT & MINIFY JS FILES  */
var vendorJSFiles = [
    'src/vendors/js/lodash.js',
    'src/vendors/js/modernizr.js',
    'src/vendors/js/riot.js',
    'src/vendors/js/TweenLite.min.js',
];
var localJSFiles = [
    'src/js/app.js'
];

gulp.task('compile-vendor-js', function() {
    gulp.src(vendorJSFiles)
        .pipe(changed('build/js'))
        .pipe(concat('vendors.js'))
        // .pipe(uglify())
        .pipe(filesize({ title: 'vendors.js'} ))
        .pipe(gulp.dest('build/js'))
        .on('error', gutil.log);
});

/*  OPTIMIZE IMAGES  */
gulp.task('optimize-images', function() {
    return gulp.src('src/images/**/*')
        .pipe(imagemin({
            optimizationLevel: 3,
            progessive: true,
            interlaced: true,
            use: [pngquant()]
        }))
        .pipe(gulp.dest('build/images'));
});

gulp.task('copy-fonts', function() {
    return gulp.src('./src/fonts/**/*.{ttf,woff,woff2,eof,eot,svg}')
        .pipe(gulp.dest('build/fonts'))
});

gulp.task('copy-static-files', function() {
    return gulp.src('./src/assets/others/**/*')
        .pipe(gulp.dest('build/assets/static'))
});

/*  WATCH FILES  */
gulp.task('watch', ['setWatch', 'browserSync'], function() {
    gulp.watch('src/js/**/*', ['bundle-app-js']);
    gulp.watch('src/scss/**/*', ['compile-sass']);

    gulp.watch('src/vendors/js/**/*', ['compile-vendor-js']);
    gulp.watch('src/vendors/css/**/*', ['compile-vendor-css']);

    gulp.watch('src/images/**/*', ['optimize-images']);
    gulp.watch('src/fonts/**/*', ['copy-fonts']);
    gulp.watch('src/others/**/*', ['copy-static-files']);
});

gulp.task('setWatch', function() {
    global.isWatching = true;
});

gulp.task('browserSync', ['build'], function() {
    browserSync.init(
        [
            './src/static/**/*.html',
            './build/css/**/*.css',
            './build/js/**/*.js',
            './build/images/*.{jpg,jpeg,gif,png,svg}'
        ],
        {
            server: {
                baseDir: './',
                index: './src/static/index.html',
                serveStaticOptions: {
                    extensions: ['html']
                },
                routes: {
                    "/content-page":     './src/static/content.html',
                    "/riot":             './src/static/test-riot.html',
                    "/search-results":   './src/static/search-results.html',
                    "/search-widget":    './src/static/search-widget.html'
                }
            }
        }
    );
});

gulp.task('default', ['watch']);
gulp.task('build', [
    'bundle-app-js',
    'compile-sass',
    'compile-vendor-js',
    'compile-vendor-css',
    'optimize-images',
    'copy-fonts',
    'copy-static-files'
]);
