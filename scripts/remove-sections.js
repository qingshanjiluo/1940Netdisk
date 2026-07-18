// Script to remove all sections-related code from admin.html
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// ============================================================
// 1. Remove sections panel (lines 965-996, 0-indexed: 964-995)
//    Lines containing: <!-- === SECTION MANAGEMENT TAB === -->
// ============================================================
let sectionsPanelStart = -1;
let sectionsPanelEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('SECTION MANAGEMENT TAB')) {
    sectionsPanelStart = i;
  }
  // Find the closing </div> of the sections panel - it's the </div> right before empty line + <div class="footer">
  if (sectionsPanelStart >= 0 && sectionsPanelEnd < 0) {
    // The sections panel closes at line 996 (0-indexed: 995)
    // Look for pattern: line with just '</div>' followed by blank line then line with '<div class="footer"'
    if (lines[i].trim() === '</div>' && i > sectionsPanelStart) {
      let nextNonEmpty = -1;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim()) { nextNonEmpty = j; break; }
      }
      if (nextNonEmpty >= 0 && lines[nextNonEmpty].includes('<div class="footer"')) {
        sectionsPanelEnd = i;
        break;
      }
    }
  }
}

if (sectionsPanelStart >= 0 && sectionsPanelEnd > sectionsPanelStart) {
  console.log('Removing sections panel: lines ' + (sectionsPanelStart + 1) + '-' + (sectionsPanelEnd + 1));
  lines.splice(sectionsPanelStart, sectionsPanelEnd - sectionsPanelStart + 1);
  content = lines.join('\n');
  lines = content.split('\n');
} else {
  console.log('WARNING: Could not find sections panel boundaries');
  console.log('  Start found:', sectionsPanelStart >= 0 ? 'yes at line ' + (sectionsPanelStart + 1) : 'no');
  console.log('  End found:', sectionsPanelEnd >= 0 ? 'yes at line ' + (sectionsPanelEnd + 1) : 'no');
}

// ============================================================
// 2. Fix modal title - replace '版块' fallback
// ============================================================
content = content.replace(
  /adminModalType === 'user' \? '用户' : adminModalType === 'group' \? '身份组' : '版块'/g,
  "adminModalType === 'user' ? '用户' : '身份组'"
);

// ============================================================
// 3. Remove section modal template (lines with adminModalType === 'section')
// ============================================================
// Before: find the section template block
content = content.replace(
  /            <!-- Section fields -->\n            <template v-if="adminModalType === 'section'">\n(?:.*\n)*?            <\/template>\n/g,
  ''
);

// ============================================================
// 4. Clean adminDataCache - remove sections and sectionPermissions
// ============================================================
content = content.replace(
  /(adminDataCache:\s*\{[^}]*?)sections:\s*\[\],\s*sectionPermissions:\s*\[\],?\s*/g,
  '$1'
);

// ============================================================
// 5. Remove allSections computed property
// ============================================================
content = content.replace(
  /,\n\s*allSections:\s*function\(\)\{\s*\n\s*var data = this\.loadAdminDataRaw\(\);\s*\n\s*return data\.sections \|\| \[\];\s*\n\s*\}/g,
  ''
);

// ============================================================
// 6. Clean loadAdminDataRaw default
// ============================================================
content = content.replace(
  /(return this\.adminDataCache \|\| \{)[^}]*?(users: \[\], groups: \[\], userGroups: \[\])[^}]*?\};/g,
  '$1 $2 };'
);

// ============================================================
// 7. Remove sections loading from loadAdminData
// ============================================================
content = content.replace(
  /\n\s*else if \(self\.activeTab === 'sections'\) self\.adminList = self\.adminDataCache\.sections \|\| \[\];/g,
  ''
);

// ============================================================
// 8. Remove sections-related methods: getGroupPermissions, getSectionName, getSectionGroups, setSectionPermissionForGroup
// ============================================================
// getGroupPermissions
content = content.replace(
  /,\n\s*getGroupPermissions:\s*function\(groupId\)\{\s*\n\s*var data = this\.loadAdminDataRaw\(\);\s*\n\s*return \(data\.sectionPermissions \|\| \[\]\)\.filter\(function\(sp\)\{ return sp\.groupId === groupId; \}\);\s*\n\s*\}/g,
  ''
);
// getSectionName
content = content.replace(
  /,\n\s*getSectionName:\s*function\(sectionId\)\{\s*\n\s*var data = this\.loadAdminDataRaw\(\);\s*\n\s*var s = \(data\.sections \|\| \[\]\)\.find\(function\(s\)\{ return s\.id === sectionId; \}\);\s*\n\s*return s \? s\.name : sectionId;\s*\n\s*\}/g,
  ''
);
// getSectionGroups
content = content.replace(
  /,\n\s*getSectionGroups:\s*function\(sectionId\)\{\s*\n\s*var data = this\.loadAdminDataRaw\(\);\s*\n\s*return \(data\.sectionPermissions \|\| \[\]\)\.filter\(function\(sp\)\{ return sp\.sectionId === sectionId; \}\);\s*\n\s*\}/g,
  ''
);
// setSectionPermissionForGroup
content = content.replace(
  /,\n\s*setSectionPermissionForGroup:\s*function\(sectionId,\s*value\)\{\s*\n\s*var self = this;\s*\n\s*self\.\$set\(self\.adminFormPerms, sectionId \+ '_' \+ \(self\.adminForm\.id \|\| ''\), value\);\s*\n\s*\}/g,
  ''
);

// ============================================================
// 9. Remove section handling in showAdminModal
// ============================================================
content = content.replace(
  /\n\s*\} else if \(type === 'section'\) \{\s*\n\s*if \(item\) \{\s*\n\s*self\.adminForm = \{ id: item\.id, name: item\.name, slug: item\.slug, description: item\.description \|\| '' \};\s*\n\s*\} else \{\s*\n\s*self\.adminForm = \{ id: 'section_' \+ Date\.now\(\), name: '', slug: '', description: '' \};\s*\n\s*\}\s*\n\s*this\.adminModalVisible = true;\s*\n\s*\}/g,
  ''
);

// ============================================================
// 10. Remove section handling in saveAdminModal
// ============================================================
content = content.replace(
  /\n\s*\} else if \(self\.adminModalType === 'section'\) \{\s*\n(?:.*\n)*?^\s*\}/gm,
  function(match) {
    // Only remove if it's the section block (verify by checking for sectionPayload)
    if (match.includes('sectionPayload')) {
      return '';
    }
    return match;
  }
);

// ============================================================
// 11. Clean deleteAdminItem - remove section references
// ============================================================
content = content.replace(
  /var typeName = type === 'user' \? '用户' : type === 'group' \? '身份组' : '版块';/g,
  "var typeName = type === 'user' ? '用户' : '身份组';"
);

content = content.replace(
  /(var url = type === 'user' \? '\.\/api\/admin\/users\/' \+ encodeURIComponent\(id\)\n\s*: type === 'group' \? '\.\/api\/admin\/groups\/' \+ encodeURIComponent\(id\)\n\s*: '\.\/api\/admin\/sections\/' \+ encodeURIComponent\(id\);)/g,
  function(match) {
    return "var url = type === 'user' ? './api/admin/users/' + encodeURIComponent(id)\n                    : './api/admin/groups/' + encodeURIComponent(id);";
  }
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! All sections-related code removed from admin.html');
