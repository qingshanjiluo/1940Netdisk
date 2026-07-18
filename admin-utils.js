// ============================================================
// 1940Netdisk · Admin 通用工具函数
// 钢化玻璃 UI · Toast / Confirm / Prompt / Alert
// ============================================================

/**
 * 显示 Toast 通知
 * @param {string} message  - 消息内容
 * @param {string} [type='info']  - 类型: info/success/warning/error
 * @param {number} [duration=3000] - 显示时长(ms)
 */
function showToast(message, type, duration) {
  type = type || 'info'; duration = duration || 3000;
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = message;
  container.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('toast-in'); });
  setTimeout(function(){
    t.classList.remove('toast-in'); t.classList.add('toast-out');
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 400);
  }, duration);
}

/**
 * 显示确认对话框
 * @param {string} message  - 提示内容
 * @param {string} [title='提示']
 * @param {object} [options] - { confirmButtonText, cancelButtonText }
 * @returns {Promise<void>} resolve → 确认, reject → 取消
 */
function showConfirm(message, title, options) {
  options = options || {};
  return new Promise(function(resolve, reject){
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);';
    overlay.innerHTML = '<div class="glass-card" style="max-width:420px;width:90%;padding:24px;"><h3 style="margin:0 0 12px;font-size:1em;">'+(title||'提示')+'</h3><p style="font-size:.88em;margin:0 0 20px;line-height:1.6;">'+message+'</p><div style="display:flex;justify-content:flex-end;gap:8px;"><button class="btn btn-ghost confirm-cancel">'+(options.cancelButtonText||'取消')+'</button><button class="btn btn-primary confirm-ok">'+(options.confirmButtonText||'确定')+'</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.confirm-ok').onclick = function(){ try { document.body.removeChild(overlay); } catch(e) {} resolve(); };
    overlay.querySelector('.confirm-cancel').onclick = function(){ try { document.body.removeChild(overlay); } catch(e) {} reject('cancel'); };
  });
}

/**
 * 显示输入对话框
 * @param {string} message  - 提示内容
 * @param {string} title    - 标题
 * @param {object} [opts]   - { inputValue, confirmButtonText, cancelButtonText, inputValidator }
 * @returns {Promise<{value: string}>} resolve({value}) → 确认, reject → 取消
 */
function showPrompt(message, title, opts) {
  opts = opts || {};
  return new Promise(function(resolve, reject){
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);';
    overlay.innerHTML = '<div class="glass-card" style="max-width:420px;width:90%;padding:24px;"><h3 style="margin:0 0 12px;font-size:1em;">'+title+'</h3><input class="input-glass prompt-input" value="'+(opts.inputValue||'')+'" style="width:100%;margin-bottom:12px;" placeholder="请输入"><div style="display:flex;justify-content:flex-end;gap:8px;"><button class="btn btn-ghost prompt-cancel">'+(opts.cancelButtonText||'取消')+'</button><button class="btn btn-primary prompt-ok">'+(opts.confirmButtonText||'确定')+'</button></div></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('.prompt-input');
    setTimeout(function(){ input.focus(); input.select(); }, 50);
    overlay.querySelector('.prompt-ok').onclick = function(){
      var val = input.value;
      if (opts.inputValidator) {
        var valid = opts.inputValidator(val);
        if (valid !== true) { showToast(valid||'输入无效', 'warning'); return; }
      }
      try { document.body.removeChild(overlay); } catch(e) {} resolve({ value: val });
    };
    overlay.querySelector('.prompt-cancel').onclick = function(){ try { document.body.removeChild(overlay); } catch(e) {} reject('cancel'); };
    input.onkeydown = function(e){ if(e.key==='Enter'){ overlay.querySelector('.prompt-ok').click(); } };
  });
}

/**
 * 显示纯文本展示对话框
 * @param {string} html     - HTML 内容
 * @param {string} [title='提示']
 * @param {object} [opts]   - { confirmButtonText }
 * @returns {Promise<void>}
 */
function showAlert(html, title, opts) {
  opts = opts || {};
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);';
    overlay.innerHTML = '<div class="glass-card" style="max-width:480px;width:90%;padding:24px;"><h3 style="margin:0 0 12px;font-size:1em;">'+title+'</h3><div style="font-size:.85em;margin-bottom:20px;line-height:1.8;">'+html+'</div><div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary alert-ok">'+(opts.confirmButtonText||'确定')+'</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.alert-ok').onclick = function(){ try { document.body.removeChild(overlay); } catch(e) {} resolve(); };
  });
}
