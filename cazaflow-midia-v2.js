/*!
 * cazaflow-midia-v2.js
 * Comprime imagens e vídeos no navegador antes do upload nas Conversas do GHL.
 *
 * Novidade da v2: perfil por canal.
 *   O script lê qual aba está selecionada no composer (SMS, WhatsApp, Email)
 *   e aplica limites diferentes, porque cada canal aceita um tamanho.
 *
 *   SMS/MMS  -> operadora costuma recusar acima de ~600KB. Perfil agressivo.
 *   WhatsApp -> API oficial aceita 5MB imagem e 16MB vídeo. Perfil leve.
 *   Email    -> perfil intermediário.
 *
 * Se a aba não for identificada, usa o perfil 'padrao' para não degradar
 * arquivo à toa.
 *
 * Carregar no GHL (Settings > Custom JS):
 *   <script src="https://cdn.jsdelivr.net/gh/bcerretto-art/caza-scripts@main/cazaflow-midia-v2.js"></script>
 */

(function () {
  'use strict';

  if (window.__cazaMidia) return;
  window.__cazaMidia = { version: '2.0.0' };

  /* ------------------------------------------------------------------ */
  /* CONFIG                                                              */
  /* ------------------------------------------------------------------ */

  var PERFIS = {
    sms: {
      nome: 'SMS',
      imagemLimiteMB: 0.6,
      imagemAlvoMB: 0.45,
      imagemLadoMax: 1080,
      imagemQualidade: 0.72,
      videoAtivo: true,
      videoLimiteMB: 1.2,
      videoAlvoMB: 0.9,
      videoAlturaMax: 360,
      videoAudioKbps: 48
    },
    whatsapp: {
      nome: 'WhatsApp',
      imagemLimiteMB: 5,
      imagemAlvoMB: 4.2,
      imagemLadoMax: 1600,
      imagemQualidade: 0.82,
      videoAtivo: true,
      videoLimiteMB: 16,
      videoAlvoMB: 14.5,
      videoAlturaMax: 720,
      videoAudioKbps: 96
    },
    email: {
      nome: 'Email',
      imagemLimiteMB: 10,
      imagemAlvoMB: 2,
      imagemLadoMax: 1600,
      imagemQualidade: 0.8,
      videoAtivo: true,
      videoLimiteMB: 20,
      videoAlvoMB: 9,
      videoAlturaMax: 720,
      videoAudioKbps: 96
    }
  };

  PERFIS.padrao = PERFIS.whatsapp;

  var CONFIG = {
    perfilQuandoNaoDetectar: 'padrao',
    locations: [],   // vazio = todas as sub-contas
    debug: false
  };

  var CANAIS = [
    { chave: 'sms', teste: /^sms$/i },
    { chave: 'whatsapp', teste: /^whats\s?app$/i },
    { chave: 'email', teste: /^e-?mail$/i }
  ];

  var CDNS = [
    { ffmpeg: 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10', util: 'https://esm.sh/@ffmpeg/util@0.12.1', core: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd' },
    { ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm', util: 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm', core: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd' }
  ];

  var MB = 1024 * 1024;
  function log() { if (CONFIG.debug) console.log.apply(console, ['[caza-midia]'].concat([].slice.call(arguments))); }
  function mb(bytes) {
    if (bytes < MB) return Math.round(bytes / 1024) + 'KB';
    return (bytes / MB).toFixed(1).replace('.', ',') + 'MB';
  }

  function locationId() {
    var m = location.pathname.match(/location\/([A-Za-z0-9]+)/);
    return m ? m[1] : '';
  }

  function ativo() {
    if (!CONFIG.locations.length) return true;
    return CONFIG.locations.indexOf(locationId()) > -1;
  }

  /* ------------------------------------------------------------------ */
  /* CANAL ATIVO                                                         */
  /* ------------------------------------------------------------------ */

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 10 && r.height > 5;
  }

  function campoComposer() {
    var cands = [].slice.call(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]'));
    var found = null;
    cands.forEach(function (el) {
      if (!isVisible(el)) return;
      var ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '').toLowerCase();
      if (/mensagem|message|escreva|type a/.test(ph)) { found = el; return; }
      if (!found) found = el;
    });
    return found;
  }

  // Procura o seletor de canal (o botão "SMS", "WhatsApp"...) perto do composer.
  function canalAtivo() {
    var campo = campoComposer();
    var escopo = campo;
    for (var i = 0; i < 6 && escopo && escopo.parentElement; i++) escopo = escopo.parentElement;
    escopo = escopo || document.body;

    var nodes = [].slice.call(escopo.querySelectorAll('button, [role="tab"], [role="button"], span, div'));
    for (var j = 0; j < nodes.length; j++) {
      var el = nodes[j];
      if (el.children.length > 2) continue;
      if (!isVisible(el)) continue;
      var txt = (el.textContent || '').trim();
      if (!txt || txt.length > 12) continue;
      for (var k = 0; k < CANAIS.length; k++) {
        if (CANAIS[k].teste.test(txt)) return CANAIS[k].chave;
      }
    }
    return null;
  }

  function perfil() {
    var c = canalAtivo();
    var p = (c && PERFIS[c]) || PERFIS[CONFIG.perfilQuandoNaoDetectar] || PERFIS.padrao;
    log('canal', c, 'perfil', p.nome);
    return p;
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  var CSS = ''
    + '.czm-back{position:fixed;inset:0;z-index:2147483600;background:rgba(16,24,40,.45);'
    + 'display:flex;align-items:center;justify-content:center;font-family:inherit;}'
    + '.czm-box{background:#fff;border-radius:12px;width:330px;max-width:calc(100vw - 32px);padding:18px 18px 16px;'
    + 'box-shadow:0 16px 40px rgba(16,24,40,.24);color:#101828;font-size:13px;}'
    + '.czm-title{font-weight:600;font-size:14px;margin-bottom:4px;}'
    + '.czm-sub{color:#475467;font-size:12.5px;line-height:1.5;}'
    + '.czm-bar{height:6px;background:#EAECF0;border-radius:99px;margin:14px 0 10px;overflow:hidden;}'
    + '.czm-fill{height:100%;width:0;background:#2563EB;border-radius:99px;transition:width .25s ease;}'
    + '.czm-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}'
    + '.czm-pct{color:#667085;font-size:12px;font-variant-numeric:tabular-nums;}'
    + '.czm-btn{border:1px solid #D0D5DD;background:#fff;border-radius:7px;padding:5px 12px;font-size:12.5px;'
    + 'cursor:pointer;color:#344054;font-family:inherit;}'
    + '.czm-btn:hover{background:#F9FAFB;}'
    + '.czm-toast{position:fixed;z-index:2147483601;bottom:24px;left:50%;transform:translateX(-50%);'
    + 'background:#101828;color:#fff;padding:9px 15px;border-radius:8px;font-size:12.5px;max-width:420px;'
    + 'font-family:inherit;line-height:1.45;}'
    + '.czm-toast.is-warn{background:#B42318;}';

  function injectCSS() {
    if (document.getElementById('czm-style')) return;
    var s = document.createElement('style');
    s.id = 'czm-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function toast(msg, warn) {
    injectCSS();
    var t = document.createElement('div');
    t.className = 'czm-toast' + (warn ? ' is-warn' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, warn ? 6000 : 3000);
  }

  function progressUI(titulo, onCancel) {
    injectCSS();
    var back = document.createElement('div');
    back.className = 'czm-back';
    back.innerHTML = ''
      + '<div class="czm-box">'
      + '<div class="czm-title"></div>'
      + '<div class="czm-sub"></div>'
      + '<div class="czm-bar"><div class="czm-fill"></div></div>'
      + '<div class="czm-row"><span class="czm-pct">0%</span>'
      + '<button class="czm-btn" type="button">Cancelar</button></div>'
      + '</div>';
    back.querySelector('.czm-title').textContent = titulo;
    document.body.appendChild(back);

    var fill = back.querySelector('.czm-fill');
    var pct = back.querySelector('.czm-pct');
    var sub = back.querySelector('.czm-sub');
    back.querySelector('.czm-btn').addEventListener('click', function () {
      if (onCancel) onCancel();
      back.remove();
    });

    return {
      texto: function (t) { sub.textContent = t; },
      valor: function (v) {
        var p = Math.max(0, Math.min(100, Math.round(v * 100)));
        fill.style.width = p + '%';
        pct.textContent = p + '%';
      },
      fim: function () { back.remove(); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* IMAGEM                                                              */
  /* ------------------------------------------------------------------ */

  function trocarExt(nome, ext) { return nome.replace(/\.[^.]+$/, '') + '.' + ext; }

  function comprimirImagem(file, p) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, p.imagemLadoMax / Math.max(img.width, img.height));
        var w = Math.round(img.width * escala), h = Math.round(img.height * escala);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        var q = p.imagemQualidade;
        var lado = p.imagemLadoMax;

        var tentar = function () {
          canvas.toBlob(function (blob) {
            if (!blob) return resolve(null);
            if (blob.size > p.imagemAlvoMB * MB) {
              if (q > 0.42) { q -= 0.1; return tentar(); }
              // qualidade no piso: reduz resolução e recomeça
              if (lado > 480) {
                lado = Math.round(lado * 0.75);
                var e2 = Math.min(1, lado / Math.max(img.width, img.height));
                canvas.width = Math.round(img.width * e2);
                canvas.height = Math.round(img.height * e2);
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                q = p.imagemQualidade;
                return tentar();
              }
            }
            resolve(new File([blob], trocarExt(file.name, 'jpg'), { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', q);
        };
        tentar();
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------------ */
  /* VIDEO                                                               */
  /* ------------------------------------------------------------------ */

  var ffmpegRef = null;

  function carregarFFmpeg(ui) {
    if (ffmpegRef) return Promise.resolve(ffmpegRef);
    var tentativa = 0;

    function proximo() {
      if (tentativa >= CDNS.length) return Promise.reject(new Error('cdn'));
      var cdn = CDNS[tentativa++];
      return Promise.all([import(cdn.ffmpeg), import(cdn.util)])
        .then(function (mods) {
          var FFmpeg = mods[0].FFmpeg, toBlobURL = mods[1].toBlobURL;
          var ff = new FFmpeg();
          if (ui) ui.texto('Preparando o compressor, só na primeira vez nesta máquina');
          return Promise.all([
            toBlobURL(cdn.core + '/ffmpeg-core.js', 'text/javascript'),
            toBlobURL(cdn.core + '/ffmpeg-core.wasm', 'application/wasm')
          ]).then(function (urls) {
            return ff.load({ coreURL: urls[0], wasmURL: urls[1] }).then(function () {
              ffmpegRef = ff;
              return ff;
            });
          });
        })
        .catch(function (err) { log('cdn falhou', err); return proximo(); });
    }
    return proximo();
  }

  function duracaoVideo(file) {
    return new Promise(function (resolve) {
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = function () { URL.revokeObjectURL(v.src); resolve(v.duration || 0); };
      v.onerror = function () { resolve(0); };
      v.src = URL.createObjectURL(file);
    });
  }

  function processarVideo(file, p) {
    var cancelado = false;
    var ui = progressUI('Preparando o vídeo para ' + p.nome, function () {
      cancelado = true;
      if (ffmpegRef) { try { ffmpegRef.terminate(); } catch (e) {} ffmpegRef = null; }
    });
    ui.texto('O compressor é baixado só na primeira vez nesta máquina');

    return carregarFFmpeg(ui)
      .then(function (ff) {
        if (cancelado) return null;
        return Promise.all([duracaoVideo(file), file.arrayBuffer()]).then(function (res) {
          if (cancelado) return null;
          var dur = res[0], buf = new Uint8Array(res[1]);

          var alvoKbit = p.videoAlvoMB * 8 * 1024;
          var vKbps = dur > 0 ? Math.floor(alvoKbit / dur) - p.videoAudioKbps : 1200;
          vKbps = Math.max(120, Math.min(2500, vKbps));

          ui.texto('Comprimindo. Pode deixar a aba aberta.');
          ui.valor(0);
          ff.on('progress', function (ev) {
            if (ev && typeof ev.progress === 'number') ui.valor(ev.progress);
          });

          var larguraMax = Math.round(p.videoAlturaMax * 16 / 9);
          var ext = (file.name.match(/\.[^.]+$/) || ['.mp4'])[0];
          var entrada = 'entrada' + ext, saida = 'saida.mp4';

          return ff.writeFile(entrada, buf).then(function () {
            return ff.exec([
              '-i', entrada,
              '-vf', "scale='min(iw," + larguraMax + ")':'min(ih," + p.videoAlturaMax + ")':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
              '-c:v', 'libx264',
              '-preset', 'veryfast',
              '-b:v', vKbps + 'k',
              '-maxrate', Math.round(vKbps * 1.3) + 'k',
              '-bufsize', Math.round(vKbps * 2) + 'k',
              '-profile:v', 'baseline',
              '-level', '3.1',
              '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              '-b:a', p.videoAudioKbps + 'k',
              '-ac', '2',
              '-movflags', '+faststart',
              saida
            ]);
          }).then(function () {
            if (cancelado) return null;
            return ff.readFile(saida);
          }).then(function (data) {
            if (!data || cancelado) return null;
            try { ff.deleteFile(entrada); ff.deleteFile(saida); } catch (e) {}
            var blob = new Blob([data.buffer || data], { type: 'video/mp4' });
            return new File([blob], trocarExt(file.name, 'mp4'), { type: 'video/mp4', lastModified: Date.now() });
          });
        });
      })
      .catch(function (err) { log('erro video', err); return null; })
      .then(function (out) { ui.fim(); return out; });
  }

  /* ------------------------------------------------------------------ */
  /* DECISAO                                                             */
  /* ------------------------------------------------------------------ */

  function ehImagem(f) { return /^image\//.test(f.type); }
  function ehVideo(f) { return /^video\//.test(f.type); }
  function ehHeic(f) { return /heic|heif/i.test(f.type + ' ' + f.name); }

  function precisaTratar(f, p) {
    if (ehImagem(f) && !ehHeic(f)) return f.size > p.imagemAlvoMB * MB;
    if (ehVideo(f)) return f.size > p.videoAlvoMB * MB;
    return false;
  }

  function tratar(f, p) {
    if (ehImagem(f)) {
      return comprimirImagem(f, p).then(function (out) {
        if (!out) {
          toast('Não consegui reduzir ' + f.name + '. Acima de ' + p.imagemLimiteMB + 'MB o envio por ' + p.nome + ' pode falhar.', true);
          return f;
        }
        toast('Foto reduzida de ' + mb(f.size) + ' para ' + mb(out.size) + ' (' + p.nome + ')');
        return out;
      });
    }

    if (ehVideo(f)) {
      if (!p.videoAtivo) {
        toast('Vídeo de ' + mb(f.size) + '. O canal ' + p.nome + ' aceita até ' + p.videoLimiteMB + 'MB.', true);
        return Promise.resolve(f);
      }
      return processarVideo(f, p).then(function (out) {
        if (!out) {
          toast('Não consegui comprimir o vídeo aqui. Envie um arquivo menor ou mande o link.', true);
          return f;
        }
        if (out.size > p.videoLimiteMB * MB) {
          toast('O vídeo ficou em ' + mb(out.size) + ', ainda acima do limite de ' + p.nome + '. Tente um trecho mais curto.', true);
          return out;
        }
        toast('Vídeo comprimido de ' + mb(f.size) + ' para ' + mb(out.size) + ' (' + p.nome + ')');
        return out;
      });
    }

    return Promise.resolve(f);
  }

  function tratarLista(files) {
    var p = perfil();
    return files.reduce(function (chain, f) {
      return chain.then(function (acc) {
        if (!precisaTratar(f, p)) {
          if (ehHeic(f)) toast('Foto em HEIC do iPhone não pode ser reduzida aqui. Envie em JPEG.', true);
          acc.push(f);
          return acc;
        }
        return tratar(f, p).then(function (out) { acc.push(out); return acc; });
      });
    }, Promise.resolve([]));
  }

  function precisaAlgum(files) {
    var p = perfil();
    return files.some(function (f) { return precisaTratar(f, p); });
  }

  function novaLista(files) {
    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(f); });
    return dt;
  }

  /* ------------------------------------------------------------------ */
  /* INTERCEPTACAO                                                       */
  /* ------------------------------------------------------------------ */

  document.addEventListener('change', function (e) {
    if (!ativo()) return;
    var input = e.target;
    if (!input || input.tagName !== 'INPUT' || input.type !== 'file') return;
    if (input.__czPronto) { input.__czPronto = false; return; }

    var files = [].slice.call(input.files || []);
    if (!files.length || !precisaAlgum(files)) return;

    e.stopImmediatePropagation();
    e.preventDefault();
    log('interceptou input', files.map(function (f) { return f.name; }));

    tratarLista(files).then(function (out) {
      try {
        input.__czPronto = true;
        input.files = novaLista(out).files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (err) {
        log('falha ao reinjetar', err);
        toast('Arquivo pronto, mas não consegui devolver ao campo. Selecione de novo.', true);
      }
    });
  }, true);

  document.addEventListener('drop', function (e) {
    if (!ativo() || e.__czPronto) return;
    var dtIn = e.dataTransfer;
    if (!dtIn || !dtIn.files || !dtIn.files.length) return;
    var files = [].slice.call(dtIn.files);
    if (!precisaAlgum(files)) return;

    e.stopImmediatePropagation();
    e.preventDefault();
    var alvo = e.target;

    tratarLista(files).then(function (out) {
      try {
        var ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: novaLista(out) });
        ev.__czPronto = true;
        alvo.dispatchEvent(ev);
      } catch (err) {
        toast('Arquivo pronto. Solte novamente para anexar.', true);
      }
    });
  }, true);

  document.addEventListener('paste', function (e) {
    if (!ativo() || e.__czPronto) return;
    var cb = e.clipboardData;
    if (!cb || !cb.files || !cb.files.length) return;
    var files = [].slice.call(cb.files);
    if (!precisaAlgum(files)) return;

    e.stopImmediatePropagation();
    e.preventDefault();
    var alvo = e.target;

    tratarLista(files).then(function (out) {
      try {
        var ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: novaLista(out) });
        ev.__czPronto = true;
        alvo.dispatchEvent(ev);
      } catch (err) {
        toast('Arquivo pronto, mas o campo não aceitou. Use o clipe de anexo.', true);
      }
    });
  }, true);

  window.__cazaMidia.config = CONFIG;
  window.__cazaMidia.perfis = PERFIS;
  window.__cazaMidia.canal = canalAtivo;
  log('carregado v2 na location', locationId());
})();
