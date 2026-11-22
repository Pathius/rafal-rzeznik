/* Rafał Rzeźnik – Trener Boksu Lublin
   Strona wielostronicowa (tools/build.py); każdy blok uruchamia się tylko, gdy jest na stronie. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Hero: wejście plakatu (tylko strona główna) ---------- */
  const hero = $('.hero');
  if (hero) {
    $$('.hero__first span').forEach((s, i) => s.style.setProperty('--i', i));
    $$('.hero__last span').forEach((s, i) => s.style.setProperty('--i', i));
    // głębia: scroll i ruch myszy przesuwają portret i nazwisko z różną prędkością
    if (!reduce) {
      const fig = $('.hero__fig'), last = $('.hero__last');
      let mx = 0, my = 0, sy = 0, raf = 0;
      const apply = () => {
        raf = 0;
        const p = Math.min(sy / hero.offsetHeight, 1);
        fig.style.translate = `${mx * 10}px ${p * -60 + my * 6}px`;
        last.style.translate = `${mx * -18}px 0`;
      };
      const req = () => { if (!raf) raf = requestAnimationFrame(apply); };
      addEventListener('scroll', () => { sy = scrollY; if (sy < hero.offsetHeight * 1.2) req(); }, { passive: true });
      if (canHover) hero.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); });
    }
    const cut = $('.hero__cut');
    Promise.race([
      Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), cut.decode ? cut.decode().catch(() => {}) : Promise.resolve()]),
      new Promise(r => setTimeout(r, 1400))
    ]).then(() => hero.classList.add('is-ready'));
  }

  /* ---------- Belki ---------- */
  const pasteIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); pasteIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-paste]').forEach(el => pasteIO.observe(el));

  /* ---------- Nawigacja + dok ---------- */
  const nav = $('[data-nav]'), dock = $('[data-dock]'), foot = $('.site-foot');
  const solid = nav.classList.contains('is-solid');
  let footVisible = false;
  // dok chowa się nad stopką, żeby nie zasłaniał linków
  if (dock) new IntersectionObserver(([e]) => { footVisible = e.isIntersecting; onScroll(); }).observe(foot);
  function onScroll() {
    const y = scrollY;
    if (!solid) nav.classList.toggle('is-solid', y > 24);
    if (dock) dock.classList.toggle('is-shown', y > (hero ? hero.offsetHeight * 0.75 : 160) && !footVisible);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // menu na telefonie i tablecie
  const burger = $('[data-burger]'), menu = $('#menu');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    if (open) $('a', menu).focus();
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  matchMedia('(min-width: 1201px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Wideo: wspólna logika (rundy i film z Pawłem) ---------- */
  function videoBox(box, { hoverPlay }) {
    const v = $('video', box), btn = $('.round__play, .reel__play', box), bar = $('[data-bar]', box), clock = $('[data-clock]', box), total = $('[data-total]', box);
    let userPaused = false;
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const load = () => { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); } };
    const label = on => btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(on ? 'Odtwórz' : 'Zatrzymaj', on ? 'Zatrzymaj' : 'Odtwórz'));
    const play = () => { load(); v.play().then(() => { box.classList.add('is-playing'); btn.setAttribute('aria-pressed', 'true'); label(true); }).catch(() => {}); };
    const pause = () => { v.pause(); box.classList.remove('is-playing'); btn.setAttribute('aria-pressed', 'false'); label(false); };
    const tick = () => {
      if (v.duration) { bar.style.transform = `scaleX(${v.currentTime / v.duration})`; if (clock) clock.textContent = fmt(v.currentTime); }
      if (!v.paused) requestAnimationFrame(tick);
    };
    if (total) v.addEventListener('loadedmetadata', () => { total.textContent = fmt(Math.round(v.duration)); });
    v.addEventListener('play', () => requestAnimationFrame(tick));
    box.addEventListener('click', e => {
      if (e.target.closest('.reel__sound')) return;
      if (v.paused) { userPaused = false; play(); } else { userPaused = true; pause(); }
    });
    if (hoverPlay && canHover) {
      box.addEventListener('pointerenter', () => { if (!userPaused) play(); });
      box.addEventListener('pointerleave', () => { userPaused = false; pause(); });
    }
    // bez hovera: gra, gdy jest dobrze widoczne
    if ((!hoverPlay || !canHover) && !reduce) new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= .6 && !userPaused) play(); else if (e.intersectionRatio < .6 && !v.paused) { pause(); userPaused = false; }
    }, { threshold: [0, .6, 1] }).observe(box);
    // wczytaj z wyprzedzeniem, gdy sekcja się zbliża
    // kadr startowy i metadane dopiero, gdy sekcja się zbliża (nie obciążają pierwszego ekranu)
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { if (v.dataset.poster) v.poster = v.dataset.poster; v.preload = 'metadata'; load(); o.disconnect(); } }, { rootMargin: '600px' }).observe(box);
    return { v, play };
  }
  $$('[data-round]').forEach(box => videoBox(box, { hoverPlay: true }));

  const reel = $('[data-reel]');
  if (reel) {
    const { v, play } = videoBox(reel, { hoverPlay: false });
    const snd = $('.reel__sound', reel);
    snd.addEventListener('click', () => {
      v.muted = !v.muted;
      reel.classList.toggle('is-sound', !v.muted);
      snd.setAttribute('aria-pressed', String(!v.muted));
      snd.setAttribute('aria-label', v.muted ? 'Włącz dźwięk' : 'Wycisz');
      if (!v.muted) { if (v.paused) play(); }
    });
  }

  // karuzela rund na telefonie: przełącznik R1–R4 i śledzenie aktywnej rundy
  const rList = $('[data-rounds-list]'), rNav = $$('[data-rounds-nav] [data-go]');
  if (rList && rNav.length) {
    const items = $$('.round', rList);
    const offset = it => it.offsetLeft - rList.offsetLeft - parseFloat(getComputedStyle(rList).paddingLeft);
    rNav.forEach(b => b.addEventListener('click', () => rList.scrollTo({ left: offset(items[+b.dataset.go]), behavior: reduce ? 'auto' : 'smooth' })));
    const mark = () => {
      const x = rList.scrollLeft; let best = 0, d = 1e9;
      items.forEach((it, i) => { const dd = Math.abs(offset(it) - x); if (dd < d) { d = dd; best = i; } });
      rNav.forEach((b, i) => { b.classList.toggle('is-on', i === best); b.setAttribute('aria-current', i === best ? 'true' : 'false'); });
    };
    rList.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    // strzałki: przewiń o jedną rundę
    $$('[data-rounds-step]').forEach(btn => btn.addEventListener('click', () => {
      const cur = rNav.findIndex(b => b.classList.contains('is-on'));
      const next = Math.max(0, Math.min(items.length - 1, cur + +btn.dataset.roundsStep));
      rList.scrollTo({ left: offset(items[next]), behavior: reduce ? 'auto' : 'smooth' });
    }));
  }

  /* ---------- FAQ: płynne rozwijanie i zwijanie ---------- */
  // Animujemy wysokość razem z dolnym paddingiem (inaczej zostaje 19 px „pustki”, która znika skokiem).
  // fill: 'forwards' trzyma stan zwinięty do momentu ustawienia open = false.
  $$('.faq details').forEach(d => {
    const body = $('p', d), ease = 'cubic-bezier(.16, 1, .3, 1)';
    let anim = null;
    const stop = () => { if (anim) { anim.cancel(); anim = null; } };
    $('summary', d).addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      const closing = d.open && !d.classList.contains('is-closing');
      const from = d.open ? body.getBoundingClientRect().height : 0;
      stop();
      if (closing) {
        d.classList.add('is-closing');
        const pad = getComputedStyle(body).paddingBottom;
        anim = body.animate([{ height: from + 'px', paddingBottom: pad, opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }], { duration: 280, easing: ease, fill: 'forwards' });
        anim.onfinish = () => { d.open = false; d.classList.remove('is-closing'); stop(); };
      } else {
        d.classList.remove('is-closing');
        d.open = true;
        const to = body.getBoundingClientRect().height, pad = getComputedStyle(body).paddingBottom;
        anim = body.animate([{ height: from + 'px', paddingBottom: from ? pad : '0px', opacity: from ? 1 : 0 }, { height: to + 'px', paddingBottom: pad, opacity: 1 }], { duration: 380, easing: ease });
        anim.onfinish = stop;
      }
    });
  });

  /* ---------- Przejście między podstronami: seria trzech belek ---------- */
  {
    const root = document.documentElement, curtain = $('.punch');
    const KEY = 'rr-punch';
    const store = v => { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch {} };
    // przyjazd: belki zakrywają (klasa z <head>), zjeżdżają, gdy strona gotowa
    if (root.classList.contains('is-arriving')) {
      store(false);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-out')));
      setTimeout(() => root.classList.remove('is-arriving', 'is-out'), 1000);
    }
    // wyjazd: tylko zwykłe kliknięcia w linki do innych podstron tej witryny
    if (curtain && !reduce) document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname) return;          // ta sama strona / kotwica
      e.preventDefault();
      root.classList.remove('is-arriving', 'is-out');
      root.classList.add('is-leaving');
      store(true);
      setTimeout(() => { location.href = url.href; }, 720);
    });
    // powrót przyciskiem „wstecz” (bfcache): zdejmij zasłonę
    addEventListener('pageshow', e => { if (e.persisted) { root.classList.remove('is-leaving', 'is-arriving', 'is-out'); store(false); } });
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
