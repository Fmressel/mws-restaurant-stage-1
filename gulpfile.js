const gulp = require('gulp'),
  imagemin = require('gulp-imagemin'),
  jpegRecompress = require('imagemin-jpeg-recompress'),
  imageResize = require('gulp-image-resize'),
  rename = require('gulp-rename'),
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
      .pipe(gulp.dest('dist/img'))
      .pipe(imageResize({
          imageMagick: true,
          percentage: 33
      }))
      .pipe(rename({ suffix: '-small' }))
      .pipe(gulp.dest('dist/img'));
});