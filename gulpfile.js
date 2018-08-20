const gulp = require('gulp'),
  browserSync = require('browser-sync').create();

gulp.task('default', () => {
    console.log('Starting server...');
    browserSync.init({
        watch: true,
        port: 8000,
        server: {
            baseDir: "./"
        }
    });
});