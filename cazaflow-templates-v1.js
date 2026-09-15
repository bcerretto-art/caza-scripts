/*!
 * cazaflow-templates-v1.js
 * Biblioteca de mensagens rápidas dentro do composer de Conversas (GHL / CazaFlow).
 *
 * O que faz:
 *  - Injeta um botão na barra de ações do campo de mensagem (ao lado do emoji).
 *  - Abre um painel com busca, categorias e lista de templates salvos.
 *  - Clique curto = insere no campo. Botão "Copiar" = manda pro clipboard.
 *  - Atalhos: Ctrl+Shift+Espaco abre o painel; digitar "//" no campo tambem abre.
 *  - Gerenciador embutido (criar, editar, excluir, importar e exportar JSON).
 *  - Salva em localStorage, separado por sub-conta (locationId da URL).
 *
 * Como carregar no GHL:
 *   Settings > Company (ou Agency) > Custom JS
 *   <script src="https://cdn.jsdelivr.net/gh/bcerretto-art/caza-scripts@main/cazaflow-templates-v1.js"></script>
 *   Obs: o jsDelivr cacheia @main por algumas horas. Para forcar atualizacao use
 *   o hash do commit no lugar de "main", ex: @95b4c31
 *
 * Nao depende de nada externo. Nao envia dado pra lugar nenhum.
 */

