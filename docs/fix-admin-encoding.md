# admin.html 编码损坏修复 + 组件化改造完成方案

## 问题描述

`admin.html` 文件因 PowerShell `Set-Content` 命令的编码问题导致损坏。PowerShell 的 `Set-Content` 在中文 Windows 系统上使用默认 ANSI 编码(GBK)而非 UTF-8 写入文件，导致所有非 ASCII 字符损坏。

**损坏表现：**
- `根目录` → `根目�?`
- `状态` → `状�?`
- `加载数据` → `载数�?`
- `✓` → `�?`
- 大量 JavaScript 字符串字面量被破坏，VS Code 报 100+ 语法错误

## 修复目标

1. ✅ 从 git 恢复原始 `admin.html`（2959 行，UTF-8 编码）
2. ✅ 替换内联 `<style>` 为 `<link rel="stylesheet" href="/admin.css">`
3. ✅ 替换 `new Vue({` 为 `var adminApp = mergeAdminModules({`
4. ✅ 删除重复的 admin computed（已移到 `admin-modules.js`）
5. ✅ 删除重复的 admin methods（已移到 `admin-modules.js`）
6. ✅ 添加 Vue 2 + admin-utils.js + admin-modules.js 的 `<script>` 引用

## 所需文件

修复需要这些 **已存在的文件**（它们都是完好的）：

| 文件 | 说明 |
|------|------|
| `admin-modules.js` | 管理模块（数据 / computed / methods / mergeAdminModules） |
| `admin-utils.js` | 工具函数（showToast, showConfirm, showPrompt, showAlert） |
| `admin.css` | 管理后台专用样式（原 admin.html 内联 `<style>` 的提取） |

## 精确行号信息（原始文件 admin.html，从 git HEAD 恢复后）

```
总行数: 2959

<style> 开始行:       第 14 行
</style> 结束行:      第 491 行
Vue CDN 引用行:      第 1245 行
new Vue({ 行:        第 1301 行
Vue 闭合行:          第 2955 行

--- computed 块（全部要删除）---
"// Admin computed" 注释:  第 1496 行
allGroups:                第 1497 行
allSections:              第 1501 行
filteredUserList:         第 1505 行
sessionUserAvatar:        第 1515 行
computed 闭合 "},":       第 1522 行

--- 要保留的块 ---
watch:                    第 1523-1540 行
methods: 开始            第 1541 行

--- methods 块中要删除的部分 ---
loadAdminDataRaw:         第 1601 行
loadAdminData:            第 1604 行
saveAdminData:            第 1657 行
getUserGroups:            第 1660 行
getGroupName:             第 1668 行
getGroupMemberCount:      第 1674 行
getGroupBuiltinPerms:     第 1680 行
getBuiltinPermLabel:      第 1688 行
showAdminModal:           第 1694 行
closeAdminModal:          第 1776 行
saveAdminModal:           第 1783 行
deleteAdminItem:          第 1902 行
showGroupModal:           第 1919 行（注意：此处是嵌套函数，实际需要保留闭包结构）
saveGroupModal:           第 1956 行
deleteGroup:              第 2013 行
showSectionModal:         第 2030 行
saveSectionModal:         第 2077 行
deleteSection:            第 2140 行
resetUserPassword:        第 2157 行
refreshAdminData:         第 2177 行
openTokenDialog:          第 2203 行
createToken:              第 2241 行
revokeToken:              第 2292 行
setLocalAdminData:        第 2342 行
confirmMoveDialog:        第 2458 行

--- methods 块中要保留的部分 ---
checkAuth:                第 1543 行
loadCurrentAdminUser:     第 1561 行
migrateLocalAdminData:    第 1570 行
moveFilesToFolder:        第 2466 行（注意：方法体中调用了 confirmMoveDialog 等已被删除的方法）
moveFilesToFolder 结束:   第 2775 行左右
[后续所有方法都保留]
mounted:                  第 2933 行左右
beforeDestroy:            第 2951 行

--- sections 面板 HTML（可选删除）---
<!-- === SECTION MANAGEMENT TAB === -->:  第 966 行
对应 panel 结束:                             第 997 行（</div>）
```

