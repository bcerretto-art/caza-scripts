/* ============================================================
   CazaFlow — SLA de resposta na lista de conversas  (v2)
   ------------------------------------------------------------
   Mostra há quanto tempo o cliente está aguardando resposta.
   Só pinta quando a última mensagem foi do cliente (inbound).

   Amarelo: até 10 min          Vermelho: acima de 10 min

   v2: escuta websocket, some na hora que a equipe responde,
       revalida sozinho e não trava mais em aba de fundo.
   ============================================================ */
(function () {
  'use strict';

  if (window.__czSLA) return;

  const CFG = {
    limiteVermelhoMin: 10,
    tickMs: 10000,        // recalcula os minutos (era 30s)
    revalidarMs: 45000,   // refaz a busca da lista sozinho; 0 desliga
    maxRegistros: 400,    // poda o cache pra nao pesar
    debug: false,
    padraoEndpoint: /conversations\/(search|list)/i,
    padraoEnvio: /(messages|conversations)\/.*(message|send)/i
  };

  const dados = new Map();   // convId -> { ts, aguardando }
  let ultimaBusca = null;    // pra revalidar sozinho
  let pintando = false;      // trava anti-loop do observer
  const log = (...a) => CFG.debug && console.log('[czSLA]', ...a);

  /* ---------- 1. CSS ---------- */
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

  /* ---------- 2. Registro ---------- */
  function aplicar(id, aguardando, ts) {
    if (!id) return;
    dados.set(String(id), { ts: ts || Date.now(), aguardando: !!aguardando });
    if (dados.size > CFG.maxRegistros) {
      const ordenado = [...dados.entries()].sort((a, b) => a[1].ts - b[1].ts);
      ordenado.slice(0, dados.size - CFG.maxRegistros).forEach(([k]) => dados.delete(k));
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

      const dir = String(
        c.lastMessageDirection ?? c.direction ?? c.lastMessage?.direction ?? ''
      ).toLowerCase();

      const aguardando = dir ? dir === 'inbound' : (c.unreadCount ?? 0) > 0;
      dados.set(String(id), { ts, aguardando });
    });

    log('lista absorvida:', dados.size);
    agendarPintura();
  }

  // marca como respondido na hora em que a equipe manda algo
  function respondido(body) {
    try {
      const txt = typeof body === 'string' ? body : JSON.stringify(body || '');
      const m = txt.match(/"conversationId"\s*:\s*"([^"]+)"/);
      if (m) {
        aplicar(m[1], false, Date.now());
        log('respondido:', m[1]);
      }
    } catch (e) {}
  }

  /* ---------- 3. Hooks de rede ---------- */
  const fetchOriginal = window.fetch;
  window.fetch = function (...args) {
    const req = args[0];
    const url = typeof req === 'string' ? req : req?.url || '';
    const metodo = (args[1]?.method || req?.method || 'GET').toUpperCase();

    if (CFG.padraoEndpoint.test(url)) {
      try {
        ultimaBusca = typeof req === 'string'
          ? { url, init: args[1] }
          : { req: req.clone() };
      } catch (e) {}
    }
    if (metodo === 'POST' && CFG.padraoEnvio.test(url)) respondido(args[1]?.body);

    return fetchOriginal.apply(this, args).then(res => {
      if (CFG.padraoEndpoint.test(url)) {
        res.clone().json().then(absorver).catch(() => {});
      }
      return res;
    });
  };

  const openOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...r) {
    this.__m = (m || 'GET').toUpperCase();
    this.__u = u;
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

  /* ---------- 4. Websocket: é aqui que vem o tempo real ---------- */
  function varrerEvento(o, prof) {
    if (!o || typeof o !== 'object' || prof > 5) return;
    const id = o.conversationId || o.conversation_id || o.conversationID;
    const dir = String(o.direction || o.messageDirection || o.type || '').toLowerCase();
    if (id && /inbound|outbound/.test(dir)) {
      aplicar(id, dir.includes('inbound'), Date.now());
    }
    for (const v of Object.values(o)) varrerEvento(v, prof + 1);
  }

  const WSOrig = window.WebSocket;
  if (WSOrig) {
    const WSPatch = function (...a) {
      const ws = new WSOrig(...a);
      ws.addEventListener('message', ev => {
        const raw = ev.data;
        if (typeof raw !== 'string') return;
        const i = raw.indexOf('{');
        if (i < 0) return;
        try { varrerEvento(JSON.parse(raw.slice(i)), 0); } catch (e) {}
      });
      return ws;
    };
    WSPatch.prototype = WSOrig.prototype;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => { WSPatch[k] = WSOrig[k]; });
    window.WebSocket = WSPatch;
  }

  /* ---------- 5. Revalidação própria ---------- */
  function revalidar() {
    if (!ultimaBusca || document.hidden) return;
    try {
      const p = ultimaBusca.req
        ? fetchOriginal(ultimaBusca.req.clone())
        : fetchOriginal(ultimaBusca.url, ultimaBusca.init);
      p.then(r => r.clone().json()).then(absorver).catch(() => {});
    } catch (e) {}
  }

  /* ---------- 6. DOM ---------- */
  function acharItem(id) {
    const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const el =
      document.querySelector(`[id="${esc}"]`) ||
      document.querySelector(`[data-id="${esc}"]`) ||
      document.querySelector(`[data-conversation-id="${esc}"]`) ||
      document.querySelector(`a[href*="${esc}"]`);
    if (!el) return null;
    return el.closest('li, [role="listitem"], .conversation-item') || el;
  }

  function alvoDoBadge(item) {
    const cands = item.querySelectorAll('span, div');
    for (const c of cands) {
      const t = (c.textContent || '').trim();
      if (/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(t) && c.children.length === 0) {
        return c.parentElement || c;
      }
    }
    return item.firstElementChild || item;
  }

  function rotulo(min) {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h}h${String(min % 60).padStart(2, '0')}` : `${Math.floor(h / 24)}d`;
  }

  function pintar() {
    pintando = true;
    const agora = Date.now();

    dados.forEach((info, id) => {
      const item = acharItem(id);
      if (!item) return;

      let badge = item.querySelector('.cz-sla');

      if (!info.aguardando) {
        if (badge) badge.remove();
        return;
      }

      const min = Math.max(0, Math.floor((agora - info.ts) / 60000));

      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cz-sla';
        alvoDoBadge(item).appendChild(badge);
      }
      const novo = '⏱ ' + rotulo(min);
      if (badge.textContent !== novo) badge.textContent = novo;
      badge.classList.toggle('cz-sla--late', min > CFG.limiteVermelhoMin);
      badge.classList.toggle('cz-sla--ok', min <= CFG.limiteVermelhoMin);
    });

    setTimeout(() => { pintando = false; }, 0);
  }

  /* ---------- 7. Agendamento ---------- */
  let pendente = null;
  function agendarPintura() {
    clearTimeout(pendente);
    pendente = setTimeout(pintar, 200);
  }

  new MutationObserver(muts => {
    if (pintando) return;                       // ignora o que a gente mesmo causou
    for (const m of muts) {
      if (m.target.classList?.contains('cz-sla')) continue;
      return agendarPintura();
    }
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(pintar, CFG.tickMs);
  if (CFG.revalidarMs) setInterval(revalidar, CFG.revalidarMs);

  // ao voltar pra aba, atualiza na hora (timer de aba oculta fica lento)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { pintar(); revalidar(); }
  });
  window.addEventListener('focus', pintar);

  window.__czSLA = { dados, pintar, revalidar, CFG };
  log('v2 ativo');
})();
