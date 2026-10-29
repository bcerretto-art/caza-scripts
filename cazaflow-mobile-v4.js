/* cazaflow-mobile-v4.js - Conversas no navegador do celular, estilo app LeadConnector
 * Só ativa com tela <= 900px E rota de Conversas. Desktop não muda nada.
 *
 * v4: usa os IDs fixos do GHL novo em vez de caçar painel por texto:
 *   #conversations-list                 lista
 *   #conversations-central-panel-viewer chat
 *   #conversations-right-column         detalhes do contato
 * Sem MutationObserver (era a causa do pisca). Um timer leve re-marca só o que
 * estiver faltando, e nunca reescreve o que já está certo.
 *
 * Debug no console: __czDebug()
 */
(function () {
  if (window.__czMobile4) return;
  window.__czMobile4 = true;

  var BP = 900;
  var html = document.documentElement;
  var S = { view: 'list', title: '', lastConv: null, booted: false };

  function $(id) { return document.getElementById(id); }
  function isMobile() { return window.innerWidth <= BP; }
  function onConv() { return /\/conversations(\/|$)/.test(location.pathname); }
  function convId() {
    var m = location.pathname.match(/\/conversations\/conversations\/([A-Za-z0-9]{15,})/);
    return m ? m[1] : null;
  }
  function set(el, k, v) { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); }

  function lca(a, b) {
    var seen = new Set();
    for (var x = a; x; x = x.parentElement) seen.add(x);
    for (var y = b; y; y = y.parentElement) if (seen.has(y)) return y;
    return null;
  }
  function childOf(parent, el) {
    while (el && el.parentElement !== parent) el = el.parentElement;
    return el;
  }
  // Marca o elemento e seus ancestrais até "stop" (inclusive) para esticar
  function fill(el, stop) {
    for (var x = el; x && x !== document.body; x = x.parentElement) {
      set(x, 'data-cz-fill', '');
      if (x === stop) break;
    }
  }

  function parts() {
    return {
      list: $('conversations-list'),
      chat: $('conversations-central-panel-viewer') || $('conversations-messages'),
      details: $('conversations-right-column'),
      panel: $('conversations-panel')
    };
  }

  function mark() {
    var p = parts();
    if (!p.list && !p.chat) return p;
    var row = (p.list && p.chat) ? lca(p.list, p.chat) : (p.panel || (p.list || p.chat).parentElement);
    if (!row) return p;
    set(row, 'data-cz-row', '');
    var lp = p.list ? childOf(row, p.list) : null;
    var cp = p.chat ? childOf(row, p.chat) : null;
    Array.prototype.forEach.call(row.children, function (c) {
      set(c, 'data-cz-pane', c === lp ? 'list' : c === cp ? 'chat' : 'aux');
    });
    if (p.list && lp) fill(p.list, lp);
    if (p.chat && cp) fill(p.chat, cp);
    set(p.details, 'data-cz-pane', 'details');
    return p;
  }

  function render() {
    var on = isMobile() && onConv();
    if (html.classList.contains('cz-m') !== on) html.classList.toggle('cz-m', on);
    if (!on) {
      if (html.hasAttribute('data-cz-view')) html.removeAttribute('data-cz-view');
      return;
    }
    var p = mark();
    var v = S.view;
    if (v === 'chat' && !(p.chat && convId())) v = 'list';
    if (v === 'details' && !p.details) v = p.chat ? 'chat' : 'list';
    set(html, 'data-cz-view', v);
    bar(v, p);
  }

  function setView(v) { S.view = v; render(); }

  // ---------- Nome do contato ----------
  function firstLine(el) {
    var lines = (el.innerText || '').split('\n').map(function (s) { return s.trim(); });
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i];
      if (s.length < 2) continue;
      if (/^\d{1,2}:\d{2}/.test(s) || /^(hoje|ontem|agora)/i.test(s) || /^\d+\s?[smhd]$/i.test(s)) continue;
      return s.slice(0, 60);
    }
    return '';
  }
  // Card = maior ancestral do checkbox que ainda contém só um checkbox de card
  function cardOf(el) {
    var card = null;
    for (var x = el; x && x.id !== 'conversations-list'; x = x.parentElement) {
      if (x.querySelectorAll('[id^="conversation-card-checkbox-"]').length > 1) break;
      card = x;
    }
    return card;
  }
  function titleFromUrl() {
    var id = convId();
    var cb = id && $('conversation-card-checkbox-' + id);
    var card = cb && cardOf(cb);
    return card ? firstLine(card) : '';
  }

  // ---------- Cabeçalho estilo app ----------
  var ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.5v.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function initials(name) {
    var parts = String(name || '').replace(/@.*$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }

  function bar(v, p) {
    var b = $('cz-mbar');
    if (!b) {
      b = document.createElement('div');
      b.id = 'cz-mbar';
      b.innerHTML =
        '<button type="button" class="cz-ic" data-a="back" aria-label="Voltar">' + ICON_BACK + '</button>' +
        '<div class="cz-av" aria-hidden="true"></div>' +
        '<div class="cz-tt"><b></b><small></small></div>' +
        '<button type="button" class="cz-ic" data-a="det" aria-label="Detalhes do contato"></button>';
      b.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var act = btn.getAttribute('data-a');
        if (act === 'back') setView(S.view === 'details' ? 'chat' : 'list');
        if (act === 'det') setView(S.view === 'details' ? 'chat' : 'details');
      });
      document.body.appendChild(b);
    }
    if (v === 'list') return;
    if (!S.title) S.title = titleFromUrl();
    var det = v === 'details';
    setText(b.querySelector('.cz-av'), initials(S.title));
    setText(b.querySelector('.cz-tt b'), det ? 'Detalhes do contato' : (S.title || 'Conversa'));
    setText(b.querySelector('.cz-tt small'), det ? (S.title || '') : '');
    var d = b.querySelector('[data-a="det"]');
    var vis = p.details ? 'visible' : 'hidden';
    if (d.style.visibility !== vis) d.style.visibility = vis;
    var icon = det ? 'close' : 'info';
    if (d.getAttribute('data-icon') !== icon) {
      d.setAttribute('data-icon', icon);
      d.innerHTML = det ? ICON_CLOSE : ICON_INFO;
      d.setAttribute('aria-label', det ? 'Fechar detalhes' : 'Detalhes do contato');
    }
  }

  // ---------- Toque numa conversa abre o chat ----------
  document.addEventListener('click', function (e) {
    if (!html.classList.contains('cz-m') || S.view !== 'list') return;
    var list = $('conversations-list');
    if (!list || !list.contains(e.target)) return;
    if (e.target.closest('input, button, label, [role="checkbox"], .n-checkbox, [id^="conversation-card-checkbox-"]')) return;
    var card = cardOf(e.target);
    if (!card || !card.querySelector('[id^="conversation-card-checkbox-"]')) return;
    S.title = firstLine(card);
    setTimeout(function () { setView('chat'); }, 250);
  }, true);

  // ---------- Altura real da tela (teclado) ----------
  function vv() {
    var v = window.visualViewport;
    html.style.setProperty('--cz-vvh', (v ? v.height : window.innerHeight) + 'px');
    html.style.setProperty('--cz-vvt', (v ? v.offsetTop : 0) + 'px');
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', vv);
    window.visualViewport.addEventListener('scroll', vv);
  }
  window.addEventListener('resize', function () { vv(); render(); });
  vv();

  // ---------- Loop leve ----------
  S.lastConv = convId();
  setInterval(function () {
    var id = convId();
    if (id !== S.lastConv) {
      // Conversa nova pela URL: abre o chat (se não foi o toque que já abriu)
      if (id && S.booted && html.classList.contains('cz-m')) {
        S.title = titleFromUrl() || S.title;
        S.view = 'chat';
      }
      S.lastConv = id;
    }
    S.booted = true;
    render();
  }, 400);

  window.__czDebug = function () {
    var p = parts();
    function r(el) {
      if (!el) return '-';
      var b = el.getBoundingClientRect();
      return 'x' + Math.round(b.left) + ' w' + Math.round(b.width) + ' h' + Math.round(b.height);
    }
    console.table({
      mobile: isMobile(), conversas: onConv(), view: html.getAttribute('data-cz-view'), titulo: S.title,
      lista: r(p.list), chat: r(p.chat), detalhes: r(p.details),
      linha: r(document.querySelector('[data-cz-row]')),
      fills: document.querySelectorAll('[data-cz-fill]').length
    });
  };

  render();
})();