## 修复步骤

### 第 1 步：从 git 恢复原始 admin.html

```bash
git checkout HEAD -- admin.html
```

验证：文件应有 2959 行，所有中文正常显示。

### 第 2 步：创建修复脚本

创建 `scripts/repair-admin.js`，内容如下：

```javascript
// scripts/repair-admin.js
// 用于修复 admin.html：恢复编码 + 应用组件化架构修改
// 用法: node scripts/repair-admin.js

const fs = require('fs');

// 1. 读取原始文件（git 恢复后的版本）
const content = fs.readFileSync('admin.html', 'utf8');
let lines = content.split('\n');
console.log('原始行数:', lines.length);

// 2. 删除第 14 到 491 行（内联 <style> 到 </style>）
//    注意：第 14 行是 <style>，第 491 行是 </style>
//    删除后需要补上 <link rel="stylesheet" href="/admin.css">
const styleStart = 13; // 0-indexed: 第 14 行
const styleEnd = 490;  // 0-indexed: 第 491 行

// 找到 </head> 的位置（约第 492 行）
let headCloseLine = -1;
for (let i = styleEnd; i < lines.length; i++) {
  if (lines[i].trim() === '</head>') {
    headCloseLine = i;
    break;
  }
}
// headCloseLine 应该是第 491 行（0-indexed）

// 3. 构建新文件
let result = [];

for (let i = 0; i < lines.length; i++) {
  // 跳过 <style>...</style> 块
  if (i >= styleStart && i <= styleEnd) {
    if (i === styleEnd) {
      // 在 </style> 的位置插入 link 标签（在 </head> 之前）
      continue;
    }
    continue;
  }

  result.push(lines[i]);
}

// 找到当前 </head> 的位置（0-indexed）
let newHeadClose = -1;
for (let i = styleStart; i < result.length; i++) {
  if (result[i].trim() === '</head>') {
    newHeadClose = i;
    break;
  }
}

// 在 </head> 前插入 <link rel="stylesheet" href="/admin.css">
if (newHeadClose >= 0) {
  result.splice(newHeadClose, 0, '  <link rel="stylesheet" href="/admin.css">');
}

console.log('第 1 步完成: 替换 <style> 为 link，当前行数:', result.length);

// 4. 在 Vue CDN 引用后添加 admin-utils.js 和 admin-modules.js 的引用
// 找到第 1245 行对应的 0-indexed 位置（Vue CDN 引用后）
let vueCdnLine = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].indexOf('vue@2.6.14/dist/vue.min.js') >= 0) {
    vueCdnLine = i;
    break;
  }
}

// 在 Vue CDN 行之后插入 admin-utils.js 和 admin-modules.js 引用
if (vueCdnLine >= 0) {
  result.splice(vueCdnLine + 1, 0, '  <script src="/admin-utils.js"></script>');
  result.splice(vueCdnLine + 2, 0, '  <script src="/admin-modules.js"></script>');
}

console.log('第 2 步完成: 添加脚本引用，当前行数:', result.length);

// 5. 替换 new Vue({ 为 var adminApp = mergeAdminModules({
let vueDeclLine = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].indexOf('new Vue({') >= 0) {
    vueDeclLine = i;
    result[i] = result[i].replace('new Vue({', 'var adminApp = mergeAdminModules({');
    break;
  }
}
console.log('第 3 步完成: 替换 Vue 声明');

// 6. 删除 admin computed 块
// 找到 "// Admin computed" 行和 computed 块结束
let computedStart = -1;
let computedEnd = -1;
for (let i = 0; i < result.length; i++) {
  const t = result[i].trim();
  if (t === '// Admin computed') {
    computedStart = i;
    // 从这一行开始，跳过直到找到 computed 的闭合 "},"
  }
  if (computedStart >= 0 && t === '},' && i > computedStart + 1) {
    computedEnd = i;
    break;
  }
}

// 验证 computed 块包含预期的内容
if (computedStart >= 0 && computedEnd >= 0) {
  const computedContent = result.slice(computedStart, computedEnd + 1).join('\n');
  if (computedContent.indexOf('allGroups') >= 0 && 
      computedContent.indexOf('filteredUserList') >= 0 &&
      computedContent.indexOf('sessionUserAvatar') >= 0) {
    // 删除从 computedStart 到 computedEnd 的行
    result.splice(computedStart, computedEnd - computedStart + 1);
    console.log('第 4 步完成: 删除了 admin computed 块（' + (computedEnd - computedStart + 1) + ' 行）');
  } else {
    console.log('第 4 步失败: computed 块内容不匹配，请手动检查');
    console.log('找到的内容:', computedContent.substring(0, 200));
  }
} else {
  console.log('第 4 步: 未找到 admin computed 块，computedStart=' + computedStart + ', computedEnd=' + computedEnd);
}

// 7. 删除 admin methods 中已移到 admin-modules.js 的方法
// 在 methods: { 块中，删除以下方法：
// loadAdminDataRaw, loadAdminData, saveAdminData, getUserGroups, getGroupName,
// getGroupMemberCount, getGroupBuiltinPerms, getBuiltinPermLabel,
// showAdminModal, closeAdminModal, saveAdminModal, deleteAdminItem,
// resetUserPassword, refreshAdminData, openTokenDialog, createToken,
// revokeToken, setLocalAdminData, confirmMoveDialog
//
// NOTA: showGroupModal, saveGroupModal, deleteGroup, showSectionModal, saveSectionModal, deleteSection
// 这些已经在之前的操作中从 admin.html 中被删除了（在 saveAdminModal 和 closeAdminModal 重构时已处理）
// 现在它们不在 admin.html 中，只在 admin-modules.js 中

const methodsToRemove = [
  'loadAdminDataRaw', 'loadAdminData', 'saveAdminData',
  'getUserGroups', 'getGroupName', 'getGroupMemberCount', 'getGroupBuiltinPerms',
  'getBuiltinPermLabel',
  'showAdminModal', 'closeAdminModal', 'saveAdminModal', 'deleteAdminItem',
  'resetUserPassword', 'refreshAdminData',
  'openTokenDialog', 'createToken', 'revokeToken',
  'setLocalAdminData', 'confirmMoveDialog'
];

// 查找 methods: { 块的起始位置
let methodsStart = -1;
let methodsBraceStart = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].trim() === 'methods:') {
    methodsStart = i;
    // 下一行应该有 "{"
    if (i + 1 < result.length && result[i + 1].indexOf('{') >= 0) {
      methodsBraceStart = i + 1;
    }
    break;
  }
}

// 以确认MoveDialog结束位置为锚点，找到它在结果数组中的位置
// 然后在它前面删除所有要删除的方法
// 更稳健的方式：逐行扫描 methods 块，记录每个方法的起始和结束行

if (methodsStart >= 0) {
  // 扫描 methods 中每个方法，标记要删除的范围
  let methodRanges = []; // 每个元素: { name, start, end }
  let currentMethod = null;
  let braceDepth = 0;
  let inMethod = false;
  
  for (let i = methodsBraceStart; i < result.length; i++) {
    const line = result[i];
    const trimmed = line.trim();
    
    // 记录括号深度
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    
    // 检测新方法开始: "  methodName: function(" 或 "  methodName() {"
    const methodMatch = trimmed.match(/^(\w[\w]*)\s*:\s*function\s*\(/);
    if (methodMatch && braceDepth === 1) {
      // 前一个方法结束
      if (currentMethod) {
        currentMethod.end = i - 1;
        methodRanges.push(currentMethod);
      }
      currentMethod = {
        name: methodMatch[1],
        start: i,
        end: -1
      };
      inMethod = true;
    }
    
    // 检测 methods 块结束
    if (braceDepth === 0 && i > methodsBraceStart + 1) {
      if (currentMethod) {
        currentMethod.end = i;
        methodRanges.push(currentMethod);
      }
      break;
    }
  }
  
  // 标记最后一个方法
  if (currentMethod && currentMethod.end < 0) {
    currentMethod.end = result.length - 1;
    methodRanges.push(currentMethod);
  }
  
  console.log('找到 ' + methodRanges.length + ' 个方法');
  
  // 从后往前删除（避免索引变动）
  let removeCount = 0;
  for (let m = methodRanges.length - 1; m >= 0; m--) {
    const method = methodRanges[m];
    if (methodsToRemove.indexOf(method.name) >= 0) {
      result.splice(method.start, method.end - method.start + 1);
      removeCount += (method.end - method.start + 1);
      console.log('删除方法: ' + method.name + ' (' + (method.end - method.start + 1) + ' 行)');
    }
  }
  
  console.log('第 5 步完成: 删除了 ' + methodRanges.length + ' 个方法，共 ' + removeCount + ' 行');
}

// 8. 写入修复后的文件
fs.writeFileSync('admin.html', result.join('\n'), 'utf8');
console.log('完成! 最终行数:', result.length);
```

