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

  if (document.getElementById('hotshot-embed-widget')) {
    return;
  }

  var origin = new URL(script.src, window.location.href).origin;
  var iframeSrc = origin + '/embed/' + encodeURIComponent(embedId);
  var startOpen = script.getAttribute('data-open') === '1';

  var style = document.createElement('style');
  style.textContent =
    '#hotshot-embed-widget{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,sans-serif;}' +
    '#hotshot-embed-widget *{box-sizing:border-box;}' +
    '#hotshot-embed-widget .hotshot-embed-panel{width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 108px));border:0;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(15,23,42,.22);margin-bottom:12px;}' +
    '#hotshot-embed-widget .hotshot-embed-panel[hidden]{display:none;}' +
    '#hotshot-embed-widget iframe{width:100%;height:100%;border:0;background:#fff;}' +
    '#hotshot-embed-widget .hotshot-embed-launcher{display:flex;align-items:center;justify-content:center;width:56px;height:56px;margin-left:auto;border:0;border-radius:999px;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,.45);overflow:hidden;background-size:cover;background-position:center;}' +
    '#hotshot-embed-widget .hotshot-embed-launcher:focus-visible{outline:2px solid #1d4ed8;outline-offset:3px;}' +
    '#hotshot-embed-widget .hotshot-embed-launcher svg{width:26px;height:26px;fill:currentColor;}' +
    '#hotshot-embed-widget .hotshot-embed-launcher img{width:100%;height:100%;object-fit:cover;display:block;}';
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'hotshot-embed-widget';

  var panel = document.createElement('div');
  panel.className = 'hotshot-embed-panel';
  if (!startOpen) {
    panel.hidden = true;
  }

  var frame = document.createElement('iframe');
  frame.src = iframeSrc;
  frame.title = 'Chat';
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  frame.setAttribute('allow', 'microphone; clipboard-write; autoplay');
  panel.appendChild(frame);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'hotshot-embed-launcher';
  launcher.setAttribute('aria-label', startOpen ? 'Close chat' : 'Open chat');
  launcher.setAttribute('aria-expanded', startOpen ? 'true' : 'false');
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 12H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z"/></svg>';

  launcher.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
  });

  fetch(origin + '/api/embeds/' + encodeURIComponent(embedId) + '/launcher')
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (cfg) {
      if (!cfg || !cfg.iconUrl) {
        return;
      }
      var img = document.createElement('img');
      img.src = origin + cfg.iconUrl;
      img.alt = '';
      launcher.innerHTML = '';
      launcher.appendChild(img);
    })
    .catch(function () {
      /* keep default icon */
    });

  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);
})();
