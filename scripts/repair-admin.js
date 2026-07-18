// scripts/repair-admin.js
// 用于修复 admin.html：恢复编码 + 应用组件化架构修改
// 用法: node scripts/repair-admin.js
// 参考: docs/fix-admin-encoding.md
// 
// 修改说明：
// 1. 删除 <style>...</style>（第 14-491 行），添加 <link rel="stylesheet" href="/admin.css">
// 2. 在 Vue CDN 后添加 admin-utils.js 和 admin-modules.js 引用
// 3. 替换 new Vue({ 为 var adminApp = mergeAdminModules({
// 4. 删除 Admin computed 属性（仅删除 // Admin computed 及之后的属性定义，保留 computed 块闭合）
// 5. 从 methods 块中删除已移到 admin-modules.js 的方法

const fs = require('fs');

// ============================================================
// 读取 admin-modules.js 获取已迁移的方法列表
// ============================================================
const moduleText = fs.readFileSync('admin-modules.js', 'utf8');
const methodsInModule = [];
const methodRegex = /adminMethods\.(\w+)\s*=\s*function/g;
let matched;
while ((matched = methodRegex.exec(moduleText)) !== null) {
  methodsInModule.push(matched[1]);
}
console.log('admin-modules.js 中的方法:', methodsInModule.join(', '));

// ============================================================
// 读取原始 admin.html
// ============================================================
const content = fs.readFileSync('admin.html', 'utf8');
let lines = content.split('\n');
console.log('原始行数:', lines.length);

// ============================================================
// 第 1 步：删除 <style>...</style>（第 14-491 行，0-indexed: 13-490）
//         并在 </head> 前添加 <link rel="stylesheet" href="/admin.css">
// ============================================================
const STYLE_START = 13;  // 0-indexed
const STYLE_END = 490;   // 0-indexed

let result = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= STYLE_START && i <= STYLE_END) {
    continue;
  }
  result.push(lines[i]);
}

let headCloseIdx = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].trim() === '</head>') {
    headCloseIdx = i;
    break;
  }
}
if (headCloseIdx >= 0) {
  result.splice(headCloseIdx, 0, '  <link rel="stylesheet" href="/admin.css">');
}
console.log('第 1 步完成: 替换 <style> 为 link，当前行数:', result.length);

// ============================================================
// 第 2 步：在 Vue CDN 后添加 admin-utils.js 和 admin-modules.js 引用
// ============================================================
let vueCdnIdx = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].indexOf('vue@2.6.14/dist/vue.min.js') >= 0) {
    vueCdnIdx = i;
    break;
  }
}
if (vueCdnIdx >= 0) {
  result.splice(vueCdnIdx + 1, 0, '  <script src="/admin-utils.js"></script>');
  result.splice(vueCdnIdx + 2, 0, '  <script src="/admin-modules.js"></script>');
}
console.log('第 2 步完成: 添加脚本引用，当前行数:', result.length);

// ============================================================
// 第 3 步：替换 new Vue({ 为 var adminApp = mergeAdminModules({
// ============================================================
for (let i = 0; i < result.length; i++) {
  if (result[i].indexOf('new Vue({') >= 0) {
    result[i] = result[i].replace('new Vue({', 'var adminApp = mergeAdminModules({');
    console.log('第 3 步完成: 替换 Vue 声明，位置:', i + 1);
    break;
  }
}

// ============================================================
// 第 4 步：删除 Admin computed 属性
// 结构：computed: { ... [pages, ...] // Admin computed 
//       allGroups: ..., ..., sessionUserAvatar: ... }, },
// watch 前的那行 "}," 是 computed 块整体的闭合（6空格缩进），不能删
// 要删除的只是 // Admin computed 起到 admin 属性的最后一个 "},"（8空格缩进）
// ============================================================
let compAdminStart = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].trim() === '// Admin computed') {
    compAdminStart = i;
    break;
  }
}

