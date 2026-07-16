/**
 * 全局替换 favicon 引用脚本
 * 将所有 favicon.svg / favicon.ico 引用替换为 favicon.png
 * 并更新 type 属性
 */
const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'admin-waterfall.html',
  'admin-imgtc.html',
  'admin.html',
  'block-img.html',
  'gallery.html',
  'index.html',
  'login.html',
  'preview.html',
  'webdav.html',
  'whitelist-on.html'
];

const rootDir = path.resolve(__dirname, '..');

// 逐文件替换
for (const file of htmlFiles) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 替换 favicon.svg -> favicon.png（包括 /favicon.svg 和 favicon.svg 两种路径）
  const svgPattern = /favicon\.svg/g;
  if (svgPattern.test(content)) {
    content = content.replace(/favicon\.svg/g, 'favicon.png');
    modified = true;
  }

  // 替换 favicon.ico -> favicon.png
  const icoPattern = /favicon\.ico/g;
  if (icoPattern.test(content)) {
    content = content.replace(/favicon\.ico/g, 'favicon.png');
    modified = true;
  }

  // 替换 type="image/svg+xml" -> type="image/png"
  const svgTypePattern = /type="image\/svg\+xml"/g;
  if (svgTypePattern.test(content)) {
    content = content.replace(/type="image\/svg\+xml"/g, 'type="image/png"');
    modified = true;
  }

  // 替换 type="image/x-icon" -> type="image/png"
  const icoTypePattern = /type="image\/x-icon"/g;
  if (icoTypePattern.test(content)) {
    content = content.replace(/type="image\/x-icon"/g, 'type="image/png"');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated: ${file}`);
  } else {
    console.log(`- No changes: ${file}`);
  }
}

console.log('\n✅ All favicon references replaced. New favicon: favicon.png');
