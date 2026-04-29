import fs from 'fs';
import path from 'path';

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.mdx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const pagesDir = path.resolve('./src/content/pages');
const mdxFiles = walkSync(pagesDir);

let cleanedCount = 0;

for (const file of mdxFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove inline styles to allow Tailwind/Prose to take over responsive design
  content = content.replace(/style="[^"]*"/g, '');

  // 2. Remove obsolete layout elements
  content = content.replace(/<div class="clearfix">&nbsp;<\/div>/g, '');
  content = content.replace(/<p>&nbsp;<\/p>/g, '');

  // 3. Ensure security for external links
  content = content.replace(/target="_blank"(?! rel=)/g, 'target="_blank" rel="noopener noreferrer"');

  // 4. Remove empty strong tags or similar oddities
  content = content.replace(/<strong>\s*<\/strong>/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    cleanedCount++;
  }
}

console.log(`Successfully cleaned ${cleanedCount} MDX files.`);
