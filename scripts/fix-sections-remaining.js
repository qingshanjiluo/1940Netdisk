// Script to remove remaining sections code from admin.html saveAdminModal
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Check lines around 1711-1727 for sections remnants
console.log('=== Lines around saveAdminModal section remnants ===');
for (let i = 1705; i < Math.min(1735, lines.length); i++) {
  console.log((i+1) + ': ' + lines[i]);
}

// The sections code left over at lines 1711-1727 (1-indexed):
// 1711: }).then(function(r){ return r.json(); }).then(function(res){
// 1712: if (!res.success) throw new Error(res.error);
// 1713: showToast('版块创建成功', 'success');
// 1714: self.closeAdminModal(); self.loadAdminData();
// 1715: }).catch(function(err){ showToast(err.message || '创建失败', 'error'); });
// 1716: } else {
// 1717: fetch('./api/admin/sections/'...
// ... (sections PATCH code)
// 1726: }
// 1727: }

// The line before (1710) should be: ).catch(function(err){ showToast(err.message || '保存失败', 'error'); });
// And the line after (1728) should be: },
// So we need to remove lines 1711-1727 (0-indexed: 1710-1726)

// Check: line 1710 ends with group save code
// line 1710 should be: }).catch(function(err){ showToast(err.message || '保存失败', 'error'); });
// This is the catch for the group PATCH. Then the sections code starts at 1711

// Actually looking at the regex, it seems that the group else block's closing got partially
// merged with sections code. Let me trace through:

// Line 1709: self.closeAdminModal(); self.loadAdminData();
// Line 1710: }).catch(function(err){ showToast(err.message || '保存失败', 'error'); });
// Line 1711: }).then(function(r){ return r.json(); }).then(function(res){
//   ^ This was supposed to be part of section create, but it's malformed - it's after the group else catch

// Actually wait - the original code had:
//   } else if (self.adminModalType === 'section') {
//     if (!form.name) { ... }
//     ...
//     if (self.adminModalMode === 'create') {
//       fetch('./api/admin/sections', {
//         ...
//       }).then(...)
//     } else {
//       fetch('./api/admin/sections/' + id, {
//         ...
//       }).then(...)
//     }
//   }
// } <-- end of saveAdminModal

// The regex meant to remove the entire block from "} else if (self.adminModalType === 'section')"
// up to before the closing "}" of saveAdminModal, but seems like it only removed the 
// "} else if (self.adminModalType === 'section') {" line and the sectionPayload definition,
// leaving the fetch blocks behind.

// Let me check what's at the correct position
// Looking at original data:
// After group else closes at 1710, we need to remove section-related code from 1711-1727

// Looking at original the section block was:
// } else if (self.adminModalType === 'section') {
//     if (!form.name) { ...
//     if (!form.slug) { ...
//     var sectionPayload = ...
//     if (create) { 
//       fetch('./api/admin/sections', ...
//     } else {
//       fetch('./api/admin/sections/' + ...
//     }
// }  <-- closes section else if

// My regex might have partially captured some but not all.
// Let me find the exact lines

// The section else if line should have been removed, but the inner code blocks weren't.
// Line 1711 starts with "}).then" which is odd - this is likely the .then of the section create fetch
// But the fetch line itself was left behind, only the .then chains remain?

// Actually I think what happened is the regex matched the beginning but the multiline match
// didn't work properly with /gm flags.

// Let me count: the section block starts with the else if line and the first few lines
// (name check, slug check, sectionPayload) might have been removed, 
// but the fetch blocks were left.

// Simple fix: just remove lines 1711-1727 (0-indexed: 1710-1726)
// and also fix line 1710 to have the proper closing braces.

// Wait - line 1710 is '}).catch(...' which is the group else catch. That's valid code.
// After that, lines 1711-1727 are section remnants. 
// After removing them, saveAdminModal should close with '}' at line 1728 (current line 1728 which is '},')

// Actually let me re-examine. After group else block:
// Line 1709-1710 closes group PATCH else block
// Originally saveAdminModal should then close with '}'
// But the section else if was inserted between group else closing brace and saveAdminModal closing brace

// So structure was:
// if (user) { ... }
// else if (group) { ... }
// else if (section) { ... }  <-- THIS IS WHAT WE REMOVE
// } <-- close saveAdminModal

// After removing the section block, we should have:
// if (user) { ... }
// else if (group) { ... }
// } <-- close saveAdminModal

// Line 1710 is the final catch for group PATCH else: }).catch(...)
// After that: sections code at 1711-1727
// After that: 1728: }, (closing saveAdminModal)
// After that: 1729: deleteAdminItem...

// So I need to remove lines 1711-1727 and keep 1728 as the closing of saveAdminModal

if (lines.length > 1727) {
  console.log('\nRemoving lines 1711-1727 (sections remnants)...');
  let removed = lines.splice(1710, 17); // 0-indexed: remove items at index 1710, count 17
  console.log('Removed lines:');
  removed.forEach((l, i) => console.log((1711+i) + ': ' + l));
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('\nDone! Remaining sections code cleaned up.');
} else {
  console.log('File has fewer lines than expected, check manually.');
}
