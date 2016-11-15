/* eslint import/no-extraneous-dependencies: 'off' */
/* eslint arrow-body-style: 'off' */

import gulp from 'gulp';
import eslint from 'gulp-eslint';
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';
import del from 'del';

const paths = {
  src: 'src',
  dest: 'lib',
};

gulp.task('clean', () => del(`${paths.dest}/*`));

gulp.task('build', ['clean'], () => {
  return gulp.src(`${paths.src}/**/*.js`)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('lint', () => {
  return gulp.src(['gulpfile.babel.js', 'src/**/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('watch', ['build', 'lint'], () => {
  gulp.watch(['gulpfile.babel.js', 'src/**/*.js', 'test/**/*.js'], ['build', 'lint']);
});

gulp.task('default', ['build', 'lint']);