### 第 3 步：运行修复脚本

```bash
node scripts/repair-admin.js
```

### 第 4 步：验证

检查以下内容：

```bash
# 检查文件行数（应在 ~1600-1700 行）
findstr /n "root" admin.html | findstr /c:"行数"

# 检查中文是否正常显示
findstr /n "根目录" admin.html
findstr /n "状态" admin.html
findstr /n "加载" admin.html

# 检查 mergeAdminModules 是否存在
findstr /n "mergeAdminModules" admin.html

# 检查重复方法是否已删干净（应找不到这些方法定义）
findstr /n "loadAdminDataRaw: function" admin.html
findstr /n "confirmMoveDialog:" admin.html
findstr /n "allGroups: function" admin.html

# 检查样式引用是否正确
findstr /n "admin.css" admin.html

# 检查 Vue 脚本引用
findstr /n "admin-utils.js" admin.html
findstr /n "admin-modules.js" admin.html
```

## 预期结果

| 检查项 | 预期值 |
|--------|--------|
| 文件行数 | ~1620-1650 行 |
| 中文显示 | 所有中文字符正常 |
| `mergeAdminModules` | 2 处（一次声明，一次调用） |
| `admin.css` 引用 | 1 处在 `<head>` |
| `admin-utils.js` 引用 | 1 处 |
| `admin-modules.js` 引用 | 1 处 |
| `loadAdminDataRaw: function` | 0 处（定义在模块中） |
| `allGroups: function` | 0 处（定义在模块中） |
| `confirmMoveDialog:` | 0 处（定义在模块中） |

