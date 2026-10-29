/* cazaflow-mobile-v3.js - Conversas no navegador do celular, estilo app LeadConnector
 * Só ativa com tela <= 900px E rota de Conversas. Desktop não muda nada.
 *
 * Mudanças em relação à v2:
 * - Painel de detalhes do GHL (#contacts-highrise-right-side-bar-wrapper) é tratado
 *   como painel próprio: escondido na lista e no chat (some a faixa branca de 50px),
 *   aberto em tela cheia no botão de info.
 * - Painel lateral do "Pergunte à IA" (.pmd-app__side-dock-panel) escondido.
 * - Composer novo do GHL (contenteditable/ProseMirror) também é detectado. Se mesmo
 *   assim o composer não aparecer, a coluna mais larga da linha vira o chat.
 * - Toque na conversa abre o chat mesmo se a linha for <a> e sem exigir checkbox.
 *   Troca de ID na URL também abre (regex aceita os dois formatos de rota).
 * - Chat e detalhes abrem em tela cheia (position: fixed) com cabeçalho estilo app:
 *   voltar, avatar com iniciais, nome do contato e botão de detalhes.
 * - Header escuro do GHL (Conversas / Ações manuais / Estatísticas) some no chat e
 *   rola na horizontal na lista.
 * - Altura acompanha o teclado (visualViewport), composer não some atrás dele.
 * - Marcação incremental (sem limpar tudo a cada render), sem perder scroll.
 *
 * Debug no console: __czDebug()   Mapa de layout: copy(__czMap())
 */
