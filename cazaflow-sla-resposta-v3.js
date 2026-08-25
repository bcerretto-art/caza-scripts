/* ============================================================
   CazaFlow — SLA de resposta na lista de conversas  (v3)
   ------------------------------------------------------------
   Amarelo: até 10 min          Vermelho: acima de 10 min

   v3: cobre as conversas carregadas ANTES do script (lê horário
       e não-lidas direto do card quando não há dado da API).
   ============================================================ */
(function () {
  'use strict';

  if (window.__czSLA) return;

  const CFG = {
    limiteVermelhoMin: 10,
    tickMs: 10000,
    revalidarMs: 45000,
    maxRegistros: 400,
    fallbackDom: true,   // lê o card quando não há dado da API
    debug: false,
    padraoEndpoint: /conversations\/(search|list)/i,
    padraoEnvio: /(messages|conversations)\/.*(message|send)/i
  };

  const PAD_HORA = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
  const PAD_DATA = /^[A-Z][a-z]{2}\s+\d{1,2}$/;   // "Aug 24"

  const dados = new Map();
  let ultimaBusca = null;
  let pintando = false;
  const log = (...a) => CFG.debug && console.log('[czSLA]', ...a);

  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.textContent = `
    .cz-sla{
      display:inline-flex;align-items:center;gap:3px;
      margin-left:6px;padding:1px 6px;border-radius:9px;
      font-size:10px;font-weight:600;line-height:16px;
      font-variant-numeric:tabular-nums;white-space:nowrap;
      vertical-align:middle;pointer-events:none;
    }
    .cz-sla--ok{background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.35)}
    .cz-sla--late{background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.4)}
    @media (prefers-reduced-motion:no-preference){
      .cz-sla--late{animation:czPulse 2.4s ease-in-out infinite}
      @keyframes czPulse{0%,100%{opacity:1}50%{opacity:.55}}
    }
  `;
  document.head.appendChild(css);

  /* ---------- Registro ---------- */
  function aplicar(id, aguardando, ts) {
    if (!id) return;
    dados.set(String(id), { ts: ts || Date.now(), aguardando: !!aguardando });
    if (dados.size > CFG.maxRegistros) {
      [...dados.entries()].sort((a, b) => a[1].ts - b[1].ts)
        .slice(0, dados.size - CFG.maxRegistros).forEach(([k]) => dados.delete(k));
    }
    agendarPintura();
  }

  function absorver(payload) {
    const lista = payload?.conversations || payload?.data?.conversations || payload?.items;
    if (!Array.isArray(lista)) return;
    lista.forEach(c => {
      const id = c.id || c.conversationId || c._id;
      if (!id) return;
      const bruto = c.lastMessageDate ?? c.dateUpdated ?? c.lastMessageAt;
      const ts = typeof bruto === 'number' ? bruto : Date.parse(bruto);
      if (!ts || isNaN(ts)) return;
      const dir = String(c.lastMessageDirection ?? c.direction ?? c.lastMessage?.direction ?? '').toLowerCase();
      dados.set(String(id), { ts, aguardando: dir ? dir === 'inbound' : (c.unreadCount ?? 0) > 0 });
    });
    log('lista absorvida:', dados.size);
    agendarPintura();
  }

  function respondido(body) {
    try {
      const txt = typeof body === 'string' ? body : JSON.stringify(body || '');
      const m = txt.match(/"conversationId"\s*:\s*"([^"]+)"/);
      if (m) aplicar(m[1], false, Date.now());
    } catch (e) {}
  }

  /* ---------- Hooks ---------- */
  const fetchOriginal = window.fetch;
  window.fetch = function (...args) {
    const req = args[0];
    const url = typeof req === 'string' ? req : req?.url || '';
    const metodo = (args[1]?.method || req?.method || 'GET').toUpperCase();
    if (CFG.padraoEndpoint.test(url)) {
      try { ultimaBusca = typeof req === 'string' ? { url, init: args[1] } : { req: req.clone() }; } catch (e) {}
    }
    if (metodo === 'POST' && CFG.padraoEnvio.test(url)) respondido(args[1]?.body);
    return fetchOriginal.apply(this, args).then(res => {
      if (CFG.padraoEndpoint.test(url)) res.clone().json().then(absorver).catch(() => {});
      return res;
    });
  };

  const openOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...r) {
    this.__m = (m || 'GET').toUpperCase(); this.__u = u;
    return openOriginal.call(this, m, u, ...r);
  };
  const sendOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__m === 'POST' && CFG.padraoEnvio.test(this.__u || '')) respondido(body);
    this.addEventListener('load', () => {
      if (CFG.padraoEndpoint.test(this.__u || '')) {
        try { absorver(JSON.parse(this.responseText)); } catch (e) {}
      }
    });
    return sendOriginal.call(this, body);
  };

  /* ---------- Websocket ---------- */
  function varrerEvento(o, prof) {
    if (!o || typeof o !== 'object' || prof > 5) return;
    const id = o.conversationId || o.conversation_id || o.conversationID;
    const dir = String(o.direction || o.messageDirection || o.type || '').toLowerCase();
    if (id && /inbound|outbound/.test(dir)) aplicar(id, dir.includes('inbound'), Date.now());
    for (const v of Object.values(o)) varrerEvento(v, prof + 1);
  }
  const WSOrig = window.WebSocket;
  if (WSOrig) {
    const P = function (...a) {
      const ws = new WSOrig(...a);
      ws.addEventListener('message', ev => {
        if (typeof ev.data !== 'string') return;
        const i = ev.data.indexOf('{');
        if (i < 0) return;
        try { varrerEvento(JSON.parse(ev.data.slice(i)), 0); } catch (e) {}
      });
      return ws;
    };
    P.prototype = WSOrig.prototype;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => { P[k] = WSOrig[k]; });
    window.WebSocket = P;
  }

  function revalidar() {
    if (!ultimaBusca || document.hidden) return;
    try {
      const p = ultimaBusca.req ? fetchOriginal(ultimaBusca.req.clone())
                                : fetchOriginal(ultimaBusca.url, ultimaBusca.init);
      p.then(r => r.clone().json()).then(absorver).catch(() => {});
    } catch (e) {}
  }

  /* ---------- DOM ---------- */
  function acharItem(id) {
    const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const el = document.querySelector(`[id="${esc}"]`) ||
               document.querySelector(`[data-id="${esc}"]`) ||
               document.querySelector(`[data-conversation-id="${esc}"]`) ||
               document.querySelector(`a[href*="${esc}"]`);
    if (!el) return null;
    return el.closest('li, [role="listitem"], .conversation-item') || el;
  }

  function folhas(raiz) {
    return [...raiz.querySelectorAll('span,div,p')].filter(e => e.children.length === 0);
  }

  function alvoDoBadge(item) {
    for (const c of folhas(item)) {
      const t = (c.textContent || '').trim();
      if (PAD_HORA.test(t) || PAD_DATA.test(t)) return c.parentElement || c;
    }
    return item.firstElementChild || item;
  }

  function tsDeTexto(t) {
    const m = t.match(PAD_HORA);
    if (m) {
      let h = +m[1]; const min = +m[2]; const suf = (m[3] || '').toUpperCase();
      if (suf === 'PM' && h < 12) h += 12;
      if (suf === 'AM' && h === 12) h = 0;
      const d = new Date(); d.setHours(h, min, 0, 0);
      if (d.getTime() > Date.now() + 60000) d.setDate(d.getDate() - 1);
      return d.getTime();
    }
    if (PAD_DATA.test(t)) {
      const d = Date.parse(t + ' ' + new Date().getFullYear());
      return isNaN(d) ? null : d;
    }
    return null;
  }

  // descobre a lista: agrupa cards por pai e fica com o maior grupo
  function cardsDaLista() {
    const grupos = new Map();
    document.querySelectorAll('span,div,p').forEach(el => {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (!PAD_HORA.test(t) && !PAD_DATA.test(t)) return;
      const card = el.closest('li, [role="listitem"]') || el.parentElement?.parentElement;
      const pai = card?.parentElement;
      if (!card || !pai) return;
      if (!grupos.has(pai)) grupos.set(pai, new Set());
      grupos.get(pai).add(card);
    });
    let maior = null;
    grupos.forEach(set => { if (!maior || set.size > maior.size) maior = set; });
    return maior ? [...maior] : [];
  }

  function infoDoCard(card) {
    let ts = null, naoLidas = 0;
    for (const el of folhas(card)) {
      const t = (el.textContent || '').trim();
      if (ts === null) { const v = tsDeTexto(t); if (v) { ts = v; continue; } }
      if (/^\d{1,3}$/.test(t)) naoLidas = Math.max(naoLidas, +t);
    }
    return { ts, naoLidas };
  }

  function rotulo(min) {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h}h${String(min % 60).padStart(2, '0')}` : `${Math.floor(h / 24)}d`;
  }

  function marcar(item, ts, agora) {
    let badge = item.querySelector('.cz-sla');
    const min = Math.max(0, Math.floor((agora - ts) / 60000));
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cz-sla';
      alvoDoBadge(item).appendChild(badge);
    }
    const novo = '⏱ ' + rotulo(min);
    if (badge.textContent !== novo) badge.textContent = novo;
    badge.classList.toggle('cz-sla--late', min > CFG.limiteVermelhoMin);
    badge.classList.toggle('cz-sla--ok', min <= CFG.limiteVermelhoMin);
  }

  function pintar() {
    pintando = true;
    const agora = Date.now();
    const tratados = new Set();

    // 1) dado da API tem prioridade
    dados.forEach((info, id) => {
      const item = acharItem(id);
      if (!item) return;
      tratados.add(item);
      if (!info.aguardando) {
        const b = item.querySelector('.cz-sla');
        if (b) b.remove();
        return;
      }
      marcar(item, info.ts, agora);
    });

    // 2) o resto: lê do próprio card
    if (CFG.fallbackDom) {
      cardsDaLista().forEach(card => {
        if (tratados.has(card)) return;
        const { ts, naoLidas } = infoDoCard(card);
        const badge = card.querySelector('.cz-sla');
        if (!ts || naoLidas === 0) { if (badge) badge.remove(); return; }
        marcar(card, ts, agora);
      });
    }

    setTimeout(() => { pintando = false; }, 0);
  }

  let pendente = null;
  function agendarPintura() { clearTimeout(pendente); pendente = setTimeout(pintar, 200); }

  new MutationObserver(muts => {
    if (pintando) return;
    for (const m of muts) {
      if (m.target.classList?.contains('cz-sla')) continue;
      return agendarPintura();
    }
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(pintar, CFG.tickMs);
  if (CFG.revalidarMs) setInterval(revalidar, CFG.revalidarMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pintar(); revalidar(); } });
  window.addEventListener('focus', pintar);
  setTimeout(pintar, 1500);   // primeira passada logo após carregar

  window.__czSLA = { dados, pintar, revalidar, CFG };
  log('v3 ativo');
})();