if (compAdminStart >= 0) {
  // 找到 watch: 行的位置，然后找 watch 前第 2 行（即 sessionUserAvatar 的 },）
  // computed 块闭合在 watch 前一行（6空格缩进）
  // admin computed 最后一个方法闭合在 watch 前两行（8空格缩进）
  let watchIdx = -1;
  for (let i = compAdminStart; i < result.length; i++) {
    if (result[i].trim().startsWith('watch:')) {
      watchIdx = i;
      break;
    }
  }
  
  if (watchIdx >= 0) {
    // 从 watch 往前找带 "}," 的行，找到最后一个（watch前2行）
    let adminCompEnd = -1;
    for (let i = watchIdx - 1; i > compAdminStart; i--) {
      if (result[i].trim() === '},') {
        adminCompEnd = i;
        break; // 找到的是 watch 前 1 行（computed 块闭合），再找前一个
      }
    }
    // 第二个找到的才是 admin 属性的闭合
    if (adminCompEnd > compAdminStart) {
      // 确认一下，再往前走找到另一个 "},"
      for (let i = adminCompEnd - 1; i > compAdminStart; i--) {
        if (result[i].trim() === '},') {
          adminCompEnd = i;
          break;
        }
      }
    }
    
    const blockContent = result.slice(compAdminStart, adminCompEnd + 1).join('\n');
    if (blockContent.indexOf('allGroups') >= 0 && blockContent.indexOf('sessionUserAvatar') >= 0) {
      result.splice(compAdminStart, adminCompEnd - compAdminStart + 1);
      console.log('第 4 步完成: 删除了 admin computed 属性（' + (adminCompEnd - compAdminStart + 1) + ' 行）');
    } else {
      console.log('第 4 步: computed 块验证失败，跳过删除');
      console.log('内容预览:', blockContent.substring(0, 200));
    }
  } else {
    console.log('第 4 步: 未找到 watch: 位置，跳过');
  }
} else {
  console.log('第 4 步: 未找到 // Admin computed');
}

// ============================================================
// 第 5 步：从 methods 块中删除已移到 admin-modules.js 的方法
// ============================================================
let methodsStart = -1;
for (let i = 0; i < result.length; i++) {
  const trimmed = result[i].trim();
  if (trimmed.indexOf('methods:') === 0 && trimmed.indexOf('{') >= 0) {
    methodsStart = i;
    break;
  }
}

if (methodsStart >= 0) {
  // 用括号深度找到 methods 块的结束
  let methodsEnd = -1;
  let braceDepth = 0;
  for (let i = methodsStart; i < result.length; i++) {
    const line = result[i];
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > methodsStart) {
      methodsEnd = i;
      break;
    }
  }
  
  console.log('methods 块范围:', (methodsStart + 1) + '-' + (methodsEnd + 1));
  
  if (methodsEnd > methodsStart) {
    // 扫描方法，提取起止行
    let methodRanges = [];
    let currentMethod = null;
    let depth = 0;
    
    for (let i = methodsStart + 1; i <= methodsEnd; i++) {
      const line = result[i];
      const trimmed = line.trim();
      
      let lineDelta = 0;
      for (const ch of line) {
        if (ch === '{') lineDelta++;
        if (ch === '}') lineDelta--;
      }
      
      if (depth === 0) {
        const methodMatch = trimmed.match(/^(\w+)\s*:\s*function\s*\(/);
        if (methodMatch) {
          if (currentMethod) {
            currentMethod.end = i - 1;
            methodRanges.push(currentMethod);
          }
          currentMethod = { name: methodMatch[1], start: i, end: -1 };
        }
      }
      
      depth += lineDelta;
      
      if (depth === 0 && i === methodsEnd) {
        if (currentMethod) {
          currentMethod.end = i;
          methodRanges.push(currentMethod);
          currentMethod = null;
        }
      }
    }
    
    if (currentMethod) {
      currentMethod.end = methodsEnd;
      methodRanges.push(currentMethod);
    }
    
    console.log('找到 ' + methodRanges.length + ' 个方法');
    
    let removedNames = [];
    let removeCount = 0;
    for (let m = methodRanges.length - 1; m >= 0; m--) {
      const method = methodRanges[m];
      if (methodsInModule.indexOf(method.name) >= 0) {
        result.splice(method.start, method.end - method.start + 1);
        removeCount += (method.end - method.start + 1);
        removedNames.push(method.name);
      }
    }
    
    console.log('第 5 步完成: 删除了 ' + removedNames.length + ' 个方法，共 ' + removeCount + ' 行');
    if (removedNames.length > 0) {
      console.log('已删除方法:', removedNames.join(', '));
    }
  }
} else {
  console.log('第 5 步失败: 未找到 methods: 行');
  for (let i = 0; i < result.length; i++) {
    if (result[i].indexOf('methods') >= 0) {
      console.log('  DEBUG[' + (i+1) + ']: ' + JSON.stringify(result[i].trim().substring(0, 80)));
    }
  }
}

// ============================================================
// 写入修复后的文件
// ============================================================
fs.writeFileSync('admin.html', result.join('\n'), 'utf8');
console.log('========================================');
console.log('完成! 最终行数:', result.length);
console.log('========================================');
