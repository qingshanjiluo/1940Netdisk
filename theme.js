// ============================================================
// 1940Netdisk — Theme Manager & UI Design Manager
// 钢铁玻璃主题 · 精简兼容层
// ============================================================
// 向后兼容: 保留 ThemeManager / UIDesignManager 全局接口
// 所有样式由 CSS 变量驱动，JS 仅负责切换 data-theme
// ============================================================

(function () {
  'use strict';

  // ======================================================================
  // 第一部分: ThemeManager — 主题切换
  // ======================================================================

  var STORAGE_KEY = '1940netdisk_theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch (_) {
      return 'dark';
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) { /* noop */ }
  }

  function applyTheme(theme, options) {
    var opts = options || {};
    var html = document.documentElement;
    html.setAttribute('data-theme', theme);
    setStoredTheme(theme);

    // 更新所有主题切换按钮的图标
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      updateToggleVisual(buttons[i], theme);
    }

    // 触发自定义事件
    var event = new CustomEvent('theme-change', {
      detail: { theme: theme }
    });
    document.dispatchEvent(event);

    if (opts.onApplied) {
      opts.onApplied(theme);
    }
  }

  function updateToggleVisual(button, theme) {
    var isDark = theme === 'dark';
    button.innerHTML = isDark
      ? '<i class="fas fa-moon"></i>'
      : '<i class="fas fa-sun"></i>';
    button.setAttribute('aria-label', isDark ? '切换亮色模式' : '切换暗色模式');
  }

  function bindToggle(button) {
    button.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, {
        onApplied: function () {
          // 同步 UIDesignManager 背景色
          if (window.UIDesignManager && typeof window.UIDesignManager.syncBackground === 'function') {
            window.UIDesignManager.syncBackground();
          }
        }
      });
    });
  }

  function initToggleButtons() {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      bindToggle(buttons[i]);
    }
  }

  // 注入主题切换按钮（用于没有 data-theme-toggle 的页面）
  function ensureAutoToggle() {
    if (document.querySelector('[data-theme-toggle]')) return;

    var container = document.querySelector('.nav-right') ||
                    document.querySelector('.header-actions') ||
                    document.querySelector('.actions') ||
                    document.querySelector('.page .header .header-actions');
    if (!container) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle-btn';
    btn.setAttribute('data-theme-toggle', '');
    btn.setAttribute('aria-label', '切换主题');
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateToggleVisual(btn, currentTheme);
    container.appendChild(btn);
    bindToggle(btn);
  }

  // MutationObserver 监听动态添加的切换按钮
  function observeNewToggles() {
    var observer = new MutationObserver(function () {
      var unbound = document.querySelectorAll('[data-theme-toggle]:not([data-theme-bound])');
      for (var i = 0; i < unbound.length; i++) {
        unbound[i].setAttribute('data-theme-bound', 'true');
        bindToggle(unbound[i]);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 初始化
  function initTheme() {
    var stored = getStoredTheme();
    applyTheme(stored);
    initToggleButtons();
    ensureAutoToggle();
    observeNewToggles();
  }

  var ThemeManager = {
    getTheme: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
    setTheme: function (theme, options) {
      applyTheme(theme, options);
    },
    toggle: function () {
      var current = this.getTheme();
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    },
    getStoredTheme: getStoredTheme,
    reset: function () {
      applyTheme('dark');
    }
  };

  // ======================================================================
  // 第二部分: UIDesignManager — UI 配置管理 (精简兼容层)
  // ======================================================================
  // 保留全部公共 API，内部实现简化为 CSS 变量驱动
  // - syncFromServer → 读取 /api/ui-config (GET)
  // - saveToServer → 写入 /api/ui-config (POST)
  // - applySettings → 设置 CSS 变量 + 背景层
  // - 所有 canvas / 粒子效果精简保留

  var SETTINGS_KEY = '1940netdisk_ui_settings';

  // 默认配置
  var DEFAULTS = {
    backgroundStyle: 'default',     // 'default' | 'custom'
    customBackground: '',           // 自定义背景 URL
    bgBrightness: 100,              // 背景亮度 50-150
    effectStyle: 'math',           // 'none' | 'math' | 'particle'
    effectIntensity: 5,            // 效果强度 0-10
    cardOpacity: 85,               // 卡片不透明度 50-100
    cardBlur: 12,                  // 卡片模糊 0-24
    accentColor: '#5A6B4A'        // 强调色 (olive)
  };

  // ---------- 工具函数 ----------
  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function normalizeHexColor(value) {
    if (!value || typeof value !== 'string') return DEFAULTS.accentColor;
    var hex = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
    if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
      return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return DEFAULTS.accentColor;
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed) return '';
    // 只允许 http/https/data 协议
    if (/^(https?:\/\/|data:image\/)/.test(trimmed)) return trimmed;
    return '';
  }

  // ---------- 本地存储 ----------
  function readSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (_) { /* ignore */ }
    return {};
  }

  function saveLocalSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) { /* noop */ }
  }

  // ---------- 服务端通信 ----------
  function getApiBase() {
    // 优先使用全局 API 基础路径
    if (window.API_BASE) return window.API_BASE;
    return '';
  }

  function requestUiConfig(method, config) {
    var url = getApiBase() + '/api/ui-config';
    var init = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (method === 'POST' && config) {
      init.body = JSON.stringify(config);
    }
    return fetch(url, init).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
        });
      }
      return res.json();
    });
  }

  function syncFromServer(options) {
    var opts = options || {};
    return requestUiConfig('GET')
      .then(function (data) {
        var settings;
        if (data && data.config) {
          settings = normalizeSettings(data.config);
        } else if (data && typeof data === 'object' && data.backgroundStyle !== undefined) {
          settings = normalizeSettings(data);
        } else {
          settings = {};
        }
        applySettings(settings, { persist: true });
        if (opts.onSuccess) opts.onSuccess(settings);
        return settings;
      })
      .catch(function (err) {
        // 服务端不可用时回退到本地
        var local = readSettings();
        if (Object.keys(local).length > 0) {
          applySettings(local, { persist: true });
          if (opts.onSuccess) opts.onSuccess(local);
          return local;
        }
        if (opts.onError) opts.onError(err);
        throw err;
      });
  }

  function saveToServer(partial, options) {
    var opts = options || {};
    var merged = {};
    var current = readSettings();
    // 合并现有设置与部分更新
    for (var k in DEFAULTS) {
      if (partial[k] !== undefined) {
        merged[k] = partial[k];
      } else if (current[k] !== undefined) {
        merged[k] = current[k];
      } else {
        merged[k] = DEFAULTS[k];
      }
    }
    var localApplied = applySettings(merged, { persist: true });
    return requestUiConfig('POST', localApplied)
      .then(function (data) {
        if (opts.onSuccess) opts.onSuccess(data);
        return data;
      })
      .catch(function (err) {
        if (opts.onError) opts.onError(err);
        throw err;
      });
  }

  function normalizeSettings(raw) {
    if (!raw || typeof raw !== 'object') return {};
    var s = {};
    s.backgroundStyle = (raw.backgroundStyle === 'custom') ? 'custom' : 'default';
    s.customBackground = sanitizeUrl(raw.customBackground);
    s.bgBrightness = clampNumber(raw.bgBrightness, 50, 150);
    s.effectStyle = (raw.effectStyle === 'math' || raw.effectStyle === 'particle') ? raw.effectStyle : 'none';
    s.effectIntensity = clampNumber(raw.effectIntensity, 0, 10);
    s.cardOpacity = clampNumber(raw.cardOpacity, 50, 100);
    s.cardBlur = clampNumber(raw.cardBlur, 0, 24);
    s.accentColor = normalizeHexColor(raw.accentColor);
    return s;
  }

  // ---------- 背景层管理 ----------
  function ensureLayer(tagName, className) {
    var el = document.querySelector('.' + className);
    if (!el) {
      el = document.createElement(tagName);
      el.className = className;
      el.id = className;
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:-1;';
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  }

  function ensureLayers() {
    return {
      image: ensureLayer('div', 'ui-bg-image'),
      canvas: ensureLayer('canvas', 'ui-canvas'),
      noise: ensureLayer('div', 'ui-noise')
    };
  }

  // ---------- Canvas 效果 (精简版) ----------
  var canvasCtx = null;
  var canvasAnimId = null;
  var canvasNodes = [];
  var lastTimestamp = 0;

  function getCanvasSize() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function ensureCanvasSize() {
    var layers = ensureLayers();
    var canvas = layers.canvas;
    var size = getCanvasSize();
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    if (!canvasCtx) {
      canvasCtx = canvas.getContext('2d');
    }
  }

  function clearCanvas() {
    if (canvasCtx) {
      var size = getCanvasSize();
      canvasCtx.clearRect(0, 0, size.w, size.h);
    }
  }

  function stopRender(shouldClear) {
    if (canvasAnimId) {
      cancelAnimationFrame(canvasAnimId);
      canvasAnimId = null;
    }
    canvasNodes = [];
    if (shouldClear) {
      clearCanvas();
    }
    canvasCtx = null;
  }

  function getEffectNodeCount(intensity, mobile) {
    var base = mobile ? 15 : 30;
    return Math.floor(base * (intensity / 10));
  }

  function buildMathSymbols(count) {
    var symbols = '∑∫∂√∞π∏∧∨∩∪∈∉⊂⊃⊆⊇≤≥≠±∓×÷';
    var nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        char: symbols[Math.floor(Math.random() * symbols.length)],
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 10 + Math.random() * 20,
        speed: 0.15 + Math.random() * 0.3,
        opacity: 0.03 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2
      });
    }
    return nodes;
  }

  function buildParticles(count) {
    var nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: 1 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.12,
        hue: 90 + Math.random() * 40  // green-ish range
      });
    }
    return nodes;
  }

  function renderMathSymbols() {
    if (!canvasCtx) return;
    clearCanvas();
    var ctx = canvasCtx;
    var size = getCanvasSize();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < canvasNodes.length; i++) {
      var n = canvasNodes[i];
      n.y -= n.speed;
      if (n.y < -20) {
        n.y = size.h + 20;
        n.x = Math.random() * size.w;
      }
      ctx.font = n.size + 'px "Times New Roman", serif';
      ctx.fillStyle = 'rgba(184, 168, 138, ' + n.opacity + ')';
      ctx.fillText(n.char, n.x, n.y);
    }

    canvasAnimId = requestAnimationFrame(renderMathSymbols);
  }

  function renderParticles() {
    if (!canvasCtx) return;
    clearCanvas();
    var ctx = canvasCtx;
    var size = getCanvasSize();

    for (var i = 0; i < canvasNodes.length; i++) {
      var n = canvasNodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0) n.x = size.w;
      if (n.x > size.w) n.x = 0;
      if (n.y < 0) n.y = size.h;
      if (n.y > size.h) n.y = 0;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + n.hue + ', 30%, 60%, ' + n.opacity + ')';
      ctx.fill();
    }

    canvasAnimId = requestAnimationFrame(renderParticles);
  }

  function startRender(style, intensity) {
    stopRender(true);
    if (style === 'none' || !intensity || intensity <= 0) return;

    var mobile = window.innerWidth < 768;
    var count = getEffectNodeCount(intensity, mobile);
    ensureCanvasSize();

    if (style === 'math') {
      canvasNodes = buildMathSymbols(count);
      renderMathSymbols();
    } else if (style === 'particle') {
      canvasNodes = buildParticles(count);
      renderParticles();
    }
  }

  // ---------- 应用设置 ----------
  function applySettings(next, options) {
    var opts = options || {};
    var settings = normalizeSettings(next);

    // 持久化
    if (opts.persist !== false) {
      saveLocalSettings(settings);
    }

    // 1. 背景样式
    var layers = ensureLayers();
    var imageLayer = layers.image;
    var noiseLayer = layers.noise;

    // 重置背景层
    imageLayer.style.background = 'none';
    imageLayer.style.opacity = '1';

    if (settings.backgroundStyle === 'custom' && settings.customBackground) {
      imageLayer.style.background = 'url(' + settings.customBackground + ') center/cover no-repeat';
      noiseLayer.style.opacity = String(0.035 * (settings.bgBrightness / 100));
    } else {
      // 默认渐变背景
      imageLayer.style.background = '';
      imageLayer.style.opacity = '';
      noiseLayer.style.opacity = '0.035';
    }

    // 2. 背景亮度
    document.body.style.filter = 'brightness(' + (settings.bgBrightness / 100) + ')';

    // 3. CSS 变量 — 卡片不透明度 + 模糊
    var root = document.documentElement;
    var opacityVal = clampNumber(settings.cardOpacity, 50, 100) / 100;
    var blurVal = clampNumber(settings.cardBlur, 0, 24);
    root.style.setProperty('--glass-bg', 'rgba(26, 30, 34, ' + (0.85 * opacityVal) + ')');
    root.style.setProperty('--glass-blur', blurVal + 'px');

    // 4. 强调色
    var accent = normalizeHexColor(settings.accentColor);
    // 不覆盖 --olive 因为 CSS 中有多处引用，改为只对 --color-accent 赋值
    root.style.setProperty('--color-accent', accent);

    // 5. Canvas 效果
    startRender(settings.effectStyle, settings.effectIntensity);

    // 6. 分发事件
    dispatchDesignChange(settings, opts.persist !== false);

    return settings;
  }

  function dispatchDesignChange(settings, persisted) {
    var event = new CustomEvent('design-change', {
      detail: {
        settings: settings,
        persisted: persisted
      }
    });
    document.dispatchEvent(event);
  }

  // ---------- 公共 API ----------
  function setSettings(partial, options) {
    var current = readSettings();
    var merged = {};
    for (var k in DEFAULTS) {
      if (partial[k] !== undefined) {
        merged[k] = partial[k];
      } else if (current[k] !== undefined) {
        merged[k] = current[k];
      } else {
        merged[k] = DEFAULTS[k];
      }
    }
    return applySettings(merged, options);
  }

  function previewSettings(partial) {
    return setSettings(partial, { persist: false });
  }

  function resetSettings() {
    return applySettings(DEFAULTS, { persist: true });
  }

  function restorePersisted() {
    var saved = readSettings();
    if (Object.keys(saved).length > 0) {
      return applySettings(saved, { persist: true });
    }
    return applySettings(DEFAULTS, { persist: true });
  }

  function clearBackgrounds(options) {
    return setSettings(
      {
        backgroundStyle: 'default',
        customBackground: '',
        effectStyle: 'none'
      },
      options
    );
  }

  // ---------- 初始化 ----------
  function initUIDesign() {
    // 加载持久化设置
    restorePersisted();

    // 监听窗口 resize 调整 canvas
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (canvasCtx) {
          ensureCanvasSize();
        }
      }, 200);
    });

    // 监听主题变化同步背景
    document.addEventListener('theme-change', function () {
      syncBackground();
    });
  }

  // 同步背景（主题变化后重新应用设置）
  function syncBackground() {
    var current = readSettings();
    if (Object.keys(current).length > 0) {
      applySettings(current, { persist: false });
    }
  }

  var manager = {
    // 配置
    DEFAULTS: DEFAULTS,

    // 核心方法
    syncFromServer: syncFromServer,
    saveToServer: saveToServer,
    applySettings: applySettings,
    setSettings: setSettings,
    previewSettings: previewSettings,
    resetSettings: resetSettings,
    restorePersisted: restorePersisted,
    clearBackgrounds: clearBackgrounds,

    // 背景同步
    syncBackground: syncBackground,

    // 效果控制
    startRender: startRender,
    stopRender: stopRender,

    // 读取
    getSettings: readSettings,
    getDefaults: function () { return DEFAULTS; },

    // 快捷方法
    setAccentColor: function (color) {
      return setSettings({ accentColor: color });
    },
    setBackground: function (url) {
      return setSettings({
        backgroundStyle: url ? 'custom' : 'default',
        customBackground: url || ''
      });
    }
  };

  // ======================================================================
  // 第三部分: 暴露全局接口
  // ======================================================================

  window.ThemeManager = ThemeManager;
  window.UIDesignManager = manager;

  // 导出给 Vue 等框架使用
  window.__1940NetdiskTheme = ThemeManager;
  window.__1940NetdiskUIDesign = manager;

  // ======================================================================
  // 第四部分: 启动
  // ======================================================================

  function boot() {
    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initUIDesign();
      });
    } else {
      initTheme();
      initUIDesign();
    }
  }

  boot();
})();
