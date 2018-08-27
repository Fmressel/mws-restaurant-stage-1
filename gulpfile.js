const gulp = require('gulp'),
  imagemin = require('gulp-imagemin'),
  jpegRecompress = require('imagemin-jpeg-recompress'),
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

gulp.task('imgs', () => {
    gulp.src('img/*')
      .pipe(imagemin([jpegRecompress({ quality: 'medium', target: 0.89 })], {verbose: true} ))
      .pipe(gulp.dest('dist/img'));
});