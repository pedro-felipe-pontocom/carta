/* =====================================================================
   💌  Carta para Isadora — animações e lógica
   (não precisa mexer aqui — a carta e as configurações ficam no index.html)
   ===================================================================== */
(() => {
  'use strict';

  /* -------------------------------------------------------------------
     Configurações
     ------------------------------------------------------------------- */
  const CFG = Object.assign({
    para: 'Isadora',
    de: '',
    despedida: 'Com todo o meu carinho,',
    data: '',
    introducao: [],
    final: 'Que bom que você existe. ✨',
    romantico: true,
    musica: 'auto',
    letra: 'elegante'
  }, window.CARTA || {});
  CFG.para = String(CFG.para || '').trim() || 'você';

  /* -------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = reduzido ? .3 : 1; // multiplicador de tempo
  const params = new URLSearchParams(location.search);
  const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) { /* ok */ } };

  // textura de papel: granulado gerado uma vez em imagem — só em telas grandes
  // (no celular o grão é quase invisível e pesa na hora de desenhar a abertura)
  (function gerarTextura() {
    if (!matchMedia('(min-width: 700px) and (hover: hover) and (pointer: fine)').matches) return;
    try {
      const n = 128;
      const cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const c = cv.getContext('2d');
      const img = c.createImageData(n, n);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random();
        d[i] = 112; d[i + 1] = 80; d[i + 2] = 50;
        d[i + 3] = v < .5 ? 0 : Math.round((v - .5) * 50);
      }
      c.putImageData(img, 0, 0);
      document.documentElement.style.setProperty('--ruido', 'url(' + cv.toDataURL('image/png') + ') 0 0 / ' + n + 'px ' + n + 'px');
    } catch (_) { /* sem textura, tudo bem */ }
  })();

  const CORACAO = 'M50 86C22 66 5 50 5 30 5 15 16 5 29 5c10 0 17 6 21 14 4-8 11-14 21-14 13 0 24 10 24 25 0 20-17 36-45 56z';
  const ESTRELA = 'M50 4 61.2 34.6 93.8 35.8 68.1 55.9 77 87.2 50 69 23 87.2 31.9 55.9 6.2 35.8 38.8 34.6z';
  const FORMA = CFG.romantico ? CORACAO : ESTRELA;

  /* ===================================================================
     CÉU — estrelas, estrelas cadentes e pétalas caindo
     =================================================================== */
  const ceu = (() => {
    const cv = $('#ceu');
    const c = cv.getContext('2d');
    let W = 0, H = 0, estrelas = [], petalas = [], cadentes = [];
    let alvoPetalas = reduzido ? 0 : 7;
    let ultimo = performance.now(), proxCadente = ultimo + 2500, proxPetala = 0;
    let px = 0, py = 0, mx = 0, my = 0;
    const CORES_EST = ['#ffffff', '#fff4e0', '#e3e8ff', '#ffe1ec'];
    const CORES_PET = ['#ffb3c6', '#ff8fab', '#ffc2d1', '#f9a8c0', '#ffcad4', '#ff9eb5'];

    function medir() {
      const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight;
      if (w === W && h === H) return; // nada mudou (ex: barra do navegador) → não recria
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function criarEstrelas() {
      const n = Math.min(360, Math.round((innerWidth * innerHeight) / 3000));
      estrelas = Array.from({ length: n }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.pow(Math.random(), 2.2) * 1.5 + .3,
        a: rand(.35, 1), v: rand(.4, 2), f: rand(0, 6.28),
        z: rand(.15, 1), cor: pick(CORES_EST)
      }));
    }

    function novaPetala() {
      return {
        x: rand(-20, W + 20), y: rand(-60, -20), s: rand(6, 12),
        vy: rand(.45, 1.1), vx: rand(-.25, .35), bal: rand(.4, 1.3),
        fase: rand(0, 6.28), vf: rand(.012, .025),
        rot: rand(0, 6.28), vr: rand(-.018, .018),
        giro: rand(0, 6.28), vg: rand(.02, .05),
        cor: pick(CORES_PET), a: rand(.5, .85)
      };
    }

    function desenharPetala(p) {
      const s = p.s;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.scale(Math.cos(p.giro), 1);
      c.globalAlpha = p.a;
      c.fillStyle = p.cor;
      c.beginPath();
      c.moveTo(0, s);
      c.bezierCurveTo(-s * 1.1, s * .25, -s * .9, -s * .9, -s * .18, -s * .82);
      c.quadraticCurveTo(0, -s * .6, s * .18, -s * .82);
      c.bezierCurveTo(s * .9, -s * .9, s * 1.1, s * .25, 0, s);
      c.fill();
      c.globalAlpha = p.a * .35;
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(-s * .25, -s * .2, s * .18, s * .45, -.4, 0, 6.283);
      c.fill();
      c.restore();
    }

    function quadro(t) {
      const dt = clamp((t - ultimo) / 16.67, 0, 3);
      ultimo = t;
      c.clearRect(0, 0, W, H);
      px += (mx - px) * .04;
      py += (my - py) * .04;
      const sy = window.scrollY || 0;

      // estrelas
      for (const e of estrelas) {
        const b = .5 + .5 * Math.sin(t * .001 * e.v + e.f);
        const x = e.x * W + px * e.z * 22;
        let y = (e.y * H - sy * e.z * .12 + py * e.z * 22) % H;
        if (y < 0) y += H;
        c.globalAlpha = e.a * (.35 + .65 * b);
        c.fillStyle = e.cor;
        c.beginPath();
        c.arc(x, y, e.r, 0, 6.283);
        c.fill();
        if (e.r > 1.35) {
          c.globalAlpha *= .45;
          const l = e.r * 3.2 * b;
          c.fillRect(x - l, y - .35, l * 2, .7);
          c.fillRect(x - .35, y - l, .7, l * 2);
        }
      }

      // estrelas cadentes
      if (!reduzido && t > proxCadente) {
        const dir = Math.random() < .5 ? -1 : 1;
        cadentes.push({ x: rand(.15, .85) * W, y: rand(0, .35) * H, vx: rand(8, 12) * dir, vy: rand(3, 5.5), vida: 1 });
        proxCadente = t + rand(4000, 10000);
      }
      for (let i = cadentes.length - 1; i >= 0; i--) {
        const s = cadentes[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vida -= .014 * dt;
        if (s.vida <= 0) { cadentes.splice(i, 1); continue; }
        const tx = s.x - s.vx * 12, ty = s.y - s.vy * 12;
        const g = c.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${s.vida})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 1;
        c.strokeStyle = g; c.lineWidth = 1.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(tx, ty); c.stroke();
        c.fillStyle = `rgba(255,250,240,${s.vida})`;
        c.beginPath(); c.arc(s.x, s.y, 1.6, 0, 6.283); c.fill();
      }

      // pétalas
      if (petalas.length < alvoPetalas && t > proxPetala) {
        petalas.push(novaPetala());
        proxPetala = t + rand(180, 600);
      }
      for (let i = petalas.length - 1; i >= 0; i--) {
        const p = petalas[i];
        p.fase += p.vf * dt; p.giro += p.vg * dt; p.rot += p.vr * dt;
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(p.fase) * p.bal) * dt;
        if (p.y > H + 30 || p.x < -60 || p.x > W + 60) {
          if (petalas.length > alvoPetalas) petalas.splice(i, 1);
          else Object.assign(p, novaPetala());
          continue;
        }
        desenharPetala(p);
      }

      requestAnimationFrame(quadro);
    }

    return {
      iniciar() {
        medir();
        criarEstrelas();
        addEventListener('resize', medir);
        requestAnimationFrame(t => { ultimo = t; quadro(t); });
      },
      petalas(n) { alvoPetalas = reduzido ? 0 : n; },
      mover(x, y) { mx = x; my = y; }
    };
  })();

  /* ===================================================================
     EFEITOS — explosões de corações, brilhos, chuva, rastro do mouse
     =================================================================== */
  const fx = (() => {
    const cv = $('#fx');
    const c = cv.getContext('2d');
    let W = 0, H = 0, parts = [], rodando = false, ultimo = 0, chuvaAte = 0, chuvaRapida = false;
    const CORES = CFG.romantico
      ? ['#ff4d6d', '#ff758f', '#ff8fab', '#ffb3c1', '#ffccd5', '#ffd6a5', '#fff0f3']
      : ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#ffc6ff', '#fffffc'];
    const CORES_BRILHO = ['#fff6d5', '#ffe08a', '#ffd1dc', '#ffffff'];
    const formaPadrao = () => CFG.romantico
      ? (Math.random() < .7 ? 'coracao' : 'brilho')
      : (Math.random() < .6 ? 'estrela' : 'brilho');

    function medir() {
      const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight;
      if (w === W && h === H) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ligar() {
      if (rodando) return;
      rodando = true;
      ultimo = performance.now();
      requestAnimationFrame(loop);
    }

    function add(p) {
      if (parts.length > 700) parts.shift();
      parts.push(p);
      ligar();
    }

    function particula(x, y, o) {
      return Object.assign({
        x, y, vx: 0, vy: 0, g: .12, atrito: .97, s: 10,
        rot: rand(-.5, .5), vr: rand(-.08, .08),
        vida: 1, dec: rand(.008, .014),
        cor: pick(CORES), forma: formaPadrao(), bal: 0, fx: rand(0, 6.28)
      }, o);
    }

    function explosao(x, y, o = {}) {
      if (reduzido) return;
      const n = o.n ?? 40;
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const v = rand(o.vmin ?? 2, o.vmax ?? 9);
        const forma = o.forma || formaPadrao();
        add(particula(x, y, {
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v - (o.sobe ?? 2),
          g: o.g ?? .14,
          s: rand(o.smin ?? 7, o.smax ?? 15),
          forma,
          cor: forma === 'brilho' ? pick(CORES_BRILHO) : pick(CORES)
        }));
      }
    }

    function anel(x, y) {
      if (reduzido) return;
      add(particula(x, y, { forma: 'anel', g: 0, s: 8, dec: .022, cor: '255,190,210', rot: 0, vr: 0 }));
      add(particula(x, y, { forma: 'anel', g: 0, s: 2, dec: .018, cor: '243,201,139', rot: 0, vr: 0 }));
    }

    function faiscas(x, y, n = 5) {
      if (reduzido) return;
      for (let i = 0; i < n; i++) {
        add(particula(x, y, {
          vx: rand(-2.6, 2.6), vy: rand(-3.2, .4), g: .06,
          s: rand(4, 9), forma: 'brilho', cor: pick(CORES_BRILHO), dec: rand(.022, .04)
        }));
      }
    }

    function rastro(x, y) {
      add(particula(x + rand(-4, 4), y + rand(-4, 4), {
        vx: rand(-.5, .5), vy: rand(-.8, .2), g: -.01, atrito: .98,
        s: rand(4, 8), forma: 'brilho', cor: pick(CORES_BRILHO), dec: rand(.025, .04)
      }));
    }

    function coracoes(x, y) {
      explosao(x, y, {
        n: 14, vmin: 1.5, vmax: 5.5, sobe: 2.5, g: .08, smin: 10, smax: 20,
        forma: CFG.romantico ? 'coracao' : 'estrela'
      });
      anel(x, y);
    }

    // rapida = corações caem depressa e somem logo (pra não cobrir o texto no celular)
    function chuva(ms, rapida = false) {
      if (reduzido) return;
      chuvaRapida = rapida;
      chuvaAte = Math.max(chuvaAte, performance.now() + ms);
      ligar();
    }

    function desenharForma(p) {
      const s = p.s, k = s / 2;
      switch (p.forma) {
        case 'coracao':
          c.beginPath();
          c.moveTo(0, k * .75);
          c.bezierCurveTo(-k * 1.35, -k * .05, -k * .65, -k * 1.25, 0, -k * .45);
          c.bezierCurveTo(k * .65, -k * 1.25, k * 1.35, -k * .05, 0, k * .75);
          c.fill();
          break;
        case 'brilho':
          c.beginPath();
          c.moveTo(0, -k);
          c.quadraticCurveTo(k * .12, -k * .12, k, 0);
          c.quadraticCurveTo(k * .12, k * .12, 0, k);
          c.quadraticCurveTo(-k * .12, k * .12, -k, 0);
          c.quadraticCurveTo(-k * .12, -k * .12, 0, -k);
          c.fill();
          break;
        case 'estrela':
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? k * .45 : k;
            const a = i * Math.PI / 5 - Math.PI / 2;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          break;
        case 'anel':
          c.beginPath();
          c.arc(0, 0, Math.max(.1, s), 0, 6.283);
          c.lineWidth = 2.5 * p.vida;
          c.strokeStyle = `rgba(${p.cor},${p.vida * .8})`;
          c.stroke();
          break;
      }
    }

    function loop(t) {
      const dt = clamp((t - ultimo) / 16.67, 0, 3);
      ultimo = t;
      c.clearRect(0, 0, W, H);

      if (t < chuvaAte) {
        const n = Math.random() < .55 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          add(particula(rand(0, W), -20, {
            vx: rand(-.6, .6),
            vy: chuvaRapida ? rand(4, 7) : rand(1.5, 3.5),
            g: chuvaRapida ? .07 : .025, atrito: .995,
            s: rand(9, 19), dec: chuvaRapida ? .008 : .0025, bal: rand(.3, .9),
            forma: CFG.romantico ? (Math.random() < .8 ? 'coracao' : 'brilho') : formaPadrao()
          }));
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        const fr = Math.pow(p.atrito, dt);
        p.vx *= fr;
        p.vy = p.vy * fr + p.g * dt;
        p.x += (p.vx + (p.bal ? Math.sin(t * .0025 + p.fx) * p.bal : 0)) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.vida -= p.dec * dt;
        if (p.forma === 'anel') p.s += 5 * dt;
        if (p.vida <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }

        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.globalAlpha = Math.min(1, p.vida * 1.8);
        c.globalCompositeOperation = p.forma === 'brilho' ? 'lighter' : 'source-over';
        c.fillStyle = p.cor;
        desenharForma(p);
        c.restore();
      }

      if (parts.length || t < chuvaAte) requestAnimationFrame(loop);
      else { rodando = false; c.clearRect(0, 0, W, H); }
    }

    return {
      iniciar() { medir(); addEventListener('resize', medir); },
      explosao, anel, faiscas, rastro, coracoes, chuva
    };
  })();

  /* ===================================================================
     MÚSICA — caixinha de música gerada no navegador (ou um .mp3)
     =================================================================== */
  const musica = (() => {
    const btn = $('#btnMusica');
    const modo = String(CFG.musica || '').trim();
    let ligado = false, pausadoPorAba = false;
    let audio = null, fadeT = null;
    let ctx = null, master = null, bus = null, timer = null, prox = 0, passo = 0;

    // Dó – Sol – Lá menor – Fá, em compasso de valsa
    const ACORDES = [
      [48, 55, 60, 64, 60, 55],
      [43, 50, 55, 59, 55, 50],
      [45, 52, 57, 60, 57, 52],
      [41, 48, 53, 57, 53, 48]
    ];
    const MELODIA = [
      [76, 0, 0, 79, 0, 77],
      [74, 0, 0, 71, 0, 0],
      [72, 0, 76, 0, 79, 0],
      [77, 0, 0, 76, 0, 74],
      [76, 0, 0, 79, 0, 84],
      [83, 0, 0, 79, 0, 0],
      [81, 0, 79, 0, 76, 0],
      [77, 0, 74, 0, 72, 0]
    ];
    const PASSO = .32;

    function atualizarBotao() {
      btn.classList.toggle('tocando', ligado);
      const rotulo = ligado ? 'Pausar música' : 'Tocar música';
      btn.setAttribute('aria-label', rotulo);
      btn.title = rotulo;
    }

    function mostrar() {
      if (!modo) return;
      btn.hidden = false;
      atualizarBotao();
      requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('mostrar')));
    }

    /* --- caixinha de música (Web Audio) --- */
    // eco (reverb): ruído com decaimento exponencial — calculado por multiplicação, bem leve
    function impulso(dur) {
      const len = Math.floor(ctx.sampleRate * dur);
      const b = ctx.createBuffer(2, len, ctx.sampleRate);
      const k = Math.pow(.001, 1 / len);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let g = 1;
        for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * g; g *= k; }
      }
      return b;
    }

    function montar() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* ok */ }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3; comp.knee.value = 20;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 5200;
      const rev = ctx.createConvolver();
      // o eco é calculado logo depois do toque, pra não pesar no momento em que o selo quebra
      setTimeout(() => { try { rev.buffer = impulso(2.6); } catch (_) { /* ok */ } }, 150);
      const wet = ctx.createGain(); wet.gain.value = .55;
      const dry = ctx.createGain(); dry.gain.value = .8;
      bus = ctx.createGain();
      bus.connect(dry); bus.connect(rev); rev.connect(wet);
      dry.connect(lp); wet.connect(lp);
      lp.connect(master); master.connect(comp); comp.connect(ctx.destination);
      return true;
    }

    function nota(midi, t, vel, dur, pan) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const saida = ctx.createGain();
      saida.gain.value = vel;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        saida.connect(p); p.connect(bus);
      } else {
        saida.connect(bus);
      }
      // parciais de um "dente" de caixinha de música
      [[1, 1, dur], [2, .35, dur * .5], [3, .12, dur * .25], [5.4, .08, .15]].forEach(([mult, amp, d]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + .004);
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(saida);
        o.start(t); o.stop(t + d + .05);
      });
    }

    function agendar() {
      const agora = ctx.currentTime;
      if (prox < agora) prox = agora + .06;
      while (prox < agora + .25) {
        const compasso = Math.floor(passo / 6), tempo = passo % 6;
        const acorde = ACORDES[compasso % 4];
        const h = (Math.random() - .5) * .012;
        nota(acorde[tempo], prox + .01 + h, tempo === 0 ? .075 : .045, tempo === 0 ? 3.2 : 2.2, rand(-.3, -.05));
        const m = MELODIA[compasso % 8][tempo];
        if (m) {
          nota(m, prox + .01, .1, 3.2, rand(.05, .25));
          if (Math.floor(compasso / 8) % 2 === 1) nota(m + 12, prox + .02, .025, 2, .3);
        }
        prox += PASSO;
        passo++;
      }
    }

    function ligarCaixinha() {
      if (!ctx && !montar()) { ligado = false; btn.hidden = true; return; }
      if (ctx.state !== 'running') ctx.resume();
      const n = ctx.currentTime;
      master.gain.cancelScheduledValues(n);
      master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(.95, n + 2.5);
      prox = n + .12;
      clearInterval(timer);
      timer = setInterval(agendar, 60);
      agendar();
    }

    function desligarCaixinha() {
      if (!ctx) return;
      const n = ctx.currentTime;
      master.gain.cancelScheduledValues(n);
      master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(0, n + .6);
      clearInterval(timer);
      timer = null;
      setTimeout(() => { if (!timer && ctx.state === 'running') ctx.suspend(); }, 800);
    }

    /* --- arquivo de música (.mp3) --- */
    function fadeVolume(alvo, depois) {
      clearInterval(fadeT);
      let passos = 0;
      fadeT = setInterval(() => {
        passos++;
        const v = audio.volume;
        const novo = alvo > v ? Math.min(alvo, v + .04) : Math.max(alvo, v - .06);
        try { audio.volume = novo; } catch (_) { /* iOS não deixa */ }
        if (Math.abs(audio.volume - alvo) < .01 || passos > 40) {
          clearInterval(fadeT);
          if (depois) depois();
        }
      }, 60);
    }

    function ligarArquivo() {
      if (!audio) {
        audio = new Audio(modo);
        audio.loop = true;
        audio.preload = 'auto';
        audio.addEventListener('error', () => { ligado = false; btn.hidden = true; });
      }
      try { audio.volume = 0; } catch (_) { /* ok */ }
      const p = audio.play();
      if (p && p.catch) p.catch(() => { ligado = false; atualizarBotao(); });
      fadeVolume(.85);
    }

    function desligarArquivo() {
      if (audio) fadeVolume(0, () => audio.pause());
    }

    function ligar() {
      ligado = true;
      if (modo === 'auto') ligarCaixinha(); else ligarArquivo();
      atualizarBotao();
    }

    function desligar() {
      ligado = false;
      if (modo === 'auto') desligarCaixinha(); else desligarArquivo();
      atualizarBotao();
    }

    btn.addEventListener('click', () => (ligado ? desligar() : ligar()));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && ligado) { pausadoPorAba = true; desligar(); }
      else if (!document.hidden && pausadoPorAba) { pausadoPorAba = false; ligar(); }
    });

    return {
      iniciar() { if (!modo) return; mostrar(); ligar(); },
      preparar() { mostrar(); }
    };
  })();

  /* ===================================================================
     TEXTO — transforma o texto do WhatsApp em HTML
     =================================================================== */
  const PREFIXOS_WHATSAPP = [
    // [14:32, 09/11/2026] Nome: mensagem   |   [09/11/2026, 14:32] Nome: mensagem
    /^\[(?=[^\]]*\d{1,2}:\d{2})[^\]]{4,40}\]\s*[^:\n]{1,60}:\s?/,
    // 09/11/2026 14:32 - Nome: mensagem (arquivo exportado)
    /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?\s?[Mm]\.?)?\s+[-–]\s+[^:\n]{1,60}:\s?/
  ];

  function limparTexto(bruto) {
    let t = String(bruto || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[‎‏﻿]/g, '')
      .replace(/<\s*(?:esta mensagem foi editada|mensagem editada|this message was edited)\s*>/gi, '');
    t = t.split('\n').map(l => {
      let s = l.trim();
      for (const re of PREFIXOS_WHATSAPP) s = s.replace(re, '');
      return s.trim();
    }).join('\n');
    return t.replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
  }

  function marcar(s, m, tag) {
    try {
      const re = new RegExp('(^|[^\\p{L}\\p{N}])' + m + '(?=\\S)([^' + m + '\\n]*?\\S)' + m + '(?![\\p{L}\\p{N}])', 'gu');
      return s.replace(re, (_, a, b) => a + '<' + tag + '>' + b + '</' + tag + '>');
    } catch (_) {
      return s;
    }
  }

  function formatarLinha(linha) {
    let s = linha.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const guardados = [];
    const guardar = html => '\u0001' + (guardados.push(html) - 1) + '\u0002';
    s = s.replace(/```(.+?)```/g, (_, c) => guardar('<code>' + c + '</code>'));
    s = s.replace(/`([^`]+)`/g, (_, c) => guardar('<code>' + c + '</code>'));
    s = marcar(s, '\\*', 'strong');
    s = marcar(s, '_', 'em');
    s = marcar(s, '~', 's');
    return s.replace(/\u0001(\d+)\u0002/g, (_, i) => guardados[+i]);
  }

  function montarHTML(texto) {
    const temParagrafos = /\n[ \t]*\n/.test(texto);
    const blocos = [];
    let atual = null;
    for (const l of texto.split('\n')) {
      const tipo = !l ? null
        : /^>/.test(l) ? 'cit'
        : /^[-*•]\s+/.test(l) ? 'ul'
        : /^\d{1,3}[.)]\s+/.test(l) ? 'ol'
        : 'p';
      if (!tipo) { atual = null; continue; }
      // sem linhas em branco no texto? então cada linha vira um parágrafo
      if (!atual || atual.tipo !== tipo || (tipo === 'p' && !temParagrafos)) {
        atual = { tipo, linhas: [] };
        blocos.push(atual);
      }
      atual.linhas.push(l);
    }
    return blocos.map(b => {
      if (b.tipo === 'cit') {
        return '<blockquote>' + b.linhas.map(l => formatarLinha(l.replace(/^>\s?/, ''))).join('<br>') + '</blockquote>';
      }
      if (b.tipo === 'ul') {
        return '<ul>' + b.linhas.map(l => '<li>' + formatarLinha(l.replace(/^[-*•]\s+/, '')) + '</li>').join('') + '</ul>';
      }
      if (b.tipo === 'ol') {
        const ini = parseInt(b.linhas[0], 10) || 1;
        return '<ol start="' + ini + '">' + b.linhas.map(l => '<li>' + formatarLinha(l.replace(/^\d{1,3}[.)]\s+/, '')) + '</li>').join('') + '</ol>';
      }
      return '<p>' + b.linhas.map(formatarLinha).join('<br>') + '</p>';
    }).join('\n');
  }

  function aplicarCapitular(raiz) {
    const p = raiz.firstElementChild;
    if (!p || p.tagName !== 'P' || p.textContent.trim().length < 140) return;
    const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let no = tw.nextNode();
    while (no && !no.nodeValue.trim()) no = tw.nextNode();
    if (!no) return;
    const idx = no.nodeValue.search(/\S/);
    const letra = no.nodeValue.charAt(idx);
    let ehLetra = false;
    try { ehLetra = /\p{L}/u.test(letra); } catch (_) { ehLetra = /[A-Za-zÀ-ÿ]/.test(letra); }
    if (!ehLetra) return;
    const resto = no.splitText(idx);
    resto.nodeValue = resto.nodeValue.slice(1);
    const cap = document.createElement('span');
    cap.className = 'capitular w';
    cap.textContent = letra;
    resto.parentNode.insertBefore(cap, resto);
  }

  function quebrarPalavras(raiz) {
    const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (tw.nextNode()) nos.push(tw.currentNode);
    for (const no of nos) {
      if (no.parentElement && no.parentElement.closest('.capitular')) continue;
      if (!no.nodeValue) continue;
      const frag = document.createDocumentFragment();
      for (const parte of no.nodeValue.split(/(\s+)/)) {
        if (!parte) continue;
        if (/^\s+$/.test(parte)) {
          frag.appendChild(document.createTextNode(parte));
        } else {
          const sp = document.createElement('span');
          sp.className = 'w';
          sp.textContent = parte;
          frag.appendChild(sp);
        }
      }
      no.parentNode.replaceChild(frag, no);
    }
    return $$('.w', raiz);
  }

  function svgOrnamento() {
    return '<svg viewBox="0 0 240 28" aria-hidden="true">' +
      '<circle class="o-ponto" cx="10" cy="14" r="1.7"/>' +
      '<path d="M20 14C48 14 76 10.5 102 14" pathLength="1"/>' +
      '<path d="M220 14C192 14 164 10.5 138 14" pathLength="1"/>' +
      '<g transform="translate(110.5 4.5) scale(.19)"><path class="o-centro" d="' + FORMA + '" pathLength="1" vector-effect="non-scaling-stroke"/></g>' +
      '<circle class="o-ponto" cx="230" cy="14" r="1.7"/>' +
      '</svg>';
  }

  let palavras = [];

  function prepararCarta() {
    document.documentElement.classList.toggle('letra-manuscrita', /manus/i.test(CFG.letra));
    document.title = 'Para ' + CFG.para + ' 💌';

    $$('[data-nome]').forEach(el => { el.textContent = CFG.para; });
    const inicial = (CFG.para.charAt(0) || '♥').toUpperCase();
    $$('[data-inicial]').forEach(el => { el.textContent = inicial; });
    $$('[data-ornamento]').forEach(el => { el.innerHTML = svgOrnamento(); });

    const dataEl = $('#data');
    if (CFG.data) dataEl.textContent = CFG.data; else dataEl.remove();

    // texto
    const conteudo = $('#conteudo');
    const limpo = limparTexto(($('#texto-da-carta') || {}).textContent);
    conteudo.innerHTML = limpo
      ? montarHTML(limpo)
      : '<p><em>(A carta ainda está vazia — cole o texto no arquivo index.html.)</em></p>';
    aplicarCapitular(conteudo);
    palavras = quebrarPalavras(conteudo);

    // assinatura
    const despedida = $('#despedida');
    if (CFG.despedida) despedida.textContent = CFG.despedida; else despedida.remove();
    const nomeAss = $('#nomeAss');
    if (CFG.de) {
      nomeAss.textContent = CFG.de;
      nomeAss.classList.add('escrita');
    } else {
      nomeAss.innerHTML = '<svg class="marca" viewBox="0 0 100 92" aria-hidden="true"><path d="' + FORMA + '" pathLength="1"/></svg>';
    }

    // final
    $('#coracaoFinal svg').innerHTML =
      '<defs><linearGradient id="gradFinal" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffb3c6"/><stop offset=".55" stop-color="#ff6b8b"/><stop offset="1" stop-color="#c9184a"/>' +
      '</linearGradient></defs>' +
      '<path class="preench" fill="url(#gradFinal)" d="' + FORMA + '"/>' +
      '<path class="contorno" d="' + FORMA + '" pathLength="1"/>';
    const msgFinal = $('#msgFinal');
    if (CFG.final) { msgFinal.textContent = CFG.final; quebrarPalavras(msgFinal); }
    else msgFinal.remove();
    if (!CFG.romantico) $('.toque-dica').textContent = 'toque na estrela';
  }

  function revelarPalavras() {
    if (reduzido || !('IntersectionObserver' in window)) {
      palavras.forEach(w => w.classList.add('on'));
      return;
    }
    const io = new IntersectionObserver(entradas => {
      const visiveis = entradas.filter(e => e.isIntersecting).map(e => e.target);
      if (!visiveis.length) return;
      const passo = Math.min(28, 1100 / visiveis.length);
      visiveis.forEach((w, i) => {
        w.style.animationDelay = Math.round(i * passo) + 'ms';
        w.classList.add('on');
        io.unobserve(w);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    palavras.forEach(w => io.observe(w));
  }

  /* ===================================================================
     FLUXO — abertura, envelope, carta e final
     =================================================================== */
  const intro = $('#intro');
  const envelope = $('#envelope');
  const selo = $('#selo');
  const tilt = $('#tilt');
  const carta = $('#carta');
  const frase = $('#frase');
  const btnPular = $('#pular');
  const rolar = $('#rolar');
  const barra = $('#barra');

  let estado = 'frases'; // frases → cena → pronto → abrindo → carta
  let jaRolou = false;

  let pulou = false, resolverPulo;
  const pulo = new Promise(r => { resolverPulo = r; });
  const esperar = ms => Promise.race([sleep(ms), pulo]);
  btnPular.addEventListener('click', () => { pulou = true; resolverPulo(); });

  async function rodarIntro() {
    try { await Promise.race([document.fonts && document.fonts.ready, sleep(1800)]); } catch (_) { /* ok */ }
    const frases = reduzido ? [] : (CFG.introducao || []).map(String).filter(f => f.trim());
    if (frases.length) {
      btnPular.hidden = false;
      await esperar(600);
      for (const f of frases) {
        if (pulou) break;
        frase.textContent = f;
        frase.className = 'frase entra';
        await esperar(1500 + f.length * 40);
        frase.className = 'frase sai';
        await esperar(pulou ? 450 : 800);
      }
    }
    if (pulou && frase.classList.contains('entra')) { frase.className = 'frase sai'; await sleep(450); }
    frase.className = 'frase';
    frase.textContent = '';
    btnPular.hidden = true;
    mostrarCena();
  }

  function mostrarCena() {
    estado = 'cena';
    intro.classList.add('cena-on');
    setTimeout(() => $('.titulo-intro .nome').classList.add('on'), 450 * T);
    setTimeout(() => {
      const r = envelope.getBoundingClientRect();
      fx.faiscas(r.left + r.width * .18, r.bottom, 6);
      fx.faiscas(r.right - r.width * .18, r.bottom, 6);
      estado = 'pronto';
    }, reduzido ? 300 : 2150);
  }

  async function abrir() {
    if (estado !== 'pronto') return;
    estado = 'abrindo';
    musica.iniciar(); // precisa ser chamado direto no toque (regra dos navegadores)
    vibrar([12, 40, 18]);
    tilt.style.transform = '';
    $('.dica').classList.add('some');

    const sr = selo.getBoundingClientRect();
    selo.classList.add('quebrado');
    await sleep(220 * T);
    fx.explosao(sr.left + sr.width / 2, sr.top + sr.height / 2, {
      n: 24, vmin: 1.5, vmax: 6, forma: 'brilho', smin: 5, smax: 11, g: .08
    });
    await sleep(320 * T);
    envelope.classList.add('aberto');
    await sleep(780 * T);
    envelope.classList.add('carta-sobe');
    await sleep(1150 * T);

    const pr = $('.env-papel').getBoundingClientRect();
    const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
    intro.style.transformOrigin = cx + 'px ' + cy + 'px';
    intro.classList.add('saindo');
    fx.explosao(cx, cy, { n: 70, vmin: 3, vmax: 13, sobe: 3 });
    fx.anel(cx, cy);
    mostrarCarta();
    await sleep(1500 * T);
    intro.hidden = true;
  }

  function mostrarCarta() {
    estado = 'carta';
    document.body.classList.remove('fase-intro');
    document.body.classList.add('fase-carta');
    carta.hidden = false;
    window.scrollTo(0, 0);
    ceu.petalas(innerWidth < 640 ? 12 : 22);

    setTimeout(() => $('.cabecalho .ornamento').classList.add('revelado'), 600 * T);
    setTimeout(() => $('.sobrescrito').classList.add('on'), 750 * T);
    setTimeout(() => $('.destinataria').classList.add('on'), 950 * T);
    setTimeout(() => { const d = $('#data'); if (d) d.classList.add('on'); }, 1700 * T);
    setTimeout(revelarPalavras, 1900 * T);
    setTimeout(() => fx.chuva(innerWidth < 700 ? 900 : 1500, true), 300 * T);
    setTimeout(() => {
      if (!jaRolou && document.documentElement.scrollHeight > innerHeight * 1.3) rolar.classList.add('mostrar');
    }, 4500 * T);

    observarResto();
    atualizarProgresso();
  }

  function observarResto() {
    const alvos = [$('#assinatura'), $('.ornamento-base'), $('#final')].filter(Boolean);
    if (!('IntersectionObserver' in window)) {
      alvos.forEach(el => el.classList.add('revelado'));
      return;
    }
    const io = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('revelado');
        if (el.id === 'assinatura') setTimeout(() => $('#nomeAss').classList.add('on'), 700 * T);
        if (el.id === 'final') chegouNoFinal();
      }
    }, { threshold: .25 });
    alvos.forEach(el => io.observe(el));
  }

  function chegouNoFinal() {
    setTimeout(() => {
      const r = $('#coracaoFinal').getBoundingClientRect();
      fx.faiscas(r.left + r.width / 2, r.top + r.height / 2, 14);
    }, 2300 * T);
    setTimeout(() => $('#final').classList.add('pronto'), 2600 * T);
  }

  function atualizarProgresso() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    barra.style.transform = 'scaleX(' + p + ')';
    if (scrollY > 50 && !jaRolou) {
      jaRolou = true;
      rolar.classList.remove('mostrar');
    }
  }

  /* --- eventos --- */
  envelope.addEventListener('click', abrir);

  addEventListener('keydown', e => {
    if (estado === 'pronto' && (e.key === 'Enter' || e.key === ' ') && e.target === document.body) {
      e.preventDefault();
      abrir();
    }
  });

  let agendadoRolar = false;
  addEventListener('scroll', () => {
    if (agendadoRolar || estado !== 'carta') return;
    agendadoRolar = true;
    requestAnimationFrame(() => { agendadoRolar = false; atualizarProgresso(); });
  }, { passive: true });

  // mouse: paralaxe do céu, envelope inclinando e rastro de brilhos
  let ultimoRastro = 0, rx = 0, ry = 0;
  addEventListener('pointermove', e => {
    const nx = (e.clientX / innerWidth - .5) * 2;
    const ny = (e.clientY / innerHeight - .5) * 2;
    ceu.mover(nx, ny);
    if (e.pointerType !== 'mouse') return;
    if (estado === 'cena' || estado === 'pronto') {
      tilt.style.transform = 'rotateY(' + (nx * 12).toFixed(2) + 'deg) rotateX(' + (-ny * 9).toFixed(2) + 'deg)';
    }
    if (!reduzido) {
      const agora = performance.now();
      if (agora - ultimoRastro > 28 && Math.hypot(e.clientX - rx, e.clientY - ry) > 5) {
        ultimoRastro = agora; rx = e.clientX; ry = e.clientY;
        fx.rastro(e.clientX, e.clientY);
      }
    }
  }, { passive: true });

  // celular: inclinar o aparelho mexe o céu e o envelope
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || e.beta == null) return;
    const nx = clamp(e.gamma / 35, -1, 1);
    const ny = clamp((e.beta - 45) / 35, -1, 1);
    ceu.mover(nx, ny);
    if (estado === 'cena' || estado === 'pronto') {
      tilt.style.transform = 'rotateY(' + (nx * 10).toFixed(2) + 'deg) rotateX(' + (-ny * 7).toFixed(2) + 'deg)';
    }
  });

  // toque duplo (ou duplo clique) solta corações; toque simples solta brilhinhos
  let ultimoToque = 0, tx = 0, ty = 0;
  addEventListener('pointerup', e => {
    if (estado !== 'carta' || reduzido) return;
    if (e.target.closest && e.target.closest('button, a')) return;
    const agora = performance.now();
    if (agora - ultimoToque < 330 && Math.hypot(e.clientX - tx, e.clientY - ty) < 40) {
      fx.coracoes(e.clientX, e.clientY);
      vibrar(12);
      ultimoToque = 0;
    } else {
      ultimoToque = agora; tx = e.clientX; ty = e.clientY;
      if (e.pointerType !== 'mouse') fx.faiscas(e.clientX, e.clientY, 4);
    }
  });

  // coração do final
  const coracaoFinal = $('#coracaoFinal');
  let pulsoT = null;
  coracaoFinal.addEventListener('click', () => {
    const fim = $('#final');
    const r = coracaoFinal.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    fx.explosao(x, y, { n: 70, vmin: 3, vmax: 13, sobe: 3 });
    fx.anel(x, y);
    vibrar([18, 50, 18]);
    coracaoFinal.classList.remove('pulso');
    void coracaoFinal.offsetWidth;
    coracaoFinal.classList.add('pulso');
    clearTimeout(pulsoT);
    pulsoT = setTimeout(() => coracaoFinal.classList.remove('pulso'), 600);
    if (!fim.classList.contains('tocado')) {
      fim.classList.add('revelado', 'pronto', 'tocado');
      const msg = $('#msgFinal');
      if (msg) $$('.w', msg).forEach((w, i) => setTimeout(() => w.classList.add('on'), (250 + i * 150) * T));
      setTimeout(() => fx.chuva(3200), 400);
    }
  });

  $('#btnTopo').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' }));
  $('#btnReabrir').addEventListener('click', () => { location.href = location.pathname; });

  /* --- começar --- */
  prepararCarta();
  carta.hidden = false; // monta a carta (invisível) já durante a abertura
  ceu.iniciar();
  fx.iniciar();

  if (params.has('carta') || location.hash === '#carta') {
    // atalho pra ver a carta direto (útil enquanto você edita): index.html?carta
    intro.hidden = true;
    mostrarCarta();
    musica.preparar();
  } else {
    rodarIntro();
  }
})();
