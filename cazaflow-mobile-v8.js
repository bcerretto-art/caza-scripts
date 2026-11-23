/* cazaflow-mobile-v8.js - Conversas no navegador do celular, estilo app LeadConnector
 *
 * v8: ícone de perfil no topo volta a abrir no celular (menu só com Sair).
 * v7: o visual WhatsApp (html[data-cz-wa]) também vale no desktop.
 * v6: seletor de subconta no topo (pílula com o nome, abre o popup do GHL) e
 *     marca html[data-cz-wa] quando a conversa é WhatsApp ou SMS (API não oficial),
 *     para o CSS aplicar o visual do WhatsApp Business.
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
  if (window.__czMobile8 || window.__czMobile7 || window.__czMobile6 || window.__czMobile5) return;
  window.__czMobile8 = window.__czMobile7 = window.__czMobile6 = window.__czMobile5 = true;

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

  // Celular: tela inicial, IA e dashboard vão direto pras Conversas
  var HOME_RE = /^\/v2\/location\/([^/]+)\/(ask-ai|launchpad|dashboard)(\/|$)/;
  function goConversations() {
    var m = location.pathname.match(/^\/v2\/location\/([^/]+)/);
    if (m) location.assign('/v2/location/' + m[1] + '/conversations/conversations');
  }
  function homeRedirect() {
    if (isMobile() && HOME_RE.test(location.pathname)) {
      var m = location.pathname.match(HOME_RE);
      location.replace('/v2/location/' + m[1] + '/conversations/conversations');
      return true;
    }
    return false;
  }

  // Botão flutuante "Conversas" para quando cair em outra tela
  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  function homeBtn() {
    if ($('cz-home') || !document.body) return;
    var b = document.createElement('button');
    b.id = 'cz-home';
    b.type = 'button';
    b.innerHTML = ICON_CHAT + '<span>Conversas</span>';
    b.addEventListener('click', goConversations);
    document.body.appendChild(b);
  }


  // ---------- Canal WhatsApp / SMS ----------
  var WA_PATHS = ['M15.0948', 'M7.5 12h.01'];   // ícones WhatsApp e SMS do GHL
  function isWa() {
    var t = $('conv-channel-bar-provider-trigger');
    if (t) return /^(sms|whatsapp)/i.test((t.textContent || '').trim());
    var c = $('conv-provider-select-trigger');
    var p = c && c.querySelector('svg path');
    if (p) {
      var d = p.getAttribute('d') || '';
      for (var i = 0; i < WA_PATHS.length; i++) if (d.indexOf(WA_PATHS[i]) === 0) return true;
      return false;
    }
    var v = $('conversations-central-panel-viewer');
    return !!(v && v.querySelector('.whatsapp-message'));
  }
  function waFlag(on) {
    if (on) {
      if (!html.hasAttribute('data-cz-wa')) html.setAttribute('data-cz-wa', '');
      var sb = $('conv-send-button-simple');
      var wrap = sb && sb.closest('.bg-primary-600');
      if (wrap && !wrap.hasAttribute('data-cz-send')) wrap.setAttribute('data-cz-send', '');
    }
    else if (html.hasAttribute('data-cz-wa')) html.removeAttribute('data-cz-wa');
  }

  // ---------- Seletor de subconta ----------
  function swEl() { return $('location-switcher-sidbar-v2'); }
  function locId() {
    var m = location.pathname.match(/\/location\/([A-Za-z0-9]+)/);
    return m ? m[1] : '';
  }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function popOpen() {
    return !!document.querySelector('#sidebar-v2 .hl_v2-location_switcher .hl_account, #sidebar-v2 #location-list');
  }
  function readPop() {
    var accs = document.querySelectorAll('#sidebar-v2 .hl_account');
    if (!accs.length) return false;
    var multi = accs.length > 1 || !!$('switcher-agency-switch');
    ls('cz_multi', multi ? '1' : '0');
    var act = document.querySelector('#sidebar-v2 .hl_account.active');
    if (act) {
      var t = act.querySelector('.hl_location-title');
      var name = t ? t.textContent.trim() : ((act.innerText || '').split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 1; })[0] || '');
      if (name) ls('cz_locname_' + locId(), name);
    }
    locPill();
    return true;
  }
  // O popup do GHL fecha com um clique dentro do app fora dele (tocar fora já
  // fecha sozinho), mas some só depois de ~2s. A pílula fica fora do #app, então
  // simulamos esse clique e escondemos o popup na hora até ele fechar de fato.
  function closePop(done) {
    if (!popOpen()) { if (done) done(); return; }
    html.classList.add('cz-probe');
    ($('app') || document.body).click();
    var t0 = Date.now();
    (function wait() {
      if (!popOpen() || Date.now() - t0 > 5000) {
        html.classList.remove('cz-probe');
        if (done) done();
        return;
      }
      setTimeout(wait, 150);
    })();
  }
  // Abre o popup invisível uma vez, lê nome e quantidade de subcontas, e fecha
  var probing = false;
  function probe() {
    var s = swEl(), key = 'cz_probe_' + locId();
    if (probing || !s || !isMobile()) return;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) {}
    probing = true;
    html.classList.add('cz-probe');
    s.click();
    var tries = 0;
    (function wait() {
      if (readPop() || ++tries > 10) {
        closePop(function () { html.classList.remove('cz-probe'); probing = false; });
        return;
      }
      setTimeout(wait, 200);
    })();
  }

  var ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="11" r="2" fill="#fff"/></svg>';
  var ICON_CHEV = '<svg class="cz-loc-ch" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function locPill() {
    if (!document.body) return;
    var s = swEl();
    var multi = !!s && ls('cz_multi') !== '0';
    if (html.classList.contains('cz-multi') !== multi) html.classList.toggle('cz-multi', multi);
    if (!multi) return;
    var b = $('cz-loc');
    if (!b) {
      b = document.createElement('button');
      b.id = 'cz-loc';
      b.type = 'button';
      b.setAttribute('aria-label', 'Trocar subconta');
      b.innerHTML = '<span class="cz-loc-ic">' + ICON_PIN + '</span><span class="cz-loc-nm"></span>' + ICON_CHEV;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var sw = swEl();
        if (!sw) return;
        html.classList.remove('cz-probe');
        if (popOpen()) { closePop(); return; }
        sw.click();
        setTimeout(readPop, 700);
      });
      document.body.appendChild(b);
    }
    setText(b.querySelector('.cz-loc-nm'), ls('cz_locname_' + locId()) || 'Trocar subconta');
  }

  // ---------- Perfil (canto superior direito) ----------
  // No celular uma camada do GHL cobre o avatar e o menu abre por baixo da lista.
  // Um botão invisível em cima do avatar abre o menu e sobe o cabeçalho enquanto
  // ele estiver aberto. O CSS deixa no menu só o nome/e-mail e o "Sair".
  var menuAt = 0;
  function meBtn() {
    if ($('cz-me') || !document.body) return;
    var b = document.createElement('button');
    b.id = 'cz-me';
    b.type = 'button';
    b.setAttribute('aria-label', 'Minha conta');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var a = document.querySelector('.hl_header--avatar');
      if (!a) return;
      html.classList.add('cz-menu');
      menuAt = Date.now();
      a.click();
    });
    document.body.appendChild(b);
  }
  function menuCheck() {
    if (!html.classList.contains('cz-menu') || Date.now() - menuAt < 800) return;
    if (!document.querySelector('.hl_header--dropdown.show')) html.classList.remove('cz-menu');
  }

  function render() {
    var mob = isMobile();
    if (html.classList.contains('cz-mo') !== mob) html.classList.toggle('cz-mo', mob);
    if (mob) { homeBtn(); locPill(); probe(); meBtn(); menuCheck(); }
    var on = mob && onConv();
    if (html.classList.contains('cz-m') !== on) html.classList.toggle('cz-m', on);
    if (!on) {
      // Desktop: o chat fica sempre visível quando há conversa aberta
      waFlag(!mob && onConv() && !!convId() && isWa());
      if (html.hasAttribute('data-cz-view')) html.removeAttribute('data-cz-view');
      return;
    }
    var p = mark();
    var v = S.view;
    if (v === 'chat' && !(p.chat && convId())) v = 'list';
    if (v === 'details' && !p.details) v = p.chat ? 'chat' : 'list';
    set(html, 'data-cz-view', v);
    waFlag(v !== 'list' && isWa());
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
    if (homeRedirect()) return;
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
      fills: document.querySelectorAll('[data-cz-fill]').length,
      whatsapp: html.hasAttribute('data-cz-wa'), subcontas: ls('cz_multi'), subconta: ls('cz_locname_' + locId())
    });
  };

  if (!homeRedirect()) render();
})();
