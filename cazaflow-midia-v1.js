/*!
 * cazaflow-midia-v1.js
 * Comprime imagens e vídeos no navegador antes do upload nas Conversas do GHL,
 * do mesmo jeito que o app do WhatsApp faz quando você anexa da galeria.
 *
 * Por que existe:
 *   A WhatsApp Business API recusa imagem acima de 5MB e vídeo acima de 16MB.
 *   O GHL envia o arquivo original, então foto de celular e vídeo de loja falham.
 *   Este script intercepta o anexo, reduz, e entrega o arquivo já dentro do limite.
 *
 * Imagem: redimensiona via canvas e salva em JPEG. Instantâneo.
 * Vídeo: transcodifica com ffmpeg em WebAssembly, carregado sob demanda.
 *        A primeira conversão baixa o runtime (cerca de 30MB, fica em cache).
 *        Se o carregamento falhar, o arquivo original segue e o vendedor é avisado.
 *
 * Carregar no GHL (Settings > Custom JS):
 *   <script src="https://cdn.jsdelivr.net/gh/bcerretto-art/caza-scripts@main/cazaflow-midia-v1.js"></script>
 */

(function () {
  'use strict';

  if (window.__cazaMidia) return;
  window.__cazaMidia = { version: '1.0.0' };

  /* ------------------------------------------------------------------ */
  /* CONFIG                                                              */
  /* ------------------------------------------------------------------ */

  var CONFIG = {
    // Limites reais da API do WhatsApp, com folga de segurança.
    imagemLimiteMB: 5,
    imagemAlvoMB: 4.2,
    videoLimiteMB: 16,
    videoAlvoMB: 14.5,

    imagemLadoMax: 1600,     // maior lado da foto depois de reduzir
    imagemQualidade: 0.82,

    videoAlturaMax: 720,     // 720p, igual ao padrão do WhatsApp
    videoAudioKbps: 96,
    videoAtivo: true,        // false = só imagem, vídeo grande apenas avisa

    // Sub-contas onde o script atua. Vazio = todas.
    locations: [],

    debug: false
  };

  var CDNS = [
    { ffmpeg: 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10', util: 'https://esm.sh/@ffmpeg/util@0.12.1', core: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd' },
    { ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm', util: 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm', core: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd' }
  ];

  var MB = 1024 * 1024;
  function log() { if (CONFIG.debug) console.log.apply(console, ['[caza-midia]'].concat([].slice.call(arguments))); }
  function mb(bytes) { return (bytes / MB).toFixed(1).replace('.', ',') + 'MB'; }

  function locationId() {
    var m = location.pathname.match(/location\/([A-Za-z0-9]+)/);
    return m ? m[1] : '';
  }

  function ativo() {
    if (!CONFIG.locations.length) return true;
    return CONFIG.locations.indexOf(locationId()) > -1;
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

  function comprimirImagem(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, CONFIG.imagemLadoMax / Math.max(img.width, img.height));
        var w = Math.round(img.width * escala), h = Math.round(img.height * escala);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        var q = CONFIG.imagemQualidade;
        var tentar = function () {
          canvas.toBlob(function (blob) {
            if (!blob) return resolve(null);
            if (blob.size > CONFIG.imagemAlvoMB * MB && q > 0.45) {
              q -= 0.12;
              return tentar();
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

  function trocarExt(nome, ext) {
    return nome.replace(/\.[^.]+$/, '') + '.' + ext;
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
          if (ui) ui.texto('Preparando o compressor, só na primeira vez');
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

  function processarVideo(file) {
    var cancelado = false;
    var ui = progressUI('Preparando o vídeo', function () {
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

          var alvoKbit = CONFIG.videoAlvoMB * 8 * 1024;
          var vKbps = dur > 0 ? Math.floor(alvoKbit / dur) - CONFIG.videoAudioKbps : 1200;
          vKbps = Math.max(320, Math.min(2500, vKbps));

          ui.texto('Comprimindo. Pode deixar a aba aberta.');
          ui.valor(0);
          ff.on('progress', function (ev) {
            if (ev && typeof ev.progress === 'number') ui.valor(ev.progress);
          });

          var ext = (file.name.match(/\.[^.]+$/) || ['.mp4'])[0];
          var entrada = 'entrada' + ext, saida = 'saida.mp4';

          return ff.writeFile(entrada, buf).then(function () {
            return ff.exec([
              '-i', entrada,
              '-vf', "scale='min(iw," + Math.round(CONFIG.videoAlturaMax * 16 / 9) + ")':'min(ih," + CONFIG.videoAlturaMax + ")':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
              '-c:v', 'libx264',
              '-preset', 'veryfast',
              '-b:v', vKbps + 'k',
              '-maxrate', Math.round(vKbps * 1.3) + 'k',
              '-bufsize', Math.round(vKbps * 2) + 'k',
              '-profile:v', 'baseline',
              '-level', '3.1',
              '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              '-b:a', CONFIG.videoAudioKbps + 'k',
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

  function precisaTratar(f) {
    if (ehImagem(f) && !ehHeic(f)) return f.size > CONFIG.imagemAlvoMB * MB;
    if (ehVideo(f)) return f.size > CONFIG.videoAlvoMB * MB;
    return false;
  }

  function tratar(f) {
    if (ehImagem(f)) {
      return comprimirImagem(f).then(function (out) {
        if (!out) { toast('Não consegui reduzir ' + f.name + '. O envio pode falhar acima de ' + CONFIG.imagemLimiteMB + 'MB.', true); return f; }
        toast('Foto reduzida de ' + mb(f.size) + ' para ' + mb(out.size));
        return out;
      });
    }

    if (ehVideo(f)) {
      if (!CONFIG.videoAtivo) {
        toast('Vídeo de ' + mb(f.size) + '. O WhatsApp aceita até ' + CONFIG.videoLimiteMB + 'MB, reduza antes de enviar.', true);
        return Promise.resolve(f);
      }
      return processarVideo(f).then(function (out) {
        if (!out) {
          toast('Não consegui comprimir o vídeo aqui. Envie um arquivo abaixo de ' + CONFIG.videoLimiteMB + 'MB ou mande o link.', true);
          return f;
        }
        if (out.size > CONFIG.videoLimiteMB * MB) {
          toast('O vídeo ficou em ' + mb(out.size) + ', ainda acima do limite. Tente um trecho mais curto.', true);
          return out;
        }
        toast('Vídeo comprimido de ' + mb(f.size) + ' para ' + mb(out.size));
        return out;
      });
    }

    return Promise.resolve(f);
  }

  function tratarLista(files) {
    return files.reduce(function (chain, f) {
      return chain.then(function (acc) {
        if (!precisaTratar(f)) {
          if (ehHeic(f)) toast('Foto em HEIC do iPhone não pode ser reduzida aqui. Envie em JPEG.', true);
          acc.push(f);
          return acc;
        }
        return tratar(f).then(function (out) { acc.push(out); return acc; });
      });
    }, Promise.resolve([]));
  }

  function novaLista(files) {
    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(f); });
    return dt;
  }

  /* ------------------------------------------------------------------ */
  /* INTERCEPTACAO                                                       */
  /* ------------------------------------------------------------------ */

  // 1) input type=file
  document.addEventListener('change', function (e) {
    if (!ativo()) return;
    var input = e.target;
    if (!input || input.tagName !== 'INPUT' || input.type !== 'file') return;
    if (input.__czPronto) { input.__czPronto = false; return; }

    var files = [].slice.call(input.files || []);
    if (!files.length || !files.some(precisaTratar)) return;

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

  // 2) arrastar e soltar
  document.addEventListener('drop', function (e) {
    if (!ativo()) return;
    if (e.__czPronto) return;
    var dtIn = e.dataTransfer;
    if (!dtIn || !dtIn.files || !dtIn.files.length) return;
    var files = [].slice.call(dtIn.files);
    if (!files.some(precisaTratar)) return;

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

  // 3) colar (Ctrl+V)
  document.addEventListener('paste', function (e) {
    if (!ativo()) return;
    if (e.__czPronto) return;
    var cb = e.clipboardData;
    if (!cb || !cb.files || !cb.files.length) return;
    var files = [].slice.call(cb.files);
    if (!files.some(precisaTratar)) return;

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
  window.__cazaMidia.teste = function (file) { return tratar(file); };
  log('carregado na location', locationId());
})();
