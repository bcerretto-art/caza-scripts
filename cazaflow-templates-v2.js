/*!
 * cazaflow-templates-v2.js
 * Biblioteca de mensagens rápidas no composer de Conversas (GHL / CazaFlow).
 *
 * Novidades da v2:
 *  - PRESETS por sub-conta: mensagens que já chegam prontas para todo mundo
 *    daquela location, sem ninguém precisar cadastrar nada.
 *  - Atalhos no estilo RD Station: digitar "/" no campo vazio abre o painel,
 *    e a busca casa pelo atalho (ex: /milanod33) ou pelo nome do produto.
 *  - Presets podem ser editados ou ocultados localmente sem sumir do código,
 *    e o botão "Restaurar padrão" desfaz tudo.
 *  - Templates criados pelo vendedor continuam salvos por navegador.
 *
 * Carregar no GHL (Settings > Custom JS):
 *   <script src="https://cdn.jsdelivr.net/gh/bcerretto-art/caza-scripts@main/cazaflow-templates-v2.js"></script>
 *
 * Para adicionar presets de um novo cliente, copie o bloco de uma location
 * dentro de PRESETS e troque o id. Nada mais precisa ser alterado.
 */

(function () {
  'use strict';

  if (window.__cazaTemplates) return;
  window.__cazaTemplates = { version: '2.0.0' };

  /* ------------------------------------------------------------------ */
  /* CONFIG                                                              */
  /* ------------------------------------------------------------------ */

  var CONFIG = {
    storagePrefix: 'caza_templates_',
    slashTrigger: true,        // "/" no campo vazio abre o painel
    hotkey: true,              // Ctrl+Shift+Espaco
    floatingFallback: true,
    incluirNomeProduto: true,  // insere o nome do produto na 1a linha da ficha
    debug: false
  };

  /* ------------------------------------------------------------------ */
  /* PRESETS GLOBAIS (todas as sub-contas)                               */
  /* Deixe vazio para cada cliente ver apenas o que é dele.              */
  /* ------------------------------------------------------------------ */

  var GLOBAL_PRESETS = [];

  /* ------------------------------------------------------------------ */
  /* PRESETS POR SUB-CONTA                                               */
  /* ------------------------------------------------------------------ */

  var PRESETS = {

    // Bernô Colchões
    'l1U42qENgxTu6CtLlasK': {
      label: 'Bernô Colchões',
      version: 1,
      items: [
        // ---------- Colchões ----------
        { k: 'milanod33', c: 'Colchões', t: 'Milano D33', b: 'Colchão de espuma D33 | Dupla Face | 30cm de altura | Suporte de 150kg por pessoa | Conforto Firme' },
        { k: 'carbon', c: 'Colchões', t: 'Carbon', b: 'Colchão de molas ensacadas | Revestimento em malha | 32cm de altura | Suporte de 120kg por pessoa | Conforto Intermediário' },
        { k: 'kingbest', c: 'Colchões', t: 'King Best', b: 'Colchão de molas ensacadas | Tecido em malha | 33cm de altura | Suporte de 120kg por pessoa | Conforto Intermediário' },
        { k: 'therapy', c: 'Colchões', t: 'Therapy', b: 'Colchão de espuma D33 | Dupla Face | 30cm de altura | Suporte de 150kg por pessoa | Conforto Extra Firme' },
        { k: 'venezia', c: 'Colchões', t: 'Venezia', b: 'Colchão de molas com espuma D20 e D26 | 24cm de altura | Suporte de 100kg por pessoa | Conforto Firme' },
        { k: 'caribe', c: 'Colchões', t: 'Caribe', b: 'Colchão de molas ensacadas com espuma D20 e D28 | 24cm de altura | Suporte de 120kg por pessoa | Conforto Intermediário' },
        { k: 'caribesolteiro', c: 'Colchões', t: 'Caribe Solteiro', b: 'Colchão de molas ensacadas com espuma D20 e D28 | 24cm de altura | Suporte de 120kg por pessoa | Conforto Intermediário' },
        { k: 'dream', c: 'Colchões', t: 'Dream', b: 'Colchão de molas Maxforce Pro | Colchão Híbrido | 26cm de altura | Suporte de 200kg por pessoa | Conforto Firme' },
        { k: 'savana', c: 'Colchões', t: 'Savana', b: 'Colchão de molas ensacadas | Pillow Top | 32cm de altura | Suporte de 120kg por pessoa | Conforto Macio' },
        { k: 'legriff', c: 'Colchões', t: 'Le Griff', b: 'Colchão de molas ensacadas | 33cm de altura | Suporte de 130kg por pessoa | Borda extra firme | Tecido em fibra de bambu | Conforto Intermediário' },
        { k: 'riviera', c: 'Colchões', t: 'Riviera', b: 'Colchão de molas ensacadas | 25cm de altura | Fibra de bambu | Suporte de 120kg por pessoa | Conforto intermediário/macio' },
        { k: 'starone', c: 'Colchões', t: 'Star One', b: 'Colchão de espuma alta densidade | 30cm de altura | Suporte de 140kg por pessoa | Colchão 100% Ortopédico' },
        { k: 'wellness', c: 'Colchões', t: 'Wellness', b: 'Colchão de molas ensacadas individuais | Pillow top UltraSoft Foam | 36cm de altura | Conforto extra macio' },
        { k: 'wish', c: 'Colchões', t: 'Wish', b: 'Colchão de molas ensacadas | Malha com íons de prata | Ultra Soft Foam | Borda extra firme | 30cm de altura | Suporte de 130kg por pessoa | Conforto macio' },
        { k: 'president', c: 'Colchões', t: 'President', b: 'Colchão de molas ensacadas individuais | Pillow top | Malha com íons de prata | Suporte de 250kg por pessoa | 32cm de altura | Conforto intermediário' },
        { k: 'napoles', c: 'Colchões', t: 'Nápoles', b: 'Colchão de espuma D28 e D20 | 24cm de altura | Proteção antiácaro e antifungo | Suporte de 110kg por pessoa | Conforto firme' },
        { k: 'barcelona', c: 'Colchões', t: 'Barcelona', b: 'Colchão de molas ensacadas | Tecido em malha | 30cm de altura | Suporte de 120kg por pessoa | Conforto macio' },
        { k: 'elegant', c: 'Colchões', t: 'Elegant', b: 'Colchão de molas ensacadas | Pillow Top | 27cm de altura | Suporte de 110kg por pessoa | Conforto macio' },
        { k: 'aspen', c: 'Colchões', t: 'Aspen', b: 'Colchão de molas ensacadas | Espuma D33 Hipersoft | 30cm de altura | Suporte de 150kg por pessoa | Conforto intermediário/macio' },
        { k: 'proconfort', c: 'Colchões', t: 'Pro Confort', b: 'Colchão de espuma D28 | Tecido em malha | 12cm de altura | Suporte de 100kg por pessoa | Conforto intermediário' },
        { k: 'maxsono', c: 'Colchões', t: 'Max Sono', b: 'Colchão de espuma D33 | Tecido em malha | 20cm de altura | Suporte de 120kg por pessoa | Conforto firme' },
        { k: 'toulon', c: 'Colchões', t: 'Toulon', b: 'Colchão de espuma D33 | Tecido em malha | 20cm de altura | Suporte de 120kg por pessoa | Conforto intermediário' },
        { k: 'blackgrafite', c: 'Colchões', t: 'Black Grafite', b: 'Colchão de molas ensacadas | Tecido em malha | 25cm de altura | Suporte de 120kg por pessoa | Conforto intermediário' },
        { k: 'supremo', c: 'Colchões', t: 'Supremo', b: 'Colchão de molas ensacadas | Tecido em malha | 25cm de altura | Suporte de 120kg por pessoa | Conforto intermediário' },
        { k: 'oasis', c: 'Colchões', t: 'Oásis', b: 'Colchão de molas ensacadas | Íons de prata | 40cm de altura | Suporte de 130kg por pessoa | Conforto macio' },
        { k: 'barid45', c: 'Colchões', t: 'Bari D45', b: 'Colchão de espuma D45 | Tecido em malha | 25cm de altura | Suporte de 150kg por pessoa | Conforto firme' },
        { k: 'titan', c: 'Colchões', t: 'Titan', b: 'Colchão de molas ensacadas | Tecido em malha | 30cm de altura | Suporte de 120kg por pessoa | Conforto intermediário' },
        { k: 'sleeplatex', c: 'Colchões', t: 'Sleep Látex', b: 'Colchão de molas ensacadas | Espuma Látex | 34cm de altura | Suporte de 120kg por pessoa | Conforto macio' },
        { k: 'orthopedichighplus', c: 'Colchões', t: 'Orthopedic High Plus', b: 'Colchão de espuma D26 com acabamento D20 | Tecido em malha | 25cm de altura | Conforto ortopédico' },
        { k: 'orthopedicsolteiro', c: 'Colchões', t: 'Orthopedic Solteiro', b: 'Colchão de espuma D26 com acabamento D20 | Tecido em malha | 25cm de altura | Conforto ortopédico' },
        { k: 'anatomico', c: 'Colchões', t: 'Anatômico', b: 'Colchão ortopédico | Espuma de alta densidade | double face | Tecido em malha | 22cm de altura | Conforto firme' },
        { k: 'sleepmax', c: 'Colchões', t: 'Sleep Max', b: 'Colchão de espuma D33 | 25cm de altura | Tecido em malha | Duble face | Suporte de 120kg por pessoa | Conforto firme' },
        { k: 'revolution', c: 'Colchões', t: 'Revolution', b: 'Colchão de molas tecnopedic biconica | Tecido em malha | Espuma D20/D26 | 30cm de altura | Duble face | Suporte de 110kg por pessoa | Conforto intermediário' },
        { k: 'revolutionking', c: 'Colchões', t: 'Revolution King', b: 'Colchão de molas ensacadas | 30cm de altura | Camada de espuma D20/D26 | Conforto intermediário' },
        { k: 'class', c: 'Colchões', t: 'Class', b: 'Colchão de molas | 25cm de altura | Conforto intermediário' },
        { k: 'pantanal', c: 'Colchões', t: 'Pantanal', b: 'Colchão de espuma D28 | Duble face | 20cm de altura | Suporte de 80kg por pessoa | Conforto firme' },
        { k: 'pantanalsuper', c: 'Colchões', t: 'Pantanal Super', b: 'Colchão de molas | Ortopillow | 25cm de altura | Suporte de peso 100kg por pessoa | Conforto intermediário' },
        { k: 'lightd45', c: 'Colchões', t: 'Light D45', b: 'Colchão de espuma D45, Dupla face, Ortobom, Conforto firme, 17cm Altura' },
        { k: 'bioconfort', c: 'Colchões', t: 'Bioconfort', b: 'Colchão de molas ensacadas individual | 30cm de altura | Pillow Top | Revestimento em algodão belga | Conforto Macio' },
        { k: 'fitortopedico', c: 'Colchões', t: 'Fit Ortopédico', b: 'Colchão ortopédico de espuma | Tecido em malha | 23cm de altura | Suporte de 120kg por pessoa | Conforto Firme' },
        { k: 'california', c: 'Colchões', t: 'California', b: 'Colchão de molas ensacadas individual | Tecnologia Europeia | 30cm de altura | Suporte de 150kg por pessoa | Proteção anti-ácaros, anti-alérgica e anti-mofo | Conforto intermediário/macio' },
        { k: 'airtech', c: 'Colchões', t: 'Airtech', b: 'Colchão de espuma | Pillow Top Europeu que garante toque macio aliado a firmeza estrutural | 28cm de altura | Suporte de peso 120kg por pessoa | Conforto Intermediário' },

        // ---------- Roupeiros ----------
        { k: 'verona', c: 'Roupeiros', t: 'Verona Plus', b: 'Roupeiro Verona Plus 2 portas de correr / 1 com espelho e 4 gavetas 100% MDF\n2,18 de altura, 2,05 de largura por 51 cm de profundidade\nAcabamento com verniz UV\nGavetas com corrediças telescópicas' },
        { k: 'oslo', c: 'Roupeiros', t: 'Oslo', b: 'Roupeiros Oslo 6 portas com 6 gavetas 100% MDF\n2,35 de altura, 2,10 de largura e 50 cm de profundidade\nAcabamento com verniz UV' },
        { k: 'vitoria', c: 'Roupeiros', t: 'Vitória', b: 'Roupeiro Vitória 3 portas de correr 100% MDF\n2,35 de altura, 2,75 de largura e 63 cm de profundidade\n6 gavetas sendo 2 delas com chave\nGavetas com corrediças telescópicas\nAcabamento com verniz UV' },
        { k: 'alba', c: 'Roupeiros', t: 'Alba Plus', b: 'Roupeiro Alba Plus 6 portas e 4 gavetas 100% MDF\n2,37 de altura, 2,46 de largura e 55 cm de profundidade\nGavetas com corrediças telescópicas\nAcabamento com verniz UV' },
        { k: 'toronto', c: 'Roupeiros', t: 'Toronto', b: 'Roupeiro Toronto 3 portas de correr com Espelho 100% MDF\n2,35 de altura, 2,75 de largura e 63 cm de profundidade\n6 gavetas sendo 2 delas com chave\nGavetas com corrediças telescópicas\nAcabamento com verniz UV' },
        { k: 'potente', c: 'Roupeiros', t: 'Potente', b: 'Roupeiro Potente 6 portas e 6 gavetas 100% MDF\n2,37 altura, 2,50 de largura e 56 cm de profundidade\n6 gavetas com corrediças telescópicas (sendo 2 delas com chave)\n2 sapateiras com corrediças telescópicas\nAcabamento em verniz UV' },
        { k: 'nantes', c: 'Roupeiros', t: 'Nantes', b: 'Roupeiro Nantes 4 portas e 3 portas gavetas 100% MDF\n2,37 de altura, 1,69 largura e 56 cm de profundidade\n3 gavetas com corrediças telescópicas (sendo 1 com chave)\n1 sapateira com corrediça telescópica\nAcabamento e pintura UV' },
        { k: 'zurique', c: 'Roupeiros', t: 'Zurique', b: 'Roupeiro Zurique 2 portas de correr / 1 com espelho 100% MDF\n2,35 de altura, 1,70 de largura e 56 cm de profundidade\n4 gavetas com corrediças telescópicas\nAcabamento e pintura UV' },
        { k: 'athenas', c: 'Roupeiros', t: 'Athenas', b: 'Roupeiro Athenas 3 portas de correr / 1 com espelho e 6 gavetas 100% MDF\n2,35 de altura, 2,26 de largura e 56 cm de profundidade\n6 gavetas com corrediças telescópicas\nAcabamento e pintura UV' },

        // ---------- Camas ----------
        { k: 'belicheitalia', c: 'Camas', t: 'Beliche Itália', b: 'Beliche de madeira maciça, versátil desmontavel vira duas camas de solteiro' },
        { k: 'trelicheitalia', c: 'Camas', t: 'Treliche Itália', b: 'Treliche de madeira maciça, super resistente, ótima para economizar espaço e atende a família toda.' },
        { k: 'camaitalia', c: 'Camas', t: 'Cama Itália', b: 'Cama de madeira maciça, alta resistência e durabilidade' },

        // ---------- Bicamas ----------
        { k: 'bicamadiference', c: 'Bicamas', t: 'Bicama Diference', b: 'Bicama com colchão auxiliar de molas | Suporte de 120kg | Conforto Macio' },
        { k: 'bicama3em1', c: 'Bicamas', t: 'Bicama 3 em 1', b: 'Bicama com baú | Otima para economizar espaço | Colchão Auxiliar de espuma' },
        { k: 'bicamacastor', c: 'Bicamas', t: 'Bicama Castor', b: 'Bicama com colchão auxiliar de espuma | Suporte de 100kg | Conforto firme' },

        // ---------- Baús e bases ----------
        { k: 'bausolteiro', c: 'Baús e bases', t: 'Baú Solteiro', b: 'Baú blindado | Pistões a gás | Feito com madeira de eucalipto' },
        { k: 'baucasal', c: 'Baús e bases', t: 'Baú Casal', b: 'Baú blindado | Pistões a gás | Feito com madeira de eucalipto' },
        { k: 'baubipartido', c: 'Baús e bases', t: 'Baú Bipartido', b: 'Baú blindado | Pistões a gás | Feito com madeira de eucalipto' },
        { k: 'basesolteiro', c: 'Baús e bases', t: 'Base Solteiro', b: 'Base sem baú' },
        { k: 'basecasal', c: 'Baús e bases', t: 'Base Casal', b: 'Base sem baú' },
        { k: 'basebipartida', c: 'Baús e bases', t: 'Base Bipartida', b: 'Base bipartida sem baú' }
      ]
    }

  };

  var ICON_BTN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 10h10"/><path d="M4 15h13"/><path d="M17.5 19.5l2.5-2.5-2.5-2.5"/></svg>';

  function log() { if (CONFIG.debug) console.log.apply(console, ['[caza-templates]'].concat([].slice.call(arguments))); }

  /* ------------------------------------------------------------------ */
  /* DADOS                                                               */
  /* ------------------------------------------------------------------ */

  function locationId() {
    var m = location.pathname.match(/location\/([A-Za-z0-9]+)/);
    return m ? m[1] : 'global';
  }

  function storeKey() { return CONFIG.storagePrefix + locationId(); }

  // { custom: [], hidden: [ids de preset ocultos], edits: { id: {t,c,b} } }
  function readStore() {
    var base = { custom: [], hidden: [], edits: {} };
    try {
      var raw = localStorage.getItem(storeKey());
      if (!raw) return base;
      var d = JSON.parse(raw);
      if (Array.isArray(d)) return { custom: d, hidden: [], edits: {} }; // migra da v1
      return {
        custom: Array.isArray(d.custom) ? d.custom : [],
        hidden: Array.isArray(d.hidden) ? d.hidden : [],
        edits: d.edits && typeof d.edits === 'object' ? d.edits : {}
      };
    } catch (e) { return base; }
  }

  function writeStore(d) {
    try { localStorage.setItem(storeKey(), JSON.stringify(d)); }
    catch (e) { toast('Não foi possível salvar neste navegador'); }
  }

  function presetItems() {
    var loc = PRESETS[locationId()];
    var out = GLOBAL_PRESETS.map(function (x) { return normalize(x, 'g'); });
    if (loc) out = out.concat(loc.items.map(function (x) { return normalize(x, 'p'); }));
    return out;
  }

  function normalize(x, prefix) {
    return {
      id: prefix + '_' + (x.k || x.t).toLowerCase().replace(/[^a-z0-9]/g, ''),
      key: x.k || '',
      cat: x.c || 'Geral',
      title: x.t,
      body: x.b,
      preset: true
    };
  }

  function allTemplates() {
    var store = readStore();
    var list = presetItems()
      .filter(function (p) { return store.hidden.indexOf(p.id) === -1; })
      .map(function (p) {
        var e = store.edits[p.id];
        return e ? { id: p.id, key: p.key, cat: e.cat || p.cat, title: e.title || p.title, body: e.body || p.body, preset: true, edited: true } : p;
      });
    return list.concat(store.custom.map(function (c) {
      return { id: c.id, key: c.key || '', cat: c.cat || 'Geral', title: c.title, body: c.body, preset: false };
    }));
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

  function findField() {
    if (lastField && document.contains(lastField) && isVisible(lastField)) return lastField;
    var cands = [].slice.call(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]'));
    var found = null;
    cands.forEach(function (el) {
      if (!isVisible(el)) return;
      var ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '').toLowerCase();
      if (/mensagem|message|escreva|type a/.test(ph)) { found = el; return; }
      if (!found) found = el;
      else if (el.getBoundingClientRect().top > found.getBoundingClientRect().top) found = el;
    });
    lastField = found;
    return found;
  }

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
        } else { field.textContent += text; }
      }
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      return true;
    }
    return false;
  }

  function finalText(t) {
    if (CONFIG.incluirNomeProduto && t.preset && t.key) return t.title + '\n' + t.body;
    return t.body;
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
    + '.cztp-panel{position:fixed;z-index:2147483001;width:400px;max-width:calc(100vw - 24px);background:#fff;'
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
    + '.cztp-list{max-height:340px;overflow-y:auto;padding:0 6px 6px;}'
    + '.cztp-item{padding:8px 10px;border-radius:8px;cursor:pointer;}'
    + '.cztp-item:hover,.cztp-item.is-active{background:#F5F8FF;}'
    + '.cztp-item-top{display:flex;align-items:center;gap:6px;}'
    + '.cztp-item-title{font-weight:600;font-size:12.5px;}'
    + '.cztp-key{font-size:11px;color:#2563EB;font-family:ui-monospace,Menlo,monospace;flex:1;}'
    + '.cztp-item-cat{font-size:10.5px;color:#667085;background:#F2F4F7;border-radius:4px;padding:1px 6px;}'
    + '.cztp-item-body{margin-top:3px;color:#475467;font-size:12px;line-height:1.45;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;}'
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
    + '.cztp-form textarea{min-height:120px;resize:vertical;line-height:1.5;}'
    + '.cztp-form input:focus,.cztp-form textarea:focus{outline:none;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.12);}'
    + '.cztp-row{display:flex;gap:8px;align-items:center;}'
    + '.cztp-primary{background:#2563EB;border:1px solid #2563EB;color:#fff;border-radius:7px;padding:7px 14px;'
    + 'font-size:12.5px;cursor:pointer;font-family:inherit;font-weight:500;}'
    + '.cztp-primary:hover{background:#1D4ED8;}'
    + '.cztp-danger{color:#B42318;border-color:#FDA29B;}'
    + '.cztp-hint{color:#667085;font-size:11.5px;line-height:1.5;}'
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
    var q = state.q.trim().toLowerCase().replace(/^\//, '');
    return allTemplates().filter(function (t) {
      if (state.cat !== 'Todos' && t.cat !== state.cat) return false;
      if (!q) return true;
      return (t.key + ' ' + t.title + ' ' + t.body + ' ' + t.cat).toLowerCase().indexOf(q) > -1;
    });
  }

  function byId(id) {
    return allTemplates().filter(function (x) { return x.id === id; })[0];
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
      var act = panel.querySelector('.cztp-item.is-active');
      if (act) act.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var list = visibleList();
      if (list[state.idx]) use(list[state.idx]);
    }
  }

  function use(tpl) {
    var text = finalText(tpl);
    if (insertText(findField(), text)) closePanel();
    else copyText(text);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Mensagem copiada'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Mensagem copiada'); } catch (e) {}
      ta.remove();
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function paint() {
    if (!panel) return;
    if (state.view === 'form') return paintForm();
    if (state.view === 'io') return paintIO();

    var all = allTemplates();
    var cats = ['Todos'].concat(all.map(function (t) { return t.cat; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var list = visibleList();
    var loc = PRESETS[locationId()];

    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>' + esc(loc ? loc.label : 'Mensagens rápidas') + '</strong>'
      + '<button class="cztp-link" data-act="new">Nova</button>'
      + '<button class="cztp-link" data-act="io">Ajustes</button>'
      + '<button class="cztp-link" data-act="close" aria-label="Fechar">&#10005;</button></div>'
      + '<input class="cztp-search" placeholder="Buscar por nome ou atalho" value="' + esc(state.q) + '">'
      + '<div class="cztp-tabs">' + cats.map(function (c) {
          return '<button class="cztp-tab" data-cat="' + esc(c) + '" aria-pressed="' + (state.cat === c) + '">' + esc(c) + '</button>';
        }).join('') + '</div>'
      + '<div class="cztp-list">' + (list.length ? list.map(function (t, i) {
          return '<div class="cztp-item' + (i === state.idx ? ' is-active' : '') + '" data-id="' + esc(t.id) + '">'
            + '<div class="cztp-item-top"><span class="cztp-item-title">' + esc(t.title) + '</span>'
            + '<span class="cztp-key">' + (t.key ? '/' + esc(t.key) : '') + '</span>'
            + '<span class="cztp-item-cat">' + esc(t.cat) + '</span></div>'
            + '<div class="cztp-item-body">' + esc(t.body) + '</div>'
            + '<div class="cztp-item-acts">'
            + '<button class="cztp-mini" data-act="insert">Inserir</button>'
            + '<button class="cztp-mini" data-act="copy">Copiar</button>'
            + '<button class="cztp-mini" data-act="edit">Editar</button>'
            + '<button class="cztp-mini cztp-danger" data-act="del">' + (t.preset ? 'Ocultar' : 'Excluir') + '</button>'
            + '</div></div>';
        }).join('') : '<div class="cztp-empty">Nada encontrado.<br>Clique em Nova para cadastrar uma mensagem.</div>')
      + '</div>'
      + '<div class="cztp-foot"><span>' + all.length + ' mensagens</span><span>Enter insere</span><span>Setas navegam</span></div>';

    var search = panel.querySelector('.cztp-search');
    search.addEventListener('input', function () {
      state.q = this.value; state.idx = 0; paint();
      panel.querySelector('.cztp-search').focus();
    });
    search.focus();
    if (state.q) search.setSelectionRange(state.q.length, state.q.length);
  }

  function paintForm() {
    var t = state.editing || { id: '', title: '', cat: '', body: '', key: '' };
    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>' + (t.id ? 'Editar mensagem' : 'Nova mensagem') + '</strong>'
      + '<button class="cztp-link" data-act="back">Voltar</button></div>'
      + '<div class="cztp-form">'
      + '<div class="cztp-row"><div style="flex:2"><label>Título</label>'
      + '<input data-f="title" value="' + esc(t.title) + '" placeholder="Ex: Milano D33"></div>'
      + '<div style="flex:1"><label>Atalho</label>'
      + '<input data-f="key" value="' + esc(t.key) + '" placeholder="milanod33"></div></div>'
      + '<div><label>Categoria</label><input data-f="cat" value="' + esc(t.cat) + '" placeholder="Ex: Colchões"></div>'
      + '<div><label>Mensagem</label><textarea data-f="body">' + esc(t.body) + '</textarea></div>'
      + '<div class="cztp-row"><button class="cztp-primary" data-act="save">Salvar</button>'
      + '<button class="cztp-mini" data-act="back">Cancelar</button></div></div>';
    panel.querySelector('[data-f="title"]').focus();
  }

  function paintIO() {
    var store = readStore();
    panel.innerHTML = ''
      + '<div class="cztp-head"><strong>Ajustes</strong>'
      + '<button class="cztp-link" data-act="back">Voltar</button></div>'
      + '<div class="cztp-form">'
      + '<div class="cztp-hint">As mensagens padrão vêm do script e aparecem para todo mundo desta sub-conta. '
      + 'O que você criar, editar ou ocultar fica só neste navegador.</div>'
      + '<div class="cztp-row"><button class="cztp-mini cztp-danger" data-act="restore">Restaurar padrão</button>'
      + '<span class="cztp-hint">' + store.hidden.length + ' ocultas, ' + Object.keys(store.edits).length + ' editadas</span></div>'
      + '<div><label>Suas mensagens (JSON para backup ou importação)</label>'
      + '<textarea data-f="io" style="min-height:170px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;">'
      + esc(JSON.stringify(store, null, 2)) + '</textarea></div>'
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
      var store = readStore();
      var id = item && item.getAttribute('data-id');
      var tpl = id && byId(id);

      if (a === 'close') return closePanel();
      if (a === 'new') { state.editing = null; state.view = 'form'; return paintForm(); }
      if (a === 'io') { state.view = 'io'; return paintIO(); }
      if (a === 'back') { state.view = 'list'; state.editing = null; return paint(); }
      if (a === 'insert' && tpl) return use(tpl);
      if (a === 'copy' && tpl) return copyText(finalText(tpl));
      if (a === 'edit' && tpl) { state.editing = tpl; state.view = 'form'; return paintForm(); }

      if (a === 'del' && tpl) {
        if (tpl.preset) {
          if (!confirm('Ocultar "' + tpl.title + '" nesta máquina?')) return;
          store.hidden.push(tpl.id);
          delete store.edits[tpl.id];
        } else {
          if (!confirm('Excluir "' + tpl.title + '"?')) return;
          store.custom = store.custom.filter(function (x) { return x.id !== tpl.id; });
        }
        writeStore(store);
        return paint();
      }

      if (a === 'save') {
        var get = function (f) { return (panel.querySelector('[data-f="' + f + '"]').value || '').trim(); };
        var title = get('title'), body = get('body');
        var cat = get('cat') || 'Geral';
        var key = get('key').replace(/^\//, '').toLowerCase();
        if (!title || !body) { toast('Preencha título e mensagem'); return; }

        var ed = state.editing;
        if (ed && ed.preset) {
          store.edits[ed.id] = { title: title, cat: cat, body: body };
        } else if (ed && ed.id) {
          store.custom = store.custom.map(function (x) {
            return x.id === ed.id ? { id: x.id, key: key, title: title, cat: cat, body: body } : x;
          });
        } else {
          store.custom.push({ id: uid(), key: key, title: title, cat: cat, body: body });
        }
        writeStore(store);
        state.view = 'list'; state.editing = null;
        toast('Mensagem salva');
        return paint();
      }

      if (a === 'restore') {
        if (!confirm('Voltar as mensagens padrão ao original? Suas mensagens próprias continuam.')) return;
        store.hidden = []; store.edits = {};
        writeStore(store);
        state.view = 'list';
        toast('Padrão restaurado');
        return paint();
      }

      if (a === 'import') {
        try {
          var parsed = JSON.parse(panel.querySelector('[data-f="io"]').value);
          if (Array.isArray(parsed)) parsed = { custom: parsed, hidden: [], edits: {} };
          writeStore({
            custom: Array.isArray(parsed.custom) ? parsed.custom : [],
            hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
            edits: parsed.edits || {}
          });
          state.view = 'list';
          toast('Importado');
          return paint();
        } catch (err) { toast('JSON inválido'); return; }
      }

      if (a === 'copyjson') return copyText(panel.querySelector('[data-f="io"]').value);
    }

    if (item && state.view === 'list') {
      var t2 = byId(item.getAttribute('data-id'));
      if (t2) use(t2);
    }
  }

  function openPanel(anchor, query) {
    injectCSS();
    if (panel) { closePanel(); return; }
    lastField = findField();
    state.view = 'list'; state.q = query || ''; state.idx = 0; state.editing = null; state.cat = 'Todos';

    panel = document.createElement('div');
    panel.className = 'cztp-panel';
    panel.setAttribute('role', 'dialog');
    panel.addEventListener('click', onPanelClick);
    document.body.appendChild(panel);
    paint();

    var w = panel.offsetWidth || 400, h = panel.offsetHeight || 420;
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
  /* BOTAO                                                               */
  /* ------------------------------------------------------------------ */

  function makeButton(floating) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cztp-btn' + (floating ? ' cztp-float' : '');
    b.title = 'Mensagens rápidas (Ctrl+Shift+Espaço)';
    b.setAttribute('aria-label', 'Mensagens rápidas');
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
      if (!bar.querySelector('.cztp-btn')) bar.insertBefore(makeButton(false), bar.firstChild);
      if (floatBtn) { floatBtn.remove(); floatBtn = null; }
      return;
    }
    if (CONFIG.floatingFallback && field && !floatBtn) {
      floatBtn = makeButton(true);
      document.body.appendChild(floatBtn);
    }
    if (!field && floatBtn) { floatBtn.remove(); floatBtn = null; }
  }

  var pending = null;
  function schedule() { clearTimeout(pending); pending = setTimeout(mount, 250); }

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

  // "/" sozinho no campo vazio abre o painel, igual ao RD Station.
  if (CONFIG.slashTrigger) {
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (!el || (el.tagName !== 'TEXTAREA' && !el.isContentEditable)) return;
      if (panel) return;
      var val = el.tagName === 'TEXTAREA' ? el.value : el.textContent;
      if (val !== '/' && val !== '//') return;
      lastField = el;
      if (el.tagName === 'TEXTAREA') {
        var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else { el.textContent = ''; }
      openPanel(document.querySelector('.cztp-btn'));
    }, true);
  }

  window.__cazaTemplates.open = openPanel;
  window.__cazaTemplates.location = locationId;
  window.__cazaTemplates.count = function () { return allTemplates().length; };
  log('carregado v2 na location', locationId());
})();
