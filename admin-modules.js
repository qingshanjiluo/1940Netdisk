// ============================================================
// 1940Netdisk · Admin 管理模块（用户/身份组/API Token）
// 钢化玻璃 UI · 可合并到主 Vue 实例
// ============================================================
// 使用方法：在 admin.html 中 <script src="/admin-modules.js"></script>
// 然后在 new Vue() 之前调用 mergeAdminModules(appOptions) 合并

(function(global) {
  'use strict';

  var adminData = function() {
    return {
      // ====== Token Dialog ======
      tokenDialogVisible: false,
      tokenLoading: false,
      createTokenDialogVisible: false,
      tokenCreateLoading: false,
      createdTokenDialogVisible: false,
      createdTokenValue: '',
      createdTokenCopied: false,
      apiTokens: [],
      tokenMutatingMap: {},
      tokenForm: {
        name: '',
        scopes: ['upload', 'read'],
        expiryPreset: 'never',
        customExpiresAt: ''
      },

      // ====== Move Dialog ======
      moveDialogVisible: false,
      moveDialogLoading: false,
      moveDialogFoldersLoading: false,
      moveDialogFiles: [],
      moveDialogTargetPath: '',
      moveDialogFolderSearch: '',
      moveDialogNewFolderPath: '',

      // ====== Admin Management ======
      activeTab: 'files',
      adminModalVisible: false,
      adminModalType: 'user',
      adminModalMode: 'create',
      adminForm: {},
      adminEditingId: null,
      adminList: [],
      adminFormPerms: {},
      builtinPermOptions: [
        { key: 'upload',        label: '上传',         icon: 'fas fa-upload' },
        { key: 'read',          label: '读取文件',     icon: 'fas fa-file-alt' },
        { key: 'download',      label: '下载文件',     icon: 'fas fa-download' },
        { key: 'manage',        label: '管理文件',     icon: 'fas fa-folder-open' },
        { key: 'delete',        label: '删除文件',     icon: 'fas fa-trash-alt' },
        { key: 'create_user',   label: '新建一般用户', icon: 'fas fa-user-plus' },
        { key: 'create_admin',  label: '新建管理员',   icon: 'fas fa-user-shield' },
        { key: 'create_group',  label: '新建身份组',   icon: 'fas fa-users-cog' },
        { key: 'modify_group',  label: '修改他人身份组',icon: 'fas fa-user-edit' },
      ],
      adminDataCache: { users: [], groups: [], userGroups: [] },
      adminDataLoading: false,
      userSearchQuery: '',
    };
  };

  // ==================== Methods ====================

  var adminMethods = {};

  // -------- Admin Data Methods --------

  adminMethods.loadAdminDataRaw = function() {
    return this.adminDataCache || { users: [], groups: [], userGroups: [] };
  };

  adminMethods.loadAdminData = function() {
    var self = this;
    self.adminDataLoading = true;
    return fetch('./api/admin/data', { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(payload) {
        if (payload && payload.success && payload.data) {
          self.adminDataCache = payload.data;
        }
        if (self.activeTab === 'users') self.adminList = self.adminDataCache.users || [];
        else if (self.activeTab === 'groups') self.adminList = self.adminDataCache.groups || [];
      })
      .catch(function(err) {
        showToast('加载管理数据失败: ' + (err.message || err), 'error');
      })
      .finally(function() { self.adminDataLoading = false; });
  };

  adminMethods.saveAdminData = function() {
    this.loadAdminData();
  };

  adminMethods.getUserGroups = function(userId) {
    var data = this.loadAdminDataRaw();
    return (data.userGroups || []).filter(function(ug) { return ug.userId === userId; }).map(function(ug) { return ug.groupId; });
  };

  adminMethods.getGroupName = function(groupId) {
    var data = this.loadAdminDataRaw();
    var g = (data.groups || []).find(function(g) { return g.id === groupId; });
    return g ? g.name : groupId;
  };

  adminMethods.getGroupMemberCount = function(groupId) {
    var data = this.loadAdminDataRaw();
    return (data.userGroups || []).filter(function(ug) { return ug.groupId === groupId; }).length;
  };

  adminMethods.getGroupBuiltinPerms = function(groupId) {
    var data = this.loadAdminDataRaw();
    var g = (data.groups || []).find(function(g) { return g.id === groupId; });
    return Array.isArray(g && g.builtinPerms) ? g.builtinPerms : [];
  };

  adminMethods.getBuiltinPermLabel = function(key) {
    var map = {};
    (this.builtinPermOptions || []).forEach(function(o) { map[o.key] = o.label; });
    return map[key] || key;
  };

  // -------- Admin Modal --------

  adminMethods.showAdminModal = function(type, item) {
    this.adminModalType = type;
    this.adminModalMode = item ? 'edit' : 'create';
    this.adminEditingId = item ? item.id : null;
    this.adminFormPerms = {};
    var self = this;

    if (type === 'user') {
      if (item) {
        var data = this.loadAdminDataRaw();
        var ug = (data.userGroups || []).filter(function(ug) { return ug.userId === item.id; }).map(function(ug) { return ug.groupId; });
        self.adminForm = { username: item.username, nickname: item.nickname || '', role: item.role || 'user', enabled: item.enabled !== false, groupIds: ug.slice() };
      } else {
        self.adminForm = { username: '', nickname: '', role: 'user', password: '', enabled: true, groupIds: [] };
      }
      this.adminModalVisible = true;
    } else if (type === 'group') {
      var showGroupModal = function() {
        var data = self.loadAdminDataRaw();
        if (item) {
          self.adminForm = { id: item.id, name: item.name, description: item.description || '', builtinPerms: Array.isArray(item.builtinPerms) ? item.builtinPerms.slice() : [] };
        } else {
          var nextId = 'group_' + Date.now();
          self.adminForm = { id: nextId, name: '', description: '', builtinPerms: [] };
        }
        self.adminModalVisible = true;
      };
      var cached = this.loadAdminDataRaw();
      if (cached.groups) {
        showGroupModal();
      } else {
        this.loadAdminData().then(showGroupModal).catch(showGroupModal);
      }
    }
  };

  adminMethods.closeAdminModal = function() {
    this.adminModalVisible = false;
    this.adminForm = {};
    this.adminFormPerms = {};
    this.adminEditingId = null;
  };

  adminMethods.saveAdminModal = function() {
    var self = this;
    var form = self.adminForm;

    if (self.adminModalType === 'user') {
      if (!form.username || form.username.length < 3) { showToast('用户名至少3个字符', 'warning'); return; }
      if (self.adminModalMode === 'create' && (!form.password || form.password.length < 6)) { showToast('密码至少6个字符', 'warning'); return; }

      var payload = {
        username: form.username,
        nickname: form.nickname || form.username,
        role: form.role || 'user',
        enabled: form.enabled !== false,
        groupIds: form.groupIds || []
      };
      if (self.adminModalMode === 'create') {
        payload.password = form.password;
        fetch('./api/admin/users', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(res) {
          if (!res.success) throw new Error(res.error);
          showToast('用户创建成功', 'success');
          self.closeAdminModal(); self.loadAdminData();
        }).catch(function(err) { showToast(err.message || '创建失败', 'error'); });
      } else {
        fetch('./api/admin/users/' + encodeURIComponent(self.adminEditingId), {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(res) {
          if (!res.success) throw new Error(res.error);
          showToast('保存成功', 'success');
          self.closeAdminModal(); self.loadAdminData();
        }).catch(function(err) { showToast(err.message || '保存失败', 'error'); });
      }
    } else if (self.adminModalType === 'group') {
      if (!form.name) { showToast('请输入身份组名称', 'warning'); return; }

      var builtinPerms = Array.isArray(form.builtinPerms) ? form.builtinPerms : [];
      var groupPayload = { name: form.name, description: form.description || '', builtinPerms: builtinPerms };

      if (self.adminModalMode === 'create') {
        fetch('./api/admin/groups', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupPayload)
        }).then(function(r) { return r.json(); }).then(function(res) {
          if (!res.success) throw new Error(res.error);
          showToast('身份组创建成功', 'success');
          self.closeAdminModal(); self.loadAdminData();
        }).catch(function(err) { showToast(err.message || '创建失败', 'error'); });
      } else {
        fetch('./api/admin/groups/' + encodeURIComponent(self.adminEditingId), {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupPayload)
        }).then(function(r) { return r.json(); }).then(function(res) {
          if (!res.success) throw new Error(res.error);
          showToast('保存成功', 'success');
          self.closeAdminModal(); self.loadAdminData();
        }).catch(function(err) { showToast(err.message || '保存失败', 'error'); });
      }
    }
  };

  adminMethods.deleteAdminItem = function(type, id) {
    var self = this;
    var typeName = type === 'user' ? '用户' : '身份组';
    showConfirm('确认删除此' + typeName + '吗？', '确认删除').then(function() {
      var url = type === 'user' ? './api/admin/users/' + encodeURIComponent(id)
              : './api/admin/groups/' + encodeURIComponent(id);
      fetch(url, { method: 'DELETE', credentials: 'include' })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (!res.success) throw new Error(res.error);
          showToast(typeName + '已删除', 'success');
          self.loadAdminData();
        })
        .catch(function(err) { showToast(err.message || '删除失败', 'error'); });
    }).catch(function() {});
  };

  adminMethods.resetUserPassword = function(user) {
    var self = this;
    showPrompt('为用户 "' + user.username + '" 设置新密码', '重置密码', { inputValue: '123456' }).then(function(result) {
      if (!result.value || result.value.length < 6) { showToast('密码至少6个字符', 'warning'); return; }
      fetch('./api/admin/users/' + encodeURIComponent(user.id) + '/reset-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: result.value })
      }).then(function(r) { return r.json(); }).then(function(res) {
        if (!res.success) throw new Error(res.error);
        showToast('密码已重置为: ' + result.value, 'success');
      }).catch(function(err) { showToast(err.message || '重置失败', 'error'); });
    }).catch(function() {});
  };

  // -------- Token Methods --------

  adminMethods.openApiTokenDialog = function() {
    this.tokenDialogVisible = true;
    this.loadApiTokens();
  };

  adminMethods.openCreateTokenDialog = function() {
    this.tokenForm = { name: '', scopes: ['upload', 'read'], expiryPreset: 'never', customExpiresAt: '' };
    this.createTokenDialogVisible = true;
  };

  adminMethods.resolveTokenExpiresAt = function() {
    var preset = String(this.tokenForm.expiryPreset || 'never');
    if (preset === '7d')  return Date.now() + 7 * 24 * 3600 * 1000;
    if (preset === '30d') return Date.now() + 30 * 24 * 3600 * 1000;
    if (preset === '90d') return Date.now() + 90 * 24 * 3600 * 1000;
    if (preset === 'custom') {
      var custom = Number(new Date(this.tokenForm.customExpiresAt).getTime());
      return Number.isFinite(custom) && custom > Date.now() ? custom : null;
    }
    return null;
  };

  adminMethods.loadApiTokens = function() {
    var self = this;
    self.tokenLoading = true;
    fetch('./api/admin/tokens', { method: 'GET', credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(payload) {
        if (!payload || !payload.success) throw new Error((payload || {}).error || (payload || {}).message || '加载失败');
        self.apiTokens = Array.isArray(payload.tokens) ? payload.tokens : [];
      })
      .catch(function(err) {
        showToast(err.message || '加载 API Token 失败', 'error');
      })
      .finally(function() { self.tokenLoading = false; });
  };

  adminMethods.createApiToken = function() {
    var self = this;
    var name = String(self.tokenForm.name || '').trim();
    var scopes = Array.isArray(self.tokenForm.scopes) ? self.tokenForm.scopes : [];
    if (!name) { showToast('请输入 Token 名称', 'warning'); return; }
    if (scopes.length === 0) { showToast('请至少选择一个权限', 'warning'); return; }
    var expiresAt = self.resolveTokenExpiresAt();
    if (String(self.tokenForm.expiryPreset) === 'custom' && !expiresAt) { showToast('请选择有效的未来过期时间', 'warning'); return; }
    self.tokenCreateLoading = true;
    fetch('./api/admin/tokens', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, scopes: scopes, expiresAt: expiresAt })
    }).then(function(r) { return r.json(); }).then(function(payload) {
      if (!payload || !payload.success) throw new Error((payload || {}).error || (payload || {}).message || '创建失败');
      self.createTokenDialogVisible = false;
      self.createdTokenValue = String(payload.token || '');
      self.createdTokenCopied = false;
      self.createdTokenDialogVisible = true;
      self.loadApiTokens();
    }).catch(function(err) { showToast(err.message || '创建 Token 失败', 'error');
    }).finally(function() { self.tokenCreateLoading = false; });
  };

  adminMethods.copyCreatedTokenValue = function() {
    var token = String(this.createdTokenValue || '');
    if (!token) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token).then(function() { this.createdTokenCopied = true; }.bind(this))
        .catch(function() { this.copyToClipboardFallback(token); this.createdTokenCopied = true; }.bind(this));
    } else { this.copyToClipboardFallback(token); this.createdTokenCopied = true; }
  };

  adminMethods.toggleApiTokenEnabled = function(token) {
    var self = this;
    var tokenId = (token || {}).id;
    if (!tokenId) return;
    var nextEnabled = Boolean(token.enabled);
    self.$set(self.tokenMutatingMap, tokenId, true);
    fetch('./api/admin/tokens/' + encodeURIComponent(tokenId), {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextEnabled })
    }).then(function(r) { return r.json(); }).then(function(payload) {
      if (!payload || !payload.success) throw new Error((payload || {}).error || (payload || {}).message || '更新失败');
      showToast(nextEnabled ? 'Token 已启用' : 'Token 已禁用', 'success');
    }).catch(function(err) {
      token.enabled = !nextEnabled;
      showToast(err.message || '更新 Token 状态失败', 'error');
    }).finally(function() { self.$delete(self.tokenMutatingMap, tokenId); });
  };

  adminMethods.removeApiToken = function(token) {
    var self = this;
    var tokenId = (token || {}).id;
    if (!tokenId) return;
    showConfirm('确认删除 Token「' + token.name + '」吗？', '删除确认').then(function() {
      self.$set(self.tokenMutatingMap, tokenId, true);
      fetch('./api/admin/tokens/' + encodeURIComponent(tokenId), { method: 'DELETE', credentials: 'include' })
        .then(function(r) { return r.json(); })
        .then(function(payload) {
          if (!payload || !payload.success) throw new Error((payload || {}).error || (payload || {}).message || '删除失败');
          self.apiTokens = self.apiTokens.filter(function(item) { return item.id !== tokenId; });
          showToast('Token 已删除', 'success');
        }).catch(function(err) { showToast(err.message || '删除 Token 失败', 'error');
        }).finally(function() { self.$delete(self.tokenMutatingMap, tokenId); });
    }).catch(function() {});
  };

  // -------- Move Dialog Methods --------

  adminMethods.moveSelectedToFolder = function() { this.openMoveDialog(this.selectedFiles); };

  adminMethods.openMoveDialog = function(files) {
    var candidates = Array.isArray(files) ? files.filter(Boolean) : [];
    if (candidates.length === 0) { showToast('请先选择文件', 'warning'); return; }
    this.moveDialogFiles = candidates.slice();
    this.moveDialogTargetPath = this.normalizeFolderPath(this.folderPath || '');
    this.moveDialogFolderSearch = '';
    this.moveDialogNewFolderPath = this.moveDialogTargetPath ? this.moveDialogTargetPath + '/新目录' : '新目录';
    this.moveDialogVisible = true;
  };

  adminMethods.refreshMoveDialogFolders = function(showMsg) {
    var self = this;
    if (self.moveDialogFoldersLoading) return;
    self.moveDialogFoldersLoading = true;
    self.fetchFolders().then(function(refreshed) {
      if (showMsg && refreshed) showToast('已获取最新后端目录', 'success');
      if (showMsg && !refreshed) showToast('目录刷新失败，请稍后重试', 'error');
    }).catch(function(err) { if (showMsg) showToast((err || {}).message || '目录刷新失败', 'error');
    }).finally(function() { self.moveDialogFoldersLoading = false; });
  };

  adminMethods.selectMoveDialogFolder = function(path) { this.moveDialogTargetPath = this.normalizeFolderPath(path); };

  adminMethods.createFolderAndMoveSelected = function() {
    var self = this;
    var path = self.normalizeFolderPath(self.moveDialogNewFolderPath);
    if (!path) { showToast('请输入要新建的目录路径', 'warning'); return; }
    self.moveDialogLoading = true;
    var previousFolders = self.cloneFoldersSnapshot();
    var folderCreated = false;
    self.ensureFolderBranchLocal(path);
    fetch('./api/manage/folders', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path })
    }).then(function(r) { return r.json(); }).then(function(response) {
      if (!response.success) throw new Error(response.error || '目录创建失败');
      folderCreated = true;
      self.moveDialogTargetPath = path;
      return self.moveFilesToFolder(self.moveDialogFiles, path);
    }).then(function(moved) { if (moved) self.moveDialogVisible = false;
    }).catch(function(err) {
      if (!folderCreated) { self.folders = previousFolders; self.sortFoldersLocal(); }
      showToast(err.message || '新建并移动失败', 'error');
    }).finally(function() { self.moveDialogLoading = false; });
  };

  adminMethods.confirmMoveDialog = function() {
    var self = this;
    self.moveDialogLoading = true;
    self.moveFilesToFolder(self.moveDialogFiles, self.moveDialogTargetPath).then(function(moved) {
      if (moved) self.moveDialogVisible = false;
    }).catch(function(err) { showToast(err.message || '移动文件失败', 'error');
    }).finally(function() { self.moveDialogLoading = false; });
  };

  // -------- Folder Upload --------

  adminMethods.handleAdminFolderUpload = function(event) {
    var files = Array.from(event.target.files || []);
    if (!files.length) return;
    var self = this;

    var folderPaths = new Set();
    var filesByFolder = {};

    files.forEach(function(file) {
      var relPath = file.webkitRelativePath || file.name;
      var parts = relPath.split('/');
      if (parts.length > 1) {
        var folderPath = parts.slice(0, -1).join('/');
        folderPaths.add(folderPath);
        if (!filesByFolder[folderPath]) filesByFolder[folderPath] = [];
        filesByFolder[folderPath].push(file);
      } else {
        if (!filesByFolder['']) filesByFolder[''] = [];
        filesByFolder[''].push(file);
      }
    });

    var basePath = self.normalizeFolderPath(self.folderPath);
    var folderCount = folderPaths.size;
    var fileCount = files.length;
    showToast('检测到 ' + folderCount + ' 个文件夹，共 ' + fileCount + ' 个文件', 'info');

    var sortedPaths = Array.from(folderPaths).sort(function(a, b) {
      return a.split('/').length - b.split('/').length;
    });

    var createdFolders = new Set();
    var chain = Promise.resolve();
    sortedPaths.forEach(function(relFolder) {
      chain = chain.then(function() {
        var fullPath = basePath ? basePath + '/' + relFolder : relFolder;
        var normalized = self.normalizeFolderPath(fullPath);
        if (!normalized || createdFolders.has(normalized)) return;
        return fetch('./api/manage/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: normalized })
        }).then(function() { createdFolders.add(normalized); })
          .catch(function(err) { console.warn('Failed to create folder:', normalized, err); });
      });
    });

    chain.then(function() {
      var uploadChain = Promise.resolve();
      Object.keys(filesByFolder).forEach(function(relFolder) {
        uploadChain = uploadChain.then(function() {
          var targetPath = relFolder ? (basePath ? basePath + '/' + relFolder : relFolder) : basePath;
          var normalizedPath = self.normalizeFolderPath(targetPath);
          var folderFiles = filesByFolder[relFolder];
          var fileChain = Promise.resolve();
          folderFiles.forEach(function(file) {
            fileChain = fileChain.then(function() {
              var formData = new FormData();
              formData.append('file', file);
              formData.append('folderPath', normalizedPath);
              if (self.currentAdminUser && self.currentAdminUser.username) {
                formData.append('uploadedBy', self.currentAdminUser.username);
              }
              return fetch('./upload', { method: 'POST', body: formData, credentials: 'include' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  if (Array.isArray(data) && data[0] && data[0].src) {
                    showToast('已上传: ' + file.name, 'success');
                  }
                }).catch(function(err) { showToast('上传失败: ' + file.name + ' - ' + (err.message || '未知'), 'error'); });
            });
          });
          return fileChain;
        });
      });
      return uploadChain;
    }).then(function() {
      showToast('文件夹上传完成！', 'success');
      self.refreshFileList({ preferCache: false, syncFolders: true });
    });

    event.target.value = '';
  };

  // ==================== Computed ====================

  var adminComputed = {};

  adminComputed.allGroups = function() {
    var data = this.loadAdminDataRaw();
    return data.groups || [];
  };

  adminComputed.filteredUserList = function() {
    var query = (this.userSearchQuery || '').toLowerCase().trim();
    var list = this.adminList || [];
    if (!query) return list;
    if (this.activeTab !== 'users') return list;
    return list.filter(function(u) {
      return (u.username || '').toLowerCase().indexOf(query) !== -1 ||
             (u.nickname || '').toLowerCase().indexOf(query) !== -1;
    });
  };

  adminComputed.sessionUserAvatar = function() {
    if (!this.currentAdminUser) return '?';
    if (this.currentAdminUser.avatar) {
      return '<img src="' + String(this.currentAdminUser.avatar).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"').replace(/'/g,''') + '" alt="avatar">';
    }
    return this.getInitials(this.currentAdminUser.nickname || this.currentAdminUser.username);
  };

  adminComputed.moveDialogTargetLabel = function() {
    return this.normalizeFolderPath(this.moveDialogTargetPath || '') || '根目录';
  };

  adminComputed.moveDialogFolderOptions = function() {
    var self = this;
    var keyword = String(self.moveDialogFolderSearch || '').trim().toLowerCase();
    var normalized = {};
    normalized[''] = { path: '', label: '根目录', fileCount: self.folderPath ? 0 : self.Number };
    (self.folders || []).forEach(function(folder) {
      var path = self.normalizeFolderPath(folder.path || folder.folderPath || '');
      if (!path) return;
      normalized[path] = { path: path, label: path, fileCount: Number(folder.fileCount || 0) };
    });
    return Object.values(normalized).filter(function(f) {
      if (!keyword) return true;
      return f.label.toLowerCase().indexOf(keyword) !== -1;
    }).map(function(f) {
      return Object.assign({}, f, { fileCountLabel: f.path ? (f.fileCount + ' 个文件') : '根目录' });
    }).sort(function(a, b) {
      if (!a.path) return -1; if (!b.path) return 1;
      var da = a.path.split('/').length, db = b.path.split('/').length;
      if (da !== db) return da - db;
      return a.path.localeCompare(b.path, 'zh-CN');
    });
  };

  // ==================== Merge Helper ====================

  global.mergeAdminModules = function(options) {
    if (!options) options = {};
    options.data = options.data || {};
    options.methods = options.methods || {};
    options.computed = options.computed || {};

    // Merge data
    var dataDefaults = adminData();
    Object.keys(dataDefaults).forEach(function(key) {
      if (options.data[key] === undefined) {
        options.data[key] = dataDefaults[key];
      }
    });

    // Merge methods
    Object.keys(adminMethods).forEach(function(key) {
      if (!options.methods[key]) {
        options.methods[key] = adminMethods[key];
      }
    });

    // Merge computed
    Object.keys(adminComputed).forEach(function(key) {
      if (!options.computed[key]) {
        options.computed[key] = adminComputed[key];
      }
    });

    return options;
  };

  // Also expose separately for direct use
  global.adminModules = {
    data: adminData,
    methods: adminMethods,
    computed: adminComputed
  };

})(window);
