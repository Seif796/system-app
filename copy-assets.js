import fs from 'fs';
import path from 'path';

const filesToCopy = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'sw.js',
  'app-icon.png'
];

const destDir = path.resolve('www');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(destDir, file));
    console.log(`Copied ${file} to www/`);
  }
});

// Copy icons folder
const iconsSrc = path.resolve('icons');
const iconsDest = path.join(destDir, 'icons');
if (fs.existsSync(iconsSrc)) {
  if (!fs.existsSync(iconsDest)) {
    fs.mkdirSync(iconsDest, { recursive: true });
  }
  fs.readdirSync(iconsSrc).forEach(icon => {
    fs.copyFileSync(path.join(iconsSrc, icon), path.join(iconsDest, icon));
  });
  console.log('Copied icons/ to www/icons/');
}

console.log('Asset preparation complete.');
