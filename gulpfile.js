const gulp = require('gulp'),
  browserSync = require('browser-sync').create();

gulp.task('default', () => {
    console.log('Starting server...');
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
});