(function () {
  'use strict';

  if (window.__cazaTemplates) return;
  window.__cazaTemplates = { version: '1.0.0' };

  /* ------------------------------------------------------------------ */
  /* CONFIG                                                              */
  /* ------------------------------------------------------------------ */

  var CONFIG = {
    storagePrefix: 'caza_templates_',
    slashTrigger: true,      // digitar "//" no campo abre o painel
    hotkey: true,            // Ctrl+Shift+Espaco
    floatingFallback: true,  // se nao achar a barra do composer, mostra botao flutuante
    debug: false
  };

  var SEED = [
    { id: 't1', cat: 'Abertura', title: 'Boas-vindas loja', body: 'Oi {{nome}}, tudo bem? Aqui e da loja. Vi seu interesse e ja separei as opcoes disponiveis. Posso te mandar os valores por aqui mesmo?' },
    { id: 't2', cat: 'Abertura', title: 'Retomada 15min', body: 'Oi {{nome}}, passei aqui rapidinho pra confirmar se voce chegou a ver minha mensagem. Consigo te ajudar por aqui hoje?' },
    { id: 't3', cat: 'Follow-up', title: 'Sem resposta 24h', body: 'Oi {{nome}}, ainda tenho a condicao que te falei disponivel. Quer que eu segure pra voce ate amanha?' },
    { id: 't4', cat: 'Follow-up', title: 'Ultima tentativa', body: 'Oi {{nome}}, vou encerrar seu atendimento por aqui pra nao te incomodar. Se quiser retomar depois, e so me chamar nessa mesma conversa.' },
    { id: 't5', cat: 'Fechamento', title: 'Agendar visita', body: 'Perfeito, {{nome}}. Prefere passar aqui na loja em qual periodo: manha ou tarde? Ja deixo tudo separado pra voce.' },
    { id: 't6', cat: 'Fechamento', title: 'Pedir dados', body: 'Otimo, {{nome}}. Pra gerar seu orcamento preciso de: nome completo, CPF e o CEP da entrega. Pode me mandar?' }
  ];

  var ICON_BTN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 10h10"/><path d="M4 15h13"/><path d="M17.5 19.5l2.5-2.5-2.5-2.5"/></svg>';

  function log() { if (CONFIG.debug) console.log.apply(console, ['[caza-templates]'].concat([].slice.call(arguments))); }

  /* ------------------------------------------------------------------ */
  /* STORAGE                                                             */
  /* ------------------------------------------------------------------ */

  function locationId() {
    var m = location.pathname.match(/location\/([A-Za-z0-9]+)/);
    return m ? m[1] : 'global';
  }

  function storeKey() { return CONFIG.storagePrefix + locationId(); }

  function load() {
    try {
      var raw = localStorage.getItem(storeKey());
      if (!raw) return SEED.slice();
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : SEED.slice();
    } catch (e) { return SEED.slice(); }
  }

  function save(list) {
    try { localStorage.setItem(storeKey(), JSON.stringify(list)); }
    catch (e) { alert('Nao foi possivel salvar os templates neste navegador.'); }
  }

  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ------------------------------------------------------------------ */
  /* COMPOSER                                                            */
  /* ------------------------------------------------------------------ */

  var lastField = null;

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 10;
  }

  // Campo de digitacao ativo: textarea ou contenteditable visivel do composer.
  function findField() {
    if (lastField && document.contains(lastField) && isVisible(lastField)) return lastField;
    var cands = [].slice.call(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]'));
    var found = null;
    cands.forEach(function (el) {
      if (!isVisible(el)) return;
      var ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '').toLowerCase();
      var hint = /mensagem|message|escreva|type a/.test(ph);
      // prioriza o que tem placeholder de mensagem, senao pega o mais baixo na tela
      if (hint) { found = el; return; }
      if (!found) found = el;
      else if (el.getBoundingClientRect().top > found.getBoundingClientRect().top) found = el;
    });
    lastField = found;
    return found;
  }

  // Barra de acoes do composer: o container mais proximo do campo com 3+ botoes/icones.
  function findToolbar(field) {
    if (!field) return null;
    var node = field;
    for (var i = 0; i < 8 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      var rows = [].slice.call(node.children);
      for (var j = 0; j < rows.length; j++) {
        var row = rows[j];
        if (row.contains(field)) continue;
        var clicks = row.querySelectorAll('button, svg, i, [role="button"]');
        if (clicks.length >= 3 && isVisible(row) && row.getBoundingClientRect().height < 80) return row;
      }
    }
    return null;
  }

  function insertText(field, text) {
    if (!field) return false;
    field.focus();

    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      var proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      var start = field.selectionStart == null ? field.value.length : field.selectionStart;
      var end = field.selectionEnd == null ? field.value.length : field.selectionEnd;
      var next = field.value.slice(0, start) + text + field.value.slice(end);
      setter.call(field, next);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      try { var p = start + text.length; field.setSelectionRange(p, p); } catch (e) {}
      return true;
    }

    if (field.isContentEditable) {
      var ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (e) {}
      if (!ok) {
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
          var range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
        } else {
          field.textContent += text;
        }
      }
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      return true;
    }
    return false;
  }

  // Tenta achar o nome do contato no cabecalho da conversa.
  function contactName() {
    var scope = document.querySelector('[class*="conversation"], [class*="messages"]') || document.body;
    var txt = (scope.innerText || '').slice(0, 1200);
    var m = txt.match(/Nome:\s*([A-Za-zÀ-ÿ'´`^~\- ]{2,40})/);
    if (m) return m[1].trim();
    var h = document.querySelector('[class*="contact-name"], [class*="conversation-title"], h2, h3');
    if (h && h.innerText && h.innerText.trim().length < 40) return h.innerText.trim();
    return '';
  }

  function render(body) {
    var full = contactName();
    var first = full ? full.split(/\s+/)[0] : '';
    return body
      .replace(/\{\{\s*nome_completo\s*\}\}/gi, full)
      .replace(/\{\{\s*(nome|primeiro_nome|first_name)\s*\}\}/gi, first)
      .replace(/\{\{\s*data\s*\}\}/gi, new Date().toLocaleDateString('pt-BR'));
  }

  /* ------------------------------------------------------------------ */
  /* ESTILO                                                              */
  /* ------------------------------------------------------------------ */

  var CSS = ''
    + '.cztp-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;'
    + 'border:0;background:transparent;color:#667085;cursor:pointer;border-radius:6px;padding:0;margin:0 2px;}'
    + '.cztp-btn:hover{background:#EEF2FF;color:#2563EB;}'
    + '.cztp-btn:focus-visible{outline:2px solid #2563EB;outline-offset:1px;}'
    + '.cztp-float{position:fixed;right:22px;bottom:96px;z-index:2147483000;width:42px;height:42px;border-radius:50%;'
    + 'background:#2563EB;color:#fff;box-shadow:0 6px 18px rgba(16,24,40,.24);}'
    + '.cztp-float:hover{background:#1D4ED8;color:#fff;}'
    + '.cztp-panel{position:fixed;z-index:2147483001;width:380px;max-width:calc(100vw - 24px);background:#fff;'
    + 'border:1px solid #E4E7EC;border-radius:10px;box-shadow:0 12px 32px rgba(16,24,40,.18);'
    + 'font-family:inherit;font-size:13px;color:#101828;display:flex;flex-direction:column;overflow:hidden;}'
    + '.cztp-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #F2F4F7;}'
    + '.cztp-head strong{font-weight:600;font-size:13px;flex:1;}'
    + '.cztp-link{background:none;border:0;color:#2563EB;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;}'
    + '.cztp-link:hover{background:#EEF2FF;}'
    + '.cztp-search{margin:10px 12px 6px;padding:7px 10px;border:1px solid #D0D5DD;border-radius:7px;font-size:13px;'
    + 'width:calc(100% - 24px);box-sizing:border-box;font-family:inherit;}'
    + '.cztp-search:focus{outline:none;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.12);}'
    + '.cztp-tabs{display:flex;gap:6px;padding:2px 12px 8px;flex-wrap:wrap;}'
    + '.cztp-tab{border:1px solid #E4E7EC;background:#fff;color:#475467;border-radius:999px;padding:3px 10px;'
    + 'font-size:11.5px;cursor:pointer;font-family:inherit;}'
    + '.cztp-tab[aria-pressed="true"]{background:#2563EB;border-color:#2563EB;color:#fff;}'
    + '.cztp-list{max-height:320px;overflow-y:auto;padding:0 6px 6px;}'
    + '.cztp-item{padding:8px 10px;border-radius:8px;cursor:pointer;}'
    + '.cztp-item:hover,.cztp-item.is-active{background:#F5F8FF;}'
    + '.cztp-item-top{display:flex;align-items:center;gap:6px;}'
    + '.cztp-item-title{font-weight:600;font-size:12.5px;flex:1;}'
    + '.cztp-item-cat{font-size:10.5px;color:#667085;background:#F2F4F7;border-radius:4px;padding:1px 6px;}'
    + '.cztp-item-body{margin-top:3px;color:#475467;font-size:12px;line-height:1.45;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.cztp-item-acts{display:none;gap:6px;margin-top:6px;}'
    + '.cztp-item:hover .cztp-item-acts,.cztp-item.is-active .cztp-item-acts{display:flex;}'
    + '.cztp-mini{border:1px solid #D0D5DD;background:#fff;border-radius:6px;padding:2px 8px;font-size:11.5px;'
    + 'cursor:pointer;color:#344054;font-family:inherit;}'
    + '.cztp-mini:hover{background:#F9FAFB;}'
    + '.cztp-empty{padding:22px 16px;text-align:center;color:#667085;font-size:12.5px;line-height:1.5;}'
    + '.cztp-foot{border-top:1px solid #F2F4F7;padding:7px 12px;display:flex;gap:10px;align-items:center;'
    + 'color:#98A2B3;font-size:11px;}'
    + '.cztp-form{padding:12px;display:flex;flex-direction:column;gap:8px;}'
    + '.cztp-form label{font-size:11.5px;color:#475467;font-weight:500;}'
    + '.cztp-form input,.cztp-form textarea{border:1px solid #D0D5DD;border-radius:7px;padding:7px 9px;'
    + 'font-size:13px;font-family:inherit;width:100%;box-sizing:border-box;}'
    + '.cztp-form textarea{min-height:110px;resize:vertical;line-height:1.5;}'
    + '.cztp-form input:focus,.cztp-form textarea:focus{outline:none;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.12);}'
    + '.cztp-row{display:flex;gap:8px;}'
    + '.cztp-primary{background:#2563EB;border:1px solid #2563EB;color:#fff;border-radius:7px;padding:7px 14px;'
    + 'font-size:12.5px;cursor:pointer;font-family:inherit;font-weight:500;}'
    + '.cztp-primary:hover{background:#1D4ED8;}'
    + '.cztp-danger{color:#B42318;border-color:#FDA29B;}'
    + '.cztp-toast{position:fixed;z-index:2147483002;bottom:24px;left:50%;transform:translateX(-50%);'
    + 'background:#101828;color:#fff;padding:8px 14px;border-radius:8px;font-size:12.5px;}'
    + '@media (prefers-reduced-motion:no-preference){.cztp-panel{animation:cztpIn .12s ease-out;}}'
    + '@keyframes cztpIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}';

  function injectCSS() {
    if (document.getElementById('cztp-style')) return;
    var s = document.createElement('style');
    s.id = 'cztp-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ */
  /* PAINEL                                                              */
  /* ------------------------------------------------------------------ */

  var panel = null, state = { q: '', cat: 'Todos', editing: null, view: 'list', idx: 0 };

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'cztp-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1600);
  }

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('keydown', onPanelKeys, true);
  }

  function onOutside(e) {
    if (panel && !panel.contains(e.target) && !e.target.closest('.cztp-btn')) closePanel();
  }

  function visibleList() {
    var all = load();
    var q = state.q.trim().toLowerCase();
    return all.filter(function (t) {
      if (state.cat !== 'Todos' && (t.cat || 'Geral') !== state.cat) return false;
      if (!q) return true;
      return (t.title + ' ' + t.body + ' ' + (t.cat || '')).toLowerCase().indexOf(q) > -1;
    });
  }

  function onPanelKeys(e) {
    if (!panel) return;
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); return; }
    if (state.view !== 'list') return;
    var items = panel.querySelectorAll('.cztp-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      state.idx = Math.max(0, Math.min(items.length - 1, state.idx + (e.key === 'ArrowDown' ? 1 : -1)));
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var list = visibleList();
      if (list[state.idx]) use(list[state.idx]);
    }
  }

  function use(tpl) {
    var field = findField();
    var text = render(tpl.body);
    if (insertText(field, text)) { closePanel(); }
    else { copy(text); }
  }

  function copy(text) {
    var out = render(text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out).then(function () { toast('Mensagem copiada'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = out; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Mensagem copiada'); } catch (e) {}
      ta.remove();
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function paint() {
    if (!panel) return;
    if (state.view === 'form') return paintForm();

    var all = load();
    var cats = ['Todos'].concat(all.map(function (t) { return t.cat || 'Geral'; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var list = visibleList();

    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>Mensagens rapidas</strong>'
      + '<button class="cztp-link" data-act="new">Nova</button>'
      + '<button class="cztp-link" data-act="io">Backup</button>'
      + '<button class="cztp-link" data-act="close" aria-label="Fechar">&#10005;</button></div>'
      + '<input class="cztp-search" placeholder="Buscar mensagem" value="' + esc(state.q) + '">'
      + '<div class="cztp-tabs">' + cats.map(function (c) {
          return '<button class="cztp-tab" data-cat="' + esc(c) + '" aria-pressed="' + (state.cat === c) + '">' + esc(c) + '</button>';
        }).join('') + '</div>'
      + '<div class="cztp-list">' + (list.length ? list.map(function (t, i) {
          return '<div class="cztp-item' + (i === state.idx ? ' is-active' : '') + '" data-id="' + t.id + '">'
            + '<div class="cztp-item-top"><span class="cztp-item-title">' + esc(t.title) + '</span>'
            + '<span class="cztp-item-cat">' + esc(t.cat || 'Geral') + '</span></div>'
            + '<div class="cztp-item-body">' + esc(t.body) + '</div>'
            + '<div class="cztp-item-acts">'
            + '<button class="cztp-mini" data-act="insert">Inserir</button>'
            + '<button class="cztp-mini" data-act="copy">Copiar</button>'
            + '<button class="cztp-mini" data-act="edit">Editar</button>'
            + '<button class="cztp-mini cztp-danger" data-act="del">Excluir</button>'
            + '</div></div>';
        }).join('') : '<div class="cztp-empty">Nenhuma mensagem encontrada.<br>Clique em Nova para cadastrar a primeira.</div>')
      + '</div>'
      + '<div class="cztp-foot"><span>Enter insere</span><span>{{nome}} vira o nome do contato</span></div>';

    var search = panel.querySelector('.cztp-search');
    search.addEventListener('input', function () { state.q = this.value; state.idx = 0; paint(); panel.querySelector('.cztp-search').focus(); });
    if (state.q) { search.focus(); search.setSelectionRange(state.q.length, state.q.length); } else { search.focus(); }
  }

  function paintForm() {
    var t = state.editing || { id: '', title: '', cat: '', body: '' };
    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>' + (t.id ? 'Editar mensagem' : 'Nova mensagem') + '</strong>'
      + '<button class="cztp-link" data-act="back">Voltar</button></div>'
      + '<div class="cztp-form">'
      + '<div><label>Titulo</label><input data-f="title" value="' + esc(t.title) + '" placeholder="Ex: Retomada 15min"></div>'
      + '<div><label>Categoria</label><input data-f="cat" value="' + esc(t.cat || '') + '" placeholder="Ex: Follow-up"></div>'
      + '<div><label>Mensagem</label><textarea data-f="body" placeholder="Use {{nome}} para o primeiro nome do contato">' + esc(t.body) + '</textarea></div>'
      + '<div class="cztp-row"><button class="cztp-primary" data-act="save">Salvar</button>'
      + '<button class="cztp-mini" data-act="back">Cancelar</button></div></div>';
    panel.querySelector('[data-f="title"]').focus();
  }

  function paintIO() {
    var json = JSON.stringify(load(), null, 2);
    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>Backup das mensagens</strong>'
      + '<button class="cztp-link" data-act="back">Voltar</button></div>'
      + '<div class="cztp-form">'
      + '<div><label>Cole aqui para importar, ou copie para salvar</label>'
      + '<textarea data-f="io" style="min-height:190px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;">' + esc(json) + '</textarea></div>'
      + '<div class="cztp-row"><button class="cztp-primary" data-act="import">Importar</button>'
      + '<button class="cztp-mini" data-act="copyjson">Copiar JSON</button></div></div>';
  }

  function onPanelClick(e) {
    var act = e.target.closest('[data-act]');
    var tab = e.target.closest('[data-cat]');
    var item = e.target.closest('.cztp-item');

    if (tab) { state.cat = tab.getAttribute('data-cat'); state.idx = 0; return paint(); }

    if (act) {
      var a = act.getAttribute('data-act');
      var list = load();
      var id = item && item.getAttribute('data-id');
      var tpl = id && list.filter(function (x) { return x.id === id; })[0];

      if (a === 'close') return closePanel();
      if (a === 'new') { state.editing = null; state.view = 'form'; return paintForm(); }
      if (a === 'io') { state.view = 'io'; return paintIO(); }
      if (a === 'back') { state.view = 'list'; state.editing = null; return paint(); }
      if (a === 'insert' && tpl) return use(tpl);
      if (a === 'copy' && tpl) { copy(tpl.body); return; }
      if (a === 'edit' && tpl) { state.editing = tpl; state.view = 'form'; return paintForm(); }
      if (a === 'del' && tpl) {
        if (!confirm('Excluir "' + tpl.title + '"?')) return;
        save(list.filter(function (x) { return x.id !== id; }));
        return paint();
      }
      if (a === 'save') {
        var get = function (f) { return (panel.querySelector('[data-f="' + f + '"]').value || '').trim(); };
        var title = get('title'), body = get('body'), cat = get('cat') || 'Geral';
        if (!title || !body) { toast('Preencha titulo e mensagem'); return; }
        if (state.editing && state.editing.id) {
          list = list.map(function (x) { return x.id === state.editing.id ? { id: x.id, title: title, cat: cat, body: body } : x; });
        } else {
          list.push({ id: uid(), title: title, cat: cat, body: body });
        }
        save(list);
        state.view = 'list'; state.editing = null;
        toast('Mensagem salva');
        return paint();
      }
      if (a === 'import') {
        try {
          var parsed = JSON.parse(panel.querySelector('[data-f="io"]').value);
          if (!Array.isArray(parsed)) throw new Error('formato');
          parsed = parsed.filter(function (x) { return x && x.title && x.body; })
            .map(function (x) { return { id: x.id || uid(), title: x.title, cat: x.cat || 'Geral', body: x.body }; });
          save(parsed);
          state.view = 'list';
          toast(parsed.length + ' mensagens importadas');
          return paint();
        } catch (err) { toast('JSON invalido'); return; }
      }
      if (a === 'copyjson') { copy(panel.querySelector('[data-f="io"]').value); return; }
    }

    if (item && state.view === 'list') {
      var l2 = load(), id2 = item.getAttribute('data-id');
      var t2 = l2.filter(function (x) { return x.id === id2; })[0];
      if (t2) use(t2);
    }
  }

  function openPanel(anchor) {
    injectCSS();
    if (panel) { closePanel(); return; }
    lastField = findField();
    state.view = 'list'; state.q = ''; state.idx = 0; state.editing = null;

    panel = document.createElement('div');
    panel.className = 'cztp-panel';
    panel.setAttribute('role', 'dialog');
    panel.addEventListener('click', onPanelClick);
    document.body.appendChild(panel);
    paint();

    var w = panel.offsetWidth || 380, h = panel.offsetHeight || 380;
    if (anchor) {
      var r = anchor.getBoundingClientRect();
      panel.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
      panel.style.top = Math.max(8, r.top - h - 8) + 'px';
    } else {
      panel.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
      panel.style.top = Math.round((window.innerHeight - h) / 2) + 'px';
    }

    setTimeout(function () {
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onPanelKeys, true);
    }, 0);
  }

  /* ------------------------------------------------------------------ */
  /* INJECAO DO BOTAO                                                    */
  /* ------------------------------------------------------------------ */

  function makeButton(floating) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cztp-btn' + (floating ? ' cztp-float' : '');
    b.title = 'Mensagens rapidas (Ctrl+Shift+Espaco)';
    b.setAttribute('aria-label', 'Mensagens rapidas');
    b.innerHTML = ICON_BTN;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      openPanel(b);
    });
    return b;
  }

  var floatBtn = null;

  function mount() {
    injectCSS();
    var field = findField();
    var bar = findToolbar(field);

    if (bar) {
      if (!bar.querySelector('.cztp-btn')) {
        var btn = makeButton(false);
        bar.insertBefore(btn, bar.firstChild);
        log('botao injetado na toolbar');
      }
      if (floatBtn) { floatBtn.remove(); floatBtn = null; }
      return;
    }

    if (CONFIG.floatingFallback && field && !floatBtn) {
      floatBtn = makeButton(true);
      document.body.appendChild(floatBtn);
      log('fallback flutuante');
    }
    if (!field && floatBtn) { floatBtn.remove(); floatBtn = null; }
  }

  var pending = null;
  function schedule() {
    clearTimeout(pending);
    pending = setTimeout(mount, 250);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  schedule();

  /* ------------------------------------------------------------------ */
  /* GATILHOS                                                            */
  /* ------------------------------------------------------------------ */

  if (CONFIG.hotkey) {
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        openPanel(document.querySelector('.cztp-btn'));
      }
    }, true);
  }

  if (CONFIG.slashTrigger) {
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (!el || (el.tagName !== 'TEXTAREA' && !el.isContentEditable)) return;
      var val = el.tagName === 'TEXTAREA' ? el.value : el.textContent;
      if (!/\/\/$/.test(val || '')) return;
      lastField = el;
      // remove os dois barras antes de abrir
      if (el.tagName === 'TEXTAREA') {
        var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, val.slice(0, -2));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.textContent = val.slice(0, -2);
      }
      openPanel(document.querySelector('.cztp-btn'));
    }, true);
  }

  window.__cazaTemplates.open = openPanel;
  window.__cazaTemplates.reset = function () { localStorage.removeItem(storeKey()); toast('Templates restaurados'); };
  log('carregado', window.__cazaTemplates.version, 'location', locationId());
})();
