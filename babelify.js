const fs = require('fs');
const browserify = require('browserify');
const srcList = [
  'history-attachments.js', 'history-notes.js', 'history-selfies.js', 'history-plans.js',
  'blacklist.js', 'notes.js', 'index.js', 'reminder.js', 'history.js', 'mealplans.js', 'attachment.js'
];

for (let i = 0; i < srcList.length; ++i) {
  browserify(`./src/${srcList[i]}`)
      .transform('babelify', {presets: ['@babel/preset-env', '@babel/preset-react']})
      .bundle()
      .pipe(fs.createWriteStream(`./static/js/${srcList[i]}`));
}
