import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.resolve('../pages.csv');
const templatesCsvPath = path.resolve('../pages_templates.csv');
const outDirCz = path.resolve('./src/content/pages/cz');
const outDirEn = path.resolve('./src/content/pages/en');

// Ensure output directories exist
if (!fs.existsSync(outDirCz)) fs.mkdirSync(outDirCz, { recursive: true });
if (!fs.existsSync(outDirEn)) fs.mkdirSync(outDirEn, { recursive: true });

const csvContent = fs.readFileSync(csvPath, 'utf8');
const templatesContent = fs.readFileSync(templatesCsvPath, 'utf8');

const records = parse(csvContent, {
  delimiter: ';',
  columns: true,
  skip_empty_lines: true
});

const templates = parse(templatesContent, {
  delimiter: ';',
  columns: true,
  skip_empty_lines: true
});

const templateMap = {};
for (const t of templates) {
    if (t.id_tm) {
        templateMap[t.id_tm] = t.identifier_tm;
    }
}

for (const row of records) {
  if (row.show_pg === 'y' || row.show_pg === '1') {
    const lang = row.lang_pg === '1' ? 'en' : 'cz';
    const outDir = lang === 'en' ? outDirEn : outDirCz;
    
    let slug = row.address_pg || 'index';
    if (slug.startsWith('cz/')) slug = slug.substring(3);
    if (slug.startsWith('en/')) slug = slug.substring(3);
    if (slug.startsWith('../cz/')) slug = slug.substring(6);
    if (slug.endsWith('/')) slug = slug.substring(0, slug.length - 1);
    if (slug === '') slug = 'index';
    
    // Replace slashes with dashes for a flat filename or create subdirs
    // We'll create subdirectories based on slug
    const dirPath = path.join(outDir, path.dirname(slug));
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
    const fileName = path.basename(slug) + '.mdx';
    const filePath = path.join(dirPath, fileName);
    
    const templateName = templateMap[row.tm_id_pg] || 'default';
    
    // Process HTML content
    let htmlContent = row.page_pg || '';
    
    // Escape curly braces for MDX so they are not treated as expressions
    htmlContent = htmlContent.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    // Convert HTML comments to MDX comments
    htmlContent = htmlContent.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');
    
    // If the content is complex (e.g. contains tables or many divs), wrap in prose
    let finalContent = htmlContent;
    if (htmlContent.includes('<table') || htmlContent.includes('<div')) {
      finalContent = `
<div class="prose max-w-none prose-primary prose-lg">
  {/* TODO: refactor into Tailwind components */}
  ${htmlContent}
</div>
`;
    } else if (htmlContent.trim().length > 0) {
       finalContent = `
<div class="prose max-w-none prose-primary prose-lg">
  ${htmlContent}
</div>
`;
    }

    const mdx = `---
title: "${(row.title_pg || row.name_pg).replace(/"/g, '\\"')}"
description: "${(row.description_pg || '').replace(/"/g, '\\"')}"
template: "${templateName}"
---

${finalContent}
`;

    fs.writeFileSync(filePath, mdx);
    console.log(`Created ${filePath}`);
  }
}
