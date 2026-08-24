/* ============================================================
   CazaFlow — SLA de resposta na lista de conversas
   ------------------------------------------------------------
   Mostra, ao lado de cada conversa, há quanto tempo o cliente
   está aguardando resposta. Só pinta quando a ÚLTIMA mensagem
   foi do cliente (inbound). Se a equipe já respondeu, some.

   Amarelo: até 10 min          Vermelho: acima de 10 min
   ============================================================ */
(function () {
  'use strict';

  if (window.__czSLA) return; // evita rodar duas vezes

  const CFG = {
    limiteVermelhoMin: 10,   // acima disso vira vermelho
    intervaloTickMs: 30000,  // recalcula os minutos a cada 30s
    debug: false,            // true = loga no console o que encontrou
    // Endpoints da lista de conversas que queremos escutar
    padraoEndpoint: /conversations\/(search|list)/i
  };

  // conversationId -> { ts: epoch_ms, aguardando: bool }
  const dados = new Map();
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

  /* ---------- 2. Captura dos dados da API ---------- */
  function absorver(payload) {
    const lista = payload?.conversations || payload?.data?.conversations || payload?.items;
    if (!Array.isArray(lista)) return;

    lista.forEach(c => {
      const id = c.id || c.conversationId || c._id;
      if (!id) return;

      const bruto = c.lastMessageDate ?? c.dateUpdated ?? c.lastMessageAt;
      const ts = typeof bruto === 'number' ? bruto : Date.parse(bruto);
      if (!ts || isNaN(ts)) return;

      // Direção: nomes variam entre versões do GHL, cobrimos as principais
      const dir = String(
        c.lastMessageDirection ?? c.direction ?? c.lastMessage?.direction ?? ''
      ).toLowerCase();

      const aguardando = dir
        ? dir === 'inbound'
        : (c.unreadCount ?? 0) > 0; // sem direção, usa não lidas como proxy

      dados.set(String(id), { ts, aguardando });
    });

    log('conversas absorvidas:', dados.size);
    agendarPintura();
  }

  // fetch
  const fetchOriginal = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    return fetchOriginal.apply(this, args).then(res => {
      if (CFG.padraoEndpoint.test(url)) {
        res.clone().json().then(absorver).catch(() => {});
      }
      return res;
    });
  };

  // XHR
  const openOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__czUrl = url;
    return openOriginal.call(this, method, url, ...rest);
  };
  const sendOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (CFG.padraoEndpoint.test(this.__czUrl || '')) {
        try { absorver(JSON.parse(this.responseText)); } catch (e) {}
      }
    });
    return sendOriginal.apply(this, args);
  };

  /* ---------- 3. Localizar o item no DOM ---------- */
  function acharItem(id) {
    const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const el =
      document.querySelector(`[id="${esc}"]`) ||
      document.querySelector(`[data-id="${esc}"]`) ||
      document.querySelector(`[data-conversation-id="${esc}"]`) ||
      document.querySelector(`a[href*="${esc}"]`);
    if (!el) return null;
    // sobe até o cartão da conversa (onde cabe o badge sem quebrar o layout)
    return el.closest('li, [role="listitem"], .conversation-item') || el;
  }

  function alvoDoBadge(item) {
    // tenta encostar no horário; se não achar, usa o próprio item
    const cands = item.querySelectorAll('span, div');
    for (const c of cands) {
      const t = (c.textContent || '').trim();
      if (/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(t) && c.children.length === 0) {
        return c.parentElement || c;
      }
    }
    return item.firstElementChild || item;
  }

  /* ---------- 4. Pintar ---------- */
  function rotulo(min) {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h}h${String(min % 60).padStart(2, '0')}` : `${Math.floor(h / 24)}d`;
  }

  function pintar() {
    const agora = Date.now();

    dados.forEach((info, id) => {
      const item = acharItem(id);
      if (!item) return;

      let badge = item.querySelector('.cz-sla');

      if (!info.aguardando) {          // equipe já respondeu
        if (badge) badge.remove();
        return;
      }

      const min = Math.max(0, Math.floor((agora - info.ts) / 60000));

      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cz-sla';
        alvoDoBadge(item).appendChild(badge);
      }
      badge.textContent = '⏱ ' + rotulo(min);
      badge.classList.toggle('cz-sla--late', min > CFG.limiteVermelhoMin);
      badge.classList.toggle('cz-sla--ok', min <= CFG.limiteVermelhoMin);
    });
  }

  /* ---------- 5. Agendamento ---------- */
  let pendente = null;
  function agendarPintura() {
    clearTimeout(pendente);
    pendente = setTimeout(pintar, 250); // debounce: o GHL re-renderiza muito
  }

  const obs = new MutationObserver(muts => {
    // ignora as mutações causadas pelo próprio badge
    for (const m of muts) {
      if (m.target.classList?.contains('cz-sla')) continue;
      return agendarPintura();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  setInterval(pintar, CFG.intervaloTickMs);

  window.__czSLA = { dados, pintar, CFG }; // console: __czSLA.dados
  log('ativo');
})();
