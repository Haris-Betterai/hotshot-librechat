(function () {
  var script = document.currentScript;
  if (!script || !script.getAttribute) {
    script = document.querySelector('script[data-embed-id][src*="embed.js"]');
  }
  if (!script) {
    return;
  }

  var embedId = script.getAttribute('data-embed-id');
  if (!embedId) {
    return;
  }

  if (window.__hotshotEmbedLoaded || document.getElementById('hotshot-embed-widget')) {
    return;
  }
  window.__hotshotEmbedLoaded = true;

  var origin = new URL(script.src, window.location.href).origin;
  var iframeSrc = origin + '/embed/' + encodeURIComponent(embedId);
  var startOpen = script.getAttribute('data-open') === '1';

  /* Mirrors DEFAULT_EMBED_WIDGET_SETTINGS in packages/data-provider/src/embed.ts */
  var DEFAULTS = {
    color: '#2563eb',
    position: 'right',
    offsetX: 20,
    offsetY: 20,
    width: 380,
    height: 600,
    mobileFullscreen: true,
    teaserText: '',
    teaserDelay: 3,
    autoOpenSeconds: 0,
  };

  var KEY = 'hotshot-embed:' + embedId + ':';
  var HEX = /^#[0-9a-f]{6}$/i;

  function store(action, name, value) {
    try {
      if (action === 'set') {
        window.sessionStorage.setItem(KEY + name, value);
        return null;
      }
      return window.sessionStorage.getItem(KEY + name);
    } catch (err) {
      return null;
    }
  }

  function num(value, fallback) {
    var n = typeof value === 'number' ? value : Number(value);
    return isFinite(n) && value !== null && value !== '' ? n : fallback;
  }

  function resolveSettings(raw) {
    var s = raw && typeof raw === 'object' ? raw : {};
    var color = typeof s.color === 'string' ? s.color.trim() : '';
    return {
      color: HEX.test(color) ? color : DEFAULTS.color,
      position: s.position === 'left' ? 'left' : 'right',
      offsetX: Math.max(0, num(s.offsetX, DEFAULTS.offsetX)),
      offsetY: Math.max(0, num(s.offsetY, DEFAULTS.offsetY)),
      width: Math.max(0, num(s.width, DEFAULTS.width)),
      height: Math.max(0, num(s.height, DEFAULTS.height)),
      mobileFullscreen:
        typeof s.mobileFullscreen === 'boolean' ? s.mobileFullscreen : DEFAULTS.mobileFullscreen,
      teaserText: typeof s.teaserText === 'string' ? s.teaserText.trim() : DEFAULTS.teaserText,
      teaserDelay: Math.max(0, num(s.teaserDelay, DEFAULTS.teaserDelay)),
      autoOpenSeconds: Math.max(0, num(s.autoOpenSeconds, DEFAULTS.autoOpenSeconds)),
    };
  }

  function readableOn(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    function lin(c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    var lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return lum > 0.5 ? '#111827' : '#ffffff';
  }

  function hexToRgba(hex, alpha) {
    return (
      'rgba(' +
      parseInt(hex.slice(1, 3), 16) +
      ',' +
      parseInt(hex.slice(3, 5), 16) +
      ',' +
      parseInt(hex.slice(5, 7), 16) +
      ',' +
      alpha +
      ')'
    );
  }

  function resolveIcon(url) {
    if (typeof url !== 'string' || !url) {
      return null;
    }
    return /^https?:\/\//i.test(url) ? url : origin + url;
  }

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 12H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z"/></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg>';

  function buildCss(s) {
    var side = s.position;
    var fg = readableOn(s.color);
    var id = '#hotshot-embed-widget';
    var w = 'min(' + s.width + 'px,calc(100vw - 24px))';
    var h = 'min(' + s.height + 'px,calc(100vh - 100px))';
    return (
      id +
      '{all:initial;position:fixed;' +
      side +
      ':' +
      s.offsetX +
      'px;bottom:' +
      s.offsetY +
      'px;width:56px;height:56px;z-index:2147483000;display:block;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.4;}' +
      id +
      ' *{box-sizing:border-box;}' +
      id +
      ' .hse-panel{position:absolute;' +
      side +
      ':0;bottom:68px;width:' +
      w +
      ';height:' +
      h +
      ';border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(15,23,42,.22);opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transform-origin:bottom ' +
      side +
      ';transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s,width .25s ease,height .25s ease;}' +
      id +
      '.hse-open .hse-panel{opacity:1;visibility:visible;transform:none;transition:opacity .2s ease,transform .2s ease,visibility 0s,width .25s ease,height .25s ease;}' +
      id +
      ' iframe{display:block;width:100%;height:100%;border:0;background:#fff;}' +
      id +
      ' .hse-launcher{all:unset;box-sizing:border-box;position:relative;display:block;width:56px;height:56px;border-radius:999px;background:' +
      s.color +
      ';color:' +
      fg +
      ';cursor:pointer;overflow:hidden;box-shadow:0 8px 24px ' +
      hexToRgba(s.color, 0.45) +
      ';transition:transform .2s ease;}' +
      id +
      ' .hse-launcher:hover{transform:scale(1.05);}' +
      id +
      ' .hse-launcher:focus-visible{outline:2px solid ' +
      s.color +
      ';outline-offset:3px;}' +
      id +
      ' .hse-ico{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transition:opacity .2s ease,transform .2s ease;}' +
      id +
      ' .hse-ico svg{width:26px;height:26px;fill:currentColor;}' +
      id +
      ' .hse-ico img{width:100%;height:100%;object-fit:cover;display:block;}' +
      id +
      ' .hse-ico-close{opacity:0;transform:rotate(-90deg) scale(.6);}' +
      id +
      '.hse-open .hse-ico-open{opacity:0;transform:rotate(90deg) scale(.6);}' +
      id +
      '.hse-open .hse-ico-close{opacity:1;transform:none;}' +
      id +
      ' .hse-teaser{position:absolute;' +
      side +
      ':68px;bottom:8px;max-width:min(260px,calc(100vw - 120px));display:flex;align-items:flex-start;gap:6px;padding:10px 8px 10px 14px;border-radius:14px;background:#fff;color:#111827;border:1px solid ' +
      hexToRgba(s.color, 0.35) +
      ';border-left:3px solid ' +
      s.color +
      ';box-shadow:0 6px 24px rgba(15,23,42,.18);opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s;}' +
      id +
      ' .hse-teaser.hse-show{opacity:1;visibility:visible;transform:none;transition:opacity .2s ease,transform .2s ease,visibility 0s;}' +
      id +
      '.hse-open .hse-teaser{display:none;}' +
      id +
      ' .hse-teaser-text{all:unset;cursor:pointer;font:inherit;color:inherit;text-align:left;word-break:break-word;}' +
      id +
      ' .hse-teaser-text:focus-visible,' +
      id +
      ' .hse-teaser-x:focus-visible{outline:2px solid ' +
      s.color +
      ';outline-offset:2px;border-radius:4px;}' +
      id +
      ' .hse-teaser-x{all:unset;cursor:pointer;flex:none;width:20px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#6b7280;}' +
      id +
      ' .hse-teaser-x:hover{background:#f3f4f6;color:#111827;}' +
      id +
      ' .hse-teaser-x svg{width:14px;height:14px;fill:currentColor;}' +
      id +
      '.expanded .hse-panel{width:min(75vw,1240px);height:min(75vh,960px);}' +
      '@media (max-width:768px){' +
      id +
      '.expanded .hse-panel{width:calc(100vw - 16px);height:calc(100vh - 16px);}}' +
      (s.mobileFullscreen
        ? '@media (max-width:639px){' +
          id +
          '.hse-open .hse-panel,' +
          id +
          '.hse-open.expanded .hse-panel{position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;border-radius:0;box-shadow:none;}' +
          id +
          '.hse-open .hse-launcher{display:none;}}'
        : '') +
      '@media (prefers-reduced-motion:reduce){' +
      id +
      ' *{transition:none !important;animation:none !important;}}'
    );
  }

  function mount(raw) {
    var cfg = raw && typeof raw === 'object' ? raw : {};
    var s = resolveSettings(cfg.settings);
    var iconUrl = resolveIcon(cfg.iconUrl);

    var style = document.createElement('style');
    style.textContent = buildCss(s);
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'hotshot-embed-widget';
    root.setAttribute('data-position', s.position);

    var panel = document.createElement('div');
    panel.className = 'hse-panel';
    panel.id = 'hotshot-embed-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat');

    var launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'hse-launcher';
    launcher.setAttribute('aria-label', 'Open chat');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', panel.id);

    var icoOpen = document.createElement('span');
    icoOpen.className = 'hse-ico hse-ico-open';
    if (iconUrl) {
      var img = document.createElement('img');
      img.alt = '';
      img.src = iconUrl;
      icoOpen.appendChild(img);
    } else {
      icoOpen.innerHTML = CHAT_SVG;
    }
    var icoClose = document.createElement('span');
    icoClose.className = 'hse-ico hse-ico-close';
    icoClose.innerHTML = CLOSE_SVG;
    launcher.appendChild(icoOpen);
    launcher.appendChild(icoClose);

    var teaser = null;
    var teaserTimer = null;
    var autoTimer = null;
    var frame = null;
    var isOpen = false;

    function ensureFrame() {
      if (frame) {
        return;
      }
      frame = document.createElement('iframe');
      frame.src = iframeSrc;
      frame.title = 'Chat';
      frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      frame.setAttribute('allow', 'microphone; clipboard-write; autoplay');
      panel.appendChild(frame);
    }

    function hideTeaser(remember) {
      if (teaserTimer) {
        clearTimeout(teaserTimer);
        teaserTimer = null;
      }
      if (teaser) {
        teaser.classList.remove('hse-show');
      }
      if (remember) {
        store('set', 'teaser', '1');
      }
    }

    function setOpen(next, byUser) {
      if (next === isOpen) {
        return;
      }
      isOpen = next;
      root.classList.toggle('hse-open', next);
      launcher.setAttribute('aria-expanded', next ? 'true' : 'false');
      launcher.setAttribute('aria-label', next ? 'Close chat' : 'Open chat');
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
      if (next) {
        ensureFrame();
        hideTeaser(true);
        store('set', 'opened', '1');
        return;
      }
      if (byUser) {
        store('set', 'closed', '1');
      }
    }

    if (s.teaserText) {
      teaser = document.createElement('div');
      teaser.className = 'hse-teaser';
      var teaserBtn = document.createElement('button');
      teaserBtn.type = 'button';
      teaserBtn.className = 'hse-teaser-text';
      teaserBtn.textContent = s.teaserText;
      teaserBtn.addEventListener('click', function () {
        setOpen(true, true);
      });
      var teaserX = document.createElement('button');
      teaserX.type = 'button';
      teaserX.className = 'hse-teaser-x';
      teaserX.setAttribute('aria-label', 'Dismiss message');
      teaserX.innerHTML = CLOSE_SVG;
      teaserX.addEventListener('click', function () {
        hideTeaser(true);
      });
      teaser.appendChild(teaserBtn);
      teaser.appendChild(teaserX);

      if (!store('get', 'teaser') && !store('get', 'opened') && !startOpen) {
        teaserTimer = setTimeout(function () {
          teaserTimer = null;
          if (!isOpen && !store('get', 'teaser')) {
            teaser.classList.add('hse-show');
          }
        }, s.teaserDelay * 1000);
      }
    }

    launcher.addEventListener('click', function () {
      setOpen(!isOpen, true);
    });

    root.appendChild(panel);
    if (teaser) {
      root.appendChild(teaser);
    }
    root.appendChild(launcher);
    document.body.appendChild(root);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !isOpen) {
        return;
      }
      if (root.contains(document.activeElement)) {
        setOpen(false, true);
        launcher.focus();
      }
    });

    window.addEventListener('message', function (event) {
      try {
        if (event.origin !== origin) {
          return;
        }
        var data = event.data || {};
        if (data.type === 'hotshot-embed-resize') {
          root.classList.toggle('expanded', !!data.expanded);
        } else if (data.type === 'hotshot-embed-close') {
          setOpen(false, true);
        }
      } catch (err) {
        /* ignore malformed messages */
      }
    });

    window.HotshotWidget = {
      open: function () {
        setOpen(true, false);
      },
      close: function () {
        setOpen(false, true);
      },
      toggle: function () {
        setOpen(!isOpen, true);
      },
    };

    if (startOpen) {
      setOpen(true, false);
    } else if (s.autoOpenSeconds > 0 && !store('get', 'closed') && !store('get', 'opened')) {
      autoTimer = setTimeout(function () {
        autoTimer = null;
        if (!store('get', 'closed')) {
          setOpen(true, false);
        }
      }, s.autoOpenSeconds * 1000);
    }
  }

  function start(cfg) {
    if (document.body) {
      mount(cfg);
      return;
    }
    document.addEventListener('DOMContentLoaded', function () {
      mount(cfg);
    });
  }

  var launcherUrl = origin + '/api/embeds/' + encodeURIComponent(embedId) + '/launcher';
  var request;
  try {
    request = window.fetch(launcherUrl);
  } catch (err) {
    request = null;
  }
  if (!request || typeof request.then !== 'function') {
    start(null);
    return;
  }
  request
    .then(function (res) {
      return res && res.ok ? res.json() : null;
    })
    .catch(function () {
      return null;
    })
    .then(start);
})();
