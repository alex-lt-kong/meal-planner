const fs = require('fs');
const browserify = require('browserify');
const srcList = [
  'login.js', 'history-attachments.js', 'notes.js', 'history-selfies.js',
  'blacklist.js', 'notes.js', 'index.js', 'reminder.js', 'mealplans.js', 'attachment.js'
];

for (let i = 0; i < srcList.length; ++i) {
  browserify(`./src/${srcList[i]}`)
      .transform('babelify', {presets: ['@babel/preset-env', '@babel/preset-react']})
      // .plugin('tinyify')
      // tinyify could compress the resultant js file up to 70%, but it takes much longer to finish.
      .bundle()
      .pipe(fs.createWriteStream(`./static/js/${srcList[i]}`));
}