## 如果不小心再次弄坏

随时可以用 git 恢复原始文件从头再来：

```bash
git checkout HEAD -- admin.html
```

## 注意事项

1. **不要使用 PowerShell 的 Set-Content** 来修改此文件！PowerShell 默认使用 ANSI/GBK 编码，会损坏中文。
2. **始终使用 `fs.writeFileSync(path, content, 'utf8')`**（Node.js）来写入此文件。
3. 如果 VS Code 打开文件时看到中文乱码，点击右下角编码选择 "UTF-8" 重新打开。
4. `admin-modules.js` 中 `sessionUserAvatar` computed 使用了 HTML 实体编码（`&` 等），这是正确的，不需要修改。
5. `admin_original.html` 是临时文件，修复完成后可删除。

## 引用文件

### admin-modules.js

位于 `g:/皮皮/编程项目/1940Netdisk/admin-modules.js`，约 619 行。

提供了：
- `mergeAdminModules(options)` — 合并函数
- `adminModules.data` — 数据默认值
- `adminModules.methods` — 管理方法
- `adminModules.computed` — 管理 computed

### admin-utils.js

位于 `g:/皮皮/编程项目/1940Netdisk/admin-utils.js`，约 120 行。

提供了：
- `showToast(msg, type)` — 通知提示
- `showConfirm(msg, title)` → Promise — 确认对话框
- `showPrompt(msg, title, opts)` → Promise — 输入对话框
- `showAlert(html, title)` → Promise — 警告对话框

### admin.css

位于 `g:/皮皮/编程项目/1940Netdisk/admin.css`，约 478 行。

提供了原 admin.html 中所有内联样式。