(function () {
  if (window.__czMobile3) return;
  window.__czMobile3 = true;

  var BP = 900;
  var html = document.documentElement;
  var ATTRS = ['data-cz-row', 'data-cz-pane', 'data-cz-on', 'data-cz-off', 'data-cz-fill', 'data-cz-top'];
  var S = { view: 'list', p: emptyParts(), title: '', lastConv: null, tagged: new Set() };

  function emptyParts() {
    return { rows: [], fills: [], list: null, chat: null, chatInner: null, details: null,
      detailsExt: false, strips: [], aux: [], ext: [], top: null };
  }

  function isMobile() { return window.innerWidth <= BP; }
  function onConv() { return /\/conversations(\/|$)/.test(location.pathname); }
  function convId() {
    var m = location.pathname.match(/\/conversations\/(?:conversations\/)?([A-Za-z0-9]{15,})/);
    return m ? m[1] : null;
  }

  // Visível de verdade, ou escondido por nós (pra não perder a âncora quando o painel está off)
  function usable(el) {
    if (!el) return false;
    if (el.getClientRects().length > 0) return true;
    return !!el.closest('[data-cz-off],[data-cz-top]');
  }

  function findByText(texts) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var t = (n.nodeValue || '').trim();
      if (t && texts.indexOf(t) !== -1 && usable(n.parentElement)) return n.parentElement;
    }
    return null;
  }

  var COMPOSER = [
    '#send-sms',
    'textarea[placeholder*="mensagem" i]',
    'textarea[placeholder*="message" i]',
    '[contenteditable="true"][data-placeholder*="mensagem" i]',
    '[contenteditable="true"][data-placeholder*="message" i]',
    '[class*="composer" i] [contenteditable="true"]',
    '[class*="composer" i] textarea',
    '.ProseMirror[contenteditable="true"]'
  ];

  function findComposer(hr) {
    for (var i = 0; i < COMPOSER.length; i++) {
      var els = document.querySelectorAll(COMPOSER[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (hr && hr.contains(el)) continue;
        if (el.closest('.cztp-panel, #cz-mbar')) continue;
        return el;
      }
    }
    return null;
  }

  function anchors() {
    var hr = document.getElementById('contacts-highrise-right-side-bar-wrapper');
    return {
      hr: hr,
      list: findByText(['Selecionar tudo', 'Select all']) ||
        findByText(['Caixa de entrada da equipe', 'Team Inbox']),
      composer: findComposer(hr),
      details: document.querySelector('[id^="new-conversation-right-panel"]') ||
        findByText(['Detalhes de Contato', 'Detalhes do contato', 'Contact Details']),
      top: findByText(['Ações manuais', 'Manual Actions'])
    };
  }

  function lca(a, b) {
    var set = new Set();
    for (var x = a; x; x = x.parentElement) set.add(x);
    for (var y = b; y; y = y.parentElement) if (set.has(y)) return y;
    return null;
  }

  function childOf(parent, el) {
    while (el && el.parentElement !== parent) el = el.parentElement;
    return el;
  }

  function flexRowAncestor(el) {
    for (var x = el; x && x !== document.body; x = x.parentElement) {
      var p = x.parentElement;
      if (!p || p === document.body) break;
      var cs = getComputedStyle(p);
      if (cs.display.indexOf('flex') !== -1 && cs.flexDirection.indexOf('row') === 0 &&
          p.children.length > 1 && p.getBoundingClientRect().width > window.innerWidth * 0.6) {
        return p;
      }
    }
    return null;
  }

  // Destrava larguras fixas entre o conteúdo e o painel (só > 100px, pra não esticar barras de ícones)
  function fillChain(anchor, pane, out) {
    if (!anchor || !pane) return;
    for (var x = anchor.parentElement; x && x !== pane && x !== document.body; x = x.parentElement) {
      if (x.hasAttribute('data-cz-fill')) { out.push(x); continue; }
      var cs = getComputedStyle(x);
      var minW = parseFloat(cs.minWidth) || 0;
      var maxW = /px$/.test(cs.maxWidth) ? parseFloat(cs.maxWidth) : 0;
      if (minW > 100 || maxW > 100) out.push(x);
    }
  }

  function topBar(anchor) {
    if (!anchor) return null;
    var prev = S.p.top;
    if (prev && prev.isConnected && prev.contains(anchor)) return prev;
    var best = null;
    for (var x = anchor; x && x !== document.body; x = x.parentElement) {
      var r = x.getBoundingClientRect();
      if (r.height > 140) break;
      if (r.width >= window.innerWidth * 0.8) best = x;
    }
    return best;
  }

  function tag() {
    if (!(isMobile() && onConv())) { S.p = emptyParts(); render(); return; }
    // Marca cz-m antes de medir, pra sidebar já estar escondida nas medidas
    html.classList.add('cz-m');

    var a = anchors();
    var old = S.p;
    var p = emptyParts();

    var row = null;
    if (a.list && a.composer) row = lca(a.list, a.composer);
    if (!row || row === document.body || row === html) row = flexRowAncestor(a.list || a.composer);

    if (row) {
      p.rows.push(row);
      var hrHasDetails = a.hr && a.details && a.hr.contains(a.details);
      Array.prototype.forEach.call(row.children, function (c) {
        if (a.list && c.contains(a.list)) { p.list = c; return; }
        if (a.composer && c.contains(a.composer)) { p.chat = c; return; }
        if (a.details && !hrHasDetails && c.contains(a.details)) { p.details = c; return; }
        if (c === old.chat) { p.aux.push(c); return; }
        var w = c.getBoundingClientRect().width;
        if (w > 0 && w < 80) p.strips.push(c);
        else if (w > 0 || c.hasAttribute('data-cz-off')) p.aux.push(c);
      });

      // Sem composer: a coluna do meio (mais larga) vira o chat
      if (!p.chat) {
        if (old.chat && old.chat.parentElement === row) p.chat = old.chat;
        else {
          var wide = null, ww = 0;
          p.aux.forEach(function (c) {
            var w = c.getBoundingClientRect().width;
            if (w > ww) { ww = w; wide = c; }
          });
          if (wide && ww > 150) p.chat = wide;
        }
        if (p.chat) p.aux = p.aux.filter(function (c) { return c !== p.chat; });
      }

      // Detalhes dentro do mesmo bloco do chat
      if (!p.details && a.details && a.composer && p.chat && p.chat.contains(a.details) &&
          !(a.hr && a.hr.contains(a.details)) && !a.details.contains(a.composer)) {
        var dr = lca(a.details, a.composer);
        if (dr && dr !== p.chat) {
          p.rows.push(dr);
          p.details = childOf(dr, a.details);
          p.chatInner = childOf(dr, a.composer);
        }
      }
    }

    // Painel de contato do GHL (fica fora da linha)
    if (a.hr) {
      if (a.details && a.hr.contains(a.details)) { p.details = a.hr; p.detailsExt = true; }
      else p.ext.push(a.hr);
    }
    document.querySelectorAll('.pmd-app__side-dock-panel').forEach(function (el) { p.ext.push(el); });

    p.top = topBar(a.top);

    fillChain(a.list, p.list, p.fills);
    fillChain(a.composer, p.chatInner || p.chat, p.fills);
    fillChain(a.details, p.details, p.fills);

    S.p = p;
    render();
  }

  function commit(next) {
    S.tagged.forEach(function (el) {
      if (!next.has(el)) ATTRS.forEach(function (k) { el.removeAttribute(k); });
    });
    next.forEach(function (o, el) {
      ATTRS.forEach(function (k) {
        if (k in o) { if (el.getAttribute(k) !== o[k]) el.setAttribute(k, o[k]); }
        else if (el.hasAttribute(k)) el.removeAttribute(k);
      });
    });
    S.tagged = new Set(next.keys());
  }

  function render() {
    var next = new Map();
    function m(el, k, v) {
      if (!el) return;
      var o = next.get(el) || {};
      o[k] = v == null ? '' : v;
      next.set(el, o);
    }

    var on = isMobile() && onConv();
    html.classList.toggle('cz-m', on);
    if (!on) { commit(next); html.removeAttribute('data-cz-view'); bar(); return; }

    var p = S.p, v = S.view;
    if (v === 'chat' && !p.chat) v = p.details ? 'details' : 'list';
    if (v === 'details' && !p.details) v = p.chat ? 'chat' : 'list';
    html.setAttribute('data-cz-view', v);

    p.rows.forEach(function (r) { m(r, 'data-cz-row'); });
    p.fills.forEach(function (f) { m(f, 'data-cz-fill'); });
    m(p.list, 'data-cz-pane', 'list');
    m(p.chat, 'data-cz-pane', 'chat');
    m(p.details, 'data-cz-pane', p.detailsExt ? 'details-ext' : 'details');
    m(p.top, 'data-cz-top');

    var hide = p.strips.concat(p.aux, p.ext);
    var show = [];
    if (v === 'list') {
      show = [p.list];
      hide = hide.concat([p.chat, p.details]);
    } else if (v === 'chat') {
      show = [p.chat, p.chatInner];
      hide = hide.concat([p.list, p.details]);
    } else if (p.chatInner) {
      show = [p.chat, p.details];
      hide = hide.concat([p.list, p.chatInner]);
    } else {
      show = [p.details];
      hide = hide.concat([p.list, p.chat]);
    }
    hide.forEach(function (e) { if (e && show.indexOf(e) === -1) m(e, 'data-cz-off'); });
    show.forEach(function (e) { m(e, 'data-cz-on'); });

    commit(next);
    bar();
  }

  function setView(v) { S.view = v; render(); }

  // ---------- Cabeçalho estilo app ----------
  var ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.5v.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function initials(name) {
    var parts = String(name || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    var s = parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '');
    return s.toUpperCase();
  }

  function bar() {
    var b = document.getElementById('cz-mbar');
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
    var name = S.title || 'Conversa';
    var det = S.view === 'details';
    b.querySelector('.cz-av').textContent = initials(S.title);
    b.querySelector('.cz-tt b').textContent = det ? 'Detalhes do contato' : name;
    b.querySelector('.cz-tt small').textContent = det ? (S.title || '') : '';
    var d = b.querySelector('[data-a="det"]');
    d.style.visibility = S.p.details ? '' : 'hidden';
    d.innerHTML = det ? ICON_CLOSE : ICON_INFO;
    d.setAttribute('aria-label', det ? 'Fechar detalhes' : 'Detalhes do contato');
  }

  function firstLine(el) {
    var lines = (el.innerText || '').split('\n').map(function (s) { return s.trim(); });
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i];
      if (s.length < 2) continue;
      if (/^\d{1,2}:\d{2}/.test(s) || /^(hoje|ontem|agora)/i.test(s) || /^\d+[smhd]$/.test(s)) continue;
      return s.slice(0, 60);
    }
    return '';
  }

  // Toque numa conversa da lista abre o chat
  document.addEventListener('click', function (e) {
    if (!html.classList.contains('cz-m') || S.view !== 'list') return;
    var list = S.p.list;
    if (!list || !list.contains(e.target)) return;
    if (e.target.closest('input, button, [role="tab"], [role="checkbox"], label, .n-checkbox')) return;
    var lw = list.getBoundingClientRect().width;
    for (var x = e.target; x && x !== list; x = x.parentElement) {
      var r = x.getBoundingClientRect();
      if (r.height >= 48 && r.height <= 220 && r.width >= lw * 0.7) {
        S.title = firstLine(x) || S.title;
        setTimeout(function () { setView('chat'); }, 300);
        return;
      }
    }
  }, true);

  // Troca de conversa pela URL também abre o chat
  S.lastConv = convId();
  setInterval(function () {
    var id = convId();
    if (id && id !== S.lastConv && html.classList.contains('cz-m') && S.view === 'list') setView('chat');
    S.lastConv = id;
  }, 400);

  // Altura real da tela (acompanha o teclado no iPhone/Android)
  function vv() {
    var v = window.visualViewport;
    html.style.setProperty('--cz-vvh', (v ? v.height : window.innerHeight) + 'px');
    html.style.setProperty('--cz-vvt', (v ? v.offsetTop : 0) + 'px');
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', vv);
    window.visualViewport.addEventListener('scroll', vv);
  }
  vv();

  // Re-marca quando o GHL re-renderiza (Vue troca nós)
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; tag(); }, 400);
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('resize', function () { vv(); tag(); });

  // ---------- Debug ----------
  function rect(el) {
    if (!el) return '-';
    var r = el.getBoundingClientRect();
    return 'x' + Math.round(r.left) + ' w' + Math.round(r.width) + ' h' + Math.round(r.height);
  }
  window.__czDebug = function () {
    var p = S.p;
    console.table({
      mobile: isMobile(), conversas: onConv(), view: S.view, titulo: S.title,
      lista: rect(p.list), chat: rect(p.chat), chatInterno: rect(p.chatInner),
      detalhes: rect(p.details) + (p.detailsExt ? ' (painel GHL)' : ''),
      header: rect(p.top), strips: p.strips.length, aux: p.aux.length, externos: p.ext.length,
      fills: p.fills.length
    });
    return p;
  };
  window.__czMap = function () {
    var out = [];
    (function walk(el, d) {
      for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        var r = c.getBoundingClientRect();
        if (r.width < 30 || r.height < 150) continue;
        var cs = getComputedStyle(c);
        var cz = Array.prototype.filter.call(c.attributes, function (a) { return a.name.indexOf('data-cz') === 0; })
          .map(function (a) { return a.name.replace('data-cz-', '') + (a.value ? '=' + a.value : ''); }).join(',');
        var cls = String(c.className).trim().split(/\s+/).slice(0, 5).join('.');
        out.push(new Array(d * 2 + 1).join(' ') + c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') +
          (cls ? ' .' + cls : '') + ' [x' + Math.round(r.left) + '-' + Math.round(r.right) +
          ' w' + Math.round(r.width) + ' h' + Math.round(r.height) + '] ' + cs.display +
          (cs.display.indexOf('flex') !== -1 ? '/' + cs.flexDirection : '') +
          (cs.position === 'fixed' ? ' FIXED' : '') + (cz ? ' <' + cz + '>' : ''));
        if (d < 30) walk(c, d + 1);
      }
    })(document.body, 0);
    return 'view=' + S.view + ' w=' + window.innerWidth + '\n' + out.join('\n');
  };

  tag();
})();
