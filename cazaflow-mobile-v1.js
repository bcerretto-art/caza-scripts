/* cazaflow-mobile-v1.js - layout de Conversas para navegador do celular
 * Marca os painéis da tela de Conversas (lista, chat, detalhes) pelo conteúdo,
 * não por classe (as classes do GHL mudam a cada deploy). O CSS esconde/mostra
 * um painel por vez com base em html[data-cz-view].
 * Debug no console: __czDebug()
 */
(function () {
  if (window.__czMobile) return;
  window.__czMobile = true;

  var BP = 900; // largura máxima considerada "mobile"
  var html = document.documentElement;
  var state = { view: 'list', parts: {}, lastConv: null, widths: new WeakMap() };

  function isMobile() { return window.innerWidth <= BP; }
  function onConversations() { return /\/conversations(\/|$)/.test(location.pathname); }
  function convId() {
    var m = location.pathname.match(/\/conversations\/conversations\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function findByText(texts) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var t = (n.nodeValue || '').trim();
      if (t && texts.indexOf(t) !== -1 && n.parentElement && n.parentElement.offsetParent !== null) {
        return n.parentElement;
      }
    }
    return null;
  }

  function anchors() {
    var composer = document.querySelector('#send-sms') ||
      document.querySelector('textarea[placeholder*="mensagem" i], textarea[placeholder*="message" i]') ||
      document.querySelector('[contenteditable="true"][data-placeholder*="mensagem" i]');
    var list = findByText(['Selecionar tudo', 'Select all']) ||
      findByText(['Caixa de entrada da equipe', 'Team Inbox']);
    var details = document.querySelector('[id^="new-conversation-right-panel"]') ||
      findByText(['Detalhes de Contato', 'Contact Details']);
    return { composer: composer, list: list, details: details };
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

  function widthOf(el) {
    if (!state.widths.has(el)) state.widths.set(el, el.getBoundingClientRect().width);
    return state.widths.get(el);
  }

  function clearTags() {
    document.querySelectorAll('[data-cz-off],[data-cz-on],[data-cz-row],[data-cz-pane]').forEach(function (el) {
      el.removeAttribute('data-cz-off');
      el.removeAttribute('data-cz-on');
      el.removeAttribute('data-cz-row');
      el.removeAttribute('data-cz-pane');
    });
    state.parts = {};
  }

  function tag() {
    var on = isMobile() && onConversations();
    html.classList.toggle('cz-m', on);
    if (!on) { clearTags(); html.removeAttribute('data-cz-view'); return; }

    var a = anchors();
    if (!a.list && !a.composer) return;

    var p = { list: null, chat: null, chatOuter: null, details: null, strips: [], aux: [] };
    var listRow = null;

    if (a.list && a.composer) {
      listRow = lca(a.list, a.composer);
      p.list = childOf(listRow, a.list);
      p.chat = childOf(listRow, a.composer);
    } else if (a.list) {
      listRow = flexRowAncestor(a.list);
      if (listRow) p.list = childOf(listRow, a.list);
    } else {
      listRow = flexRowAncestor(a.composer);
      if (listRow) p.chat = childOf(listRow, a.composer);
    }
    if (!listRow) return;

    Array.prototype.forEach.call(listRow.children, function (c) {
      if (c === p.list || c === p.chat) return;
      if (a.details && c.contains(a.details)) return;
      if (widthOf(c) > 0 && widthOf(c) < 80) p.strips.push(c); else p.aux.push(c);
    });

    if (a.details && a.composer && !a.details.contains(a.composer)) {
      var detRow = lca(a.details, a.composer);
      p.details = childOf(detRow, a.details);
      p.chatOuter = childOf(detRow, a.composer);
      if (detRow !== listRow) {
        Array.prototype.forEach.call(detRow.children, function (c) {
          if (c !== p.details && c !== p.chatOuter) p.aux.push(c);
        });
      }
      detRow.setAttribute('data-cz-row', '');
    }
    if (!p.chatOuter) p.chatOuter = p.chat;

    listRow.setAttribute('data-cz-row', '');
    state.parts = p;
    apply();
  }

  function setAttr(list, name) {
    list.forEach(function (el) { if (el) el.setAttribute(name, ''); });
  }

  function apply() {
    var p = state.parts;
    var v = state.view;
    if (v !== 'list' && !p.chat) v = 'list';
    if (v === 'details' && !p.details) v = 'chat';
    html.setAttribute('data-cz-view', v);

    var all = [p.list, p.chat, p.chatOuter, p.details].concat(p.strips || [], p.aux || []);
    all.forEach(function (el) {
      if (!el) return;
      el.removeAttribute('data-cz-off');
      el.removeAttribute('data-cz-on');
    });

    var hide, show;
    if (v === 'list') {
      hide = [p.details, p.chat].concat(p.aux);
      show = [p.list, p.chatOuter !== p.chat ? p.chatOuter : null];
    } else if (v === 'chat') {
      hide = [p.details, p.list].concat(p.strips, p.aux);
      show = [p.chat, p.chatOuter];
    } else {
      hide = [p.chatOuter, p.chat, p.list].concat(p.strips, p.aux);
      show = [p.details];
    }
    setAttr(hide, 'data-cz-off');
    setAttr(show, 'data-cz-on');
    bar();
  }

  function setView(v) { state.view = v; apply(); }

  function bar() {
    var b = document.getElementById('cz-mbar');
    if (!b) {
      b = document.createElement('div');
      b.id = 'cz-mbar';
      b.innerHTML =
        '<button type="button" data-a="back" aria-label="Voltar">‹ Conversas</button>' +
        '<button type="button" data-a="det" aria-label="Detalhes do contato">Detalhes</button>';
      b.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var act = btn.getAttribute('data-a');
        if (act === 'back') setView(state.view === 'details' ? 'chat' : 'list');
        if (act === 'det') setView(state.view === 'details' ? 'chat' : 'details');
      });
      document.body.appendChild(b);
    }
    b.querySelector('[data-a="back"]').textContent = state.view === 'details' ? '‹ Conversa' : '‹ Conversas';
    var det = b.querySelector('[data-a="det"]');
    det.style.display = state.parts.details ? '' : 'none';
    det.textContent = state.view === 'details' ? 'Fechar' : 'Detalhes';
  }

  // Toque numa conversa da lista abre o chat
  document.addEventListener('click', function (e) {
    if (!html.classList.contains('cz-m') || state.view !== 'list') return;
    var list = state.parts.list;
    if (!list || !list.contains(e.target)) return;
    if (e.target.closest('input, button, a, [role="tab"]')) return;
    for (var x = e.target; x && x !== list; x = x.parentElement) {
      var h = x.offsetHeight;
      if (h > 48 && h < 220 && x.querySelector('input[type="checkbox"]')) {
        setTimeout(function () { setView('chat'); }, 250);
        return;
      }
    }
  }, true);

  // Troca de conversa pela URL também abre o chat
  state.lastConv = convId();
  setInterval(function () {
    var id = convId();
    if (id && id !== state.lastConv && html.classList.contains('cz-m')) setView('chat');
    state.lastConv = id;
  }, 400);

  // Re-marca quando o GHL re-renderiza (Vue troca nós)
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; tag(); }, 500);
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('resize', function () { state.widths = new WeakMap(); tag(); });

  window.__czDebug = function () {
    var p = state.parts;
    console.table({
      mobile: isMobile(), conversas: onConversations(), view: state.view,
      lista: !!p.list, chat: !!p.chat, chatOuter: !!p.chatOuter, detalhes: !!p.details,
      strips: (p.strips || []).length, aux: (p.aux || []).length
    });
    return p;
  };

  tag();
})();
