/* Rafał Rzeźnik – Trener Boksu Lublin
   Mockup: rezerwacja działa wyłącznie w przeglądarce (localStorage). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: wejście plakatu ---------- */
  const hero = $('.hero');
  $$('.hero__first span').forEach((s, i) => s.style.setProperty('--i', i));
  $$('.hero__last span').forEach((s, i) => s.style.setProperty('--i', i));
  // głębia: scroll i ruch myszy przesuwają portret i nazwisko z różną prędkością
  if (!reduce) {
    const fig = $('.hero__fig'), last = $('.hero__last');
    let mx = 0, my = 0, sy = 0, raf = 0;
    const figBase = () => getComputedStyle(fig).getPropertyValue('--fx') || '';
    const apply = () => {
      raf = 0;
      const h = hero.offsetHeight, p = Math.min(sy / h, 1);
      fig.style.translate = `${mx * 10}px ${p * -60 + my * 6}px`;
      last.style.translate = `${mx * -18}px 0`;
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(apply); };
    addEventListener('scroll', () => { sy = scrollY; if (sy < hero.offsetHeight * 1.2) req(); }, { passive: true });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) hero.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); });
    setTimeout(() => hero.classList.add('is-hit'), 1150);
  }
  const heroReady = () => {
    hero.classList.add('is-ready');
    $$('[data-paste]', hero).forEach((el, i) => setTimeout(() => el.classList.add('is-in'), reduce ? 0 : 380 + i * 140));
  };
  const cut = $('.hero__cut');
  Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), cut.decode ? cut.decode().catch(() => {}) : Promise.resolve()]),
    new Promise(r => setTimeout(r, 1400))
  ]).then(heroReady);

  /* ---------- Belki poza hero ---------- */
  const pasteIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); pasteIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-paste]').filter(el => !hero.contains(el)).forEach(el => pasteIO.observe(el));

  /* ---------- Nawigacja + dok ---------- */
  const nav = $('[data-nav]'), dock = $('[data-dock]'), bookingSec = $('#rezerwacja');
  let bookingVisible = false;
  new IntersectionObserver(([e]) => { bookingVisible = e.isIntersecting; onScroll(); }, { threshold: 0, rootMargin: '0px 0px -10% 0px' }).observe(bookingSec);
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 24);
    dock.classList.toggle('is-shown', y > hero.offsetHeight * 0.75 && !bookingVisible);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const links = $$('.nav__links a');
  const secIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); if (s) secIO.observe(s); });

  /* ---------- Rundy: interaktywne wideo ---------- */
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  $$('[data-round]').forEach(box => {
    const v = $('video', box), btn = $('.round__play', box), bar = $('[data-bar]', box), clock = $('[data-clock]', box);
    let userPaused = false;
    const load = () => { if (!v.src) { v.src = v.dataset.src; v.load(); } };
    const play = () => { load(); v.play().then(() => { box.classList.add('is-playing'); btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Odtwórz', 'Zatrzymaj')); }).catch(() => {}); };
    const pause = () => { v.pause(); box.classList.remove('is-playing'); btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Zatrzymaj', 'Odtwórz')); };
    const tick = () => {
      if (v.duration) { bar.style.transform = `scaleX(${v.currentTime / v.duration})`; const s = Math.floor(v.currentTime); clock.textContent = `0:${String(s).padStart(2, '0')}`; }
      if (!v.paused) requestAnimationFrame(tick);
    };
    const total = $('[data-total]', box);
    v.addEventListener('loadedmetadata', () => { total.textContent = `0:${String(Math.round(v.duration)).padStart(2, '0')}`; });
    v.addEventListener('play', () => requestAnimationFrame(tick));
    box.addEventListener('click', () => { if (v.paused) { userPaused = false; play(); } else { userPaused = true; pause(); } });
    if (canHover) {
      box.addEventListener('pointerenter', () => { if (!userPaused) play(); });
      box.addEventListener('pointerleave', () => { userPaused = false; pause(); });
      box.addEventListener('pointerenter', load, { once: true });
    }
    // na dotyku: gra runda, która jest na środku ekranu
    if (!canHover && !reduce) new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= .6 && !userPaused) play(); else if (e.intersectionRatio < .6) { pause(); userPaused = false; }
    }, { threshold: [0, .6, 1] }).observe(box);
    // wczytaj z wyprzedzeniem, gdy sekcja się zbliża
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.preload = 'metadata'; if (!v.src) v.src = v.dataset.src; o.disconnect(); } }, { rootMargin: '400px' }).observe(box);
  });

  // karuzela rund na telefonie: przełącznik R1–R4 i śledzenie aktywnej rundy
  const rList = $('[data-rounds-list]'), rNav = $$('[data-rounds-nav] button');
  if (rList && rNav.length) {
    const items = $$('.round', rList);
    rNav.forEach(b => b.addEventListener('click', () => {
      const it = items[+b.dataset.go]; rList.scrollTo({ left: it.offsetLeft - rList.offsetLeft - parseFloat(getComputedStyle(rList).paddingLeft), behavior: reduce ? 'auto' : 'smooth' });
    }));
    const mark = () => {
      const x = rList.scrollLeft; let best = 0, d = 1e9;
      items.forEach((it, i) => { const dd = Math.abs(it.offsetLeft - rList.offsetLeft - parseFloat(getComputedStyle(rList).paddingLeft) - x); if (dd < d) { d = dd; best = i; } });
      rNav.forEach((b, i) => { b.classList.toggle('is-on', i === best); b.setAttribute('aria-current', i === best ? 'true' : 'false'); });
    };
    rList.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  }

  $('[data-year]').textContent = new Date().getFullYear();

  /* =========================================================
     REZERWACJA (UI flow, dane tylko lokalnie)
     ========================================================= */
  const TYPES = [
    { id: 'single', name: 'Pojedynczy trening', meta: 'Trening personalny 1:1', count: 1, dur: 60, price: 220 },
    { id: 'k4', name: 'Karnet 4 treningów', meta: '175 zł za trening · ważny miesiąc', count: 4, dur: 60, price: 700 },
    { id: 'k8', name: 'Karnet 8 treningów', meta: '150 zł za trening · ważny miesiąc', count: 8, dur: 60, price: 1200 },
    { id: 'k12', name: 'Karnet 12 treningów', meta: '130 zł za trening · ważny miesiąc', count: 12, dur: 60, price: 1560 }
  ];
  const SLOTS = ['06:30', '07:30', '08:30', '09:30', '10:30', '11:30', '12:30', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const STORE = 'rr-rezerwacje';
  const fmtPrice = n => n.toLocaleString('pl-PL') + ' zł';
  const pad2 = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtLong = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
  const save = list => { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch {} };

  // Deterministyczne „zajęte” terminy, żeby kalendarz wyglądał jak żywy grafik.
  const hash = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  function takenSlots(dateIso) {
    const mine = load().filter(b => b.date === dateIso).map(b => b.time);
    const busyDay = hash(dateIso + 'day') > 0.9;
    return SLOTS.filter(t => {
      if (mine.includes(t)) return true;
      if (busyDay) return true;
      const evening = parseInt(t) >= 17 || parseInt(t) <= 7;
      return hash(dateIso + t) < (evening ? 0.58 : 0.33);
    });
  }
  function freeSlots(dateIso) {
    const d = fromIso(dateIso), now = new Date(), taken = takenSlots(dateIso);
    return SLOTS.map(t => {
      const [hh, mm] = t.split(':').map(Number);
      const at = new Date(d); at.setHours(hh, mm, 0, 0);
      const past = at - now < 2 * 3600e3;
      return { t, ok: !past && !taken.includes(t) };
    });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60);
  const state = { step: 1, type: 'single', date: null, time: null, view: new Date(today.getFullYear(), today.getMonth(), 1), last: null };

  // pod koniec miesiąca otwórz od razu kolejny, żeby było z czego wybierać
  {
    let open = 0;
    for (let d = new Date(today); d.getMonth() === today.getMonth(); d.setDate(d.getDate() + 1)) if (d.getDay() % 6) open++;
    if (open < 7) state.view = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  const booker = $('[data-booker]'), form = $('[data-form]');
  const stepsEls = $$('[data-step]', booker), tabs = $$('[data-step-tab]', booker);

  /* Krok 1: typy */
  const typesBox = $('[data-types]');
  typesBox.innerHTML = TYPES.map(t => `
    <label class="type">
      <input type="radio" name="type" value="${t.id}" ${t.id === state.type ? 'checked' : ''}>
      <span class="type__radio" aria-hidden="true"></span>
      <span><span class="type__name">${t.name}</span><span class="type__meta">${t.meta}</span></span>
      <span class="type__price">${fmtPrice(t.price)}</span>
    </label>`).join('');
  typesBox.addEventListener('change', e => { state.type = e.target.value; renderSummary(); });

  /* Krok 2: kalendarz */
  const grid = $('[data-cal-grid]'), monthEl = $('[data-cal-month]');
  const prevBtn = $('[data-cal-prev]'), nextBtn = $('[data-cal-next]');
  function dayStatus(d) {
    const wd = d.getDay();
    if (d < today || d > maxDate || wd === 0 || wd === 6) return 'closed';
    const n = freeSlots(iso(d)).filter(s => s.ok).length;
    return n === 0 ? 'none' : n <= 3 ? 'few' : 'free';
  }
  function renderCal() {
    const v = state.view, first = new Date(v.getFullYear(), v.getMonth(), 1);
    const days = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    monthEl.textContent = cap(fmtMonth.format(first));
    prevBtn.disabled = v <= new Date(today.getFullYear(), today.getMonth(), 1);
    nextBtn.disabled = new Date(v.getFullYear(), v.getMonth() + 1, 1) > maxDate;
    let html = '';
    for (let i = 0; i < offset; i++) html += '<span class="day day--pad" aria-hidden="true"></span>';
    for (let n = 1; n <= days; n++) {
      const d = new Date(v.getFullYear(), v.getMonth(), n), id = iso(d), st = dayStatus(d);
      const off = st === 'closed' || st === 'none';
      const label = `${fmtLong.format(d)}${st === 'closed' ? ', nieczynne' : st === 'none' ? ', brak wolnych terminów' : st === 'few' ? ', ostatnie wolne terminy' : ', wolne terminy'}`;
      html += `<button type="button" class="day${+d === +today ? ' is-today' : ''}" data-date="${id}" data-load="${st}" role="gridcell" aria-label="${label}" aria-selected="${state.date === id}" ${off ? 'disabled' : ''} tabindex="-1">${n}</button>`;
    }
    grid.innerHTML = html;
    const focusable = $$('.day:not([disabled])', grid);
    const sel = $('.day[aria-selected="true"]', grid) || focusable[0];
    if (sel) sel.tabIndex = 0;
  }
  grid.addEventListener('click', e => {
    const b = e.target.closest('.day'); if (!b || b.disabled) return;
    state.date = b.dataset.date; state.time = null; setErr(2, '');
    $$('.day', grid).forEach(x => { x.setAttribute('aria-selected', x === b); x.tabIndex = x === b ? 0 : -1; });
    renderSlots(); renderSummary();
  });
  grid.addEventListener('keydown', e => {
    const keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const all = $$('.day:not(.day--pad)', grid), cur = all.indexOf(document.activeElement);
    let i = cur;
    do { i += keys[e.key]; } while (all[i] && all[i].disabled);
    if (all[i]) { all.forEach(x => x.tabIndex = -1); all[i].tabIndex = 0; all[i].focus(); }
  });
  prevBtn.addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCal(); });
  nextBtn.addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCal(); });

  const slotsBox = $('[data-slots]'), slotsDay = $('[data-slots-day]');
  function renderSlots() {
    if (!state.date) { slotsDay.textContent = 'Najpierw wybierz dzień w kalendarzu.'; slotsBox.innerHTML = ''; return; }
    slotsDay.textContent = cap(fmtLong.format(fromIso(state.date)));
    const list = freeSlots(state.date);
    slotsBox.innerHTML = list.some(s => s.ok)
      ? list.map(s => `<button type="button" class="slot" role="option" data-time="${s.t}" aria-selected="${state.time === s.t}" ${s.ok ? '' : 'disabled aria-label="' + s.t + ', zajęte"'}>${s.t}</button>`).join('')
      : '<p class="slots__empty">Ten dzień jest już pełny. Wybierz inny.</p>';
  }
  slotsBox.addEventListener('click', e => {
    const b = e.target.closest('.slot'); if (!b || b.disabled) return;
    state.time = b.dataset.time; setErr(2, '');
    $$('.slot', slotsBox).forEach(x => x.setAttribute('aria-selected', x === b));
    renderSummary();
  });

  /* Podsumowanie */
  function renderSummary() {
    const t = TYPES.find(x => x.id === state.type);
    $('[data-s-type]').textContent = t ? t.name : '—';
    $('[data-s-date]').textContent = state.date ? cap(fmtShort.format(fromIso(state.date))) : '—';
    $('[data-s-time]').textContent = state.time || '—';
    $('[data-s-price]').textContent = t ? fmtPrice(t.price) : '—';
    $('[data-pay-amount]').textContent = t ? (t.count > 1 ? `Płacisz na sali przed pierwszym treningiem · ${fmtPrice(t.price)} za cały karnet` : `Płacisz na sali przed treningiem · ${fmtPrice(t.price)}`) : '—';
    $('[data-s-note]').textContent = t && t.count > 1
      ? `Rezerwujesz pierwszy z ${t.count} treningów; kolejne terminy ustalimy razem. Karnet jest ważny miesiąc. Płatność tylko gotówką na sali, online na razie nie można płacić.`
      : 'Płatność tylko gotówką na sali, online na razie nie można płacić. Odwołanie lub przełożenie do 12 h przed treningiem.';
  }

  /* Walidacja */
  const errBox2 = $('[data-err-2]');
  const setErr = (step, msg) => { if (step === 2) errBox2.textContent = msg; };
  function fieldErr(input, msg) {
    const wrap = input.closest('.field, .consent'); const em = $('.field__err', wrap);
    wrap.classList.toggle('is-invalid', !!msg); em.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  function validate3() {
    const f = form.elements; let ok = true, first = null;
    const check = (el, msg) => { const good = fieldErr(el, msg); if (!good && !first) first = el; ok = ok && good; };
    const name = f.name.value.trim();
    check(f.name, name.length < 3 ? 'Podaj imię i nazwisko.' : '');
    const digits = f.phone.value.replace(/[^\d]/g, '').replace(/^48(?=\d{9}$)/, '');
    check(f.phone, digits.length !== 9 ? 'Podaj 9-cyfrowy numer telefonu, np. 600 700 800.' : '');
    check(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()) ? 'Podaj poprawny adres e-mail, np. jan@poczta.pl.' : '');
    check(f.consent, !f.consent.checked ? 'Zaznacz zgodę, żebym mógł potwierdzić termin.' : '');
    if (first) first.focus();
    return ok;
  }
  ['name', 'phone', 'email'].forEach(n => form.elements[n].addEventListener('blur', e => { if (e.target.value) validate3Field(n); }));
  function validate3Field(n) {
    const el = form.elements[n], v = el.value.trim();
    if (n === 'name') fieldErr(el, v.length < 3 ? 'Podaj imię i nazwisko.' : '');
    if (n === 'phone') fieldErr(el, v.replace(/[^\d]/g, '').replace(/^48(?=\d{9}$)/, '').length !== 9 ? 'Podaj 9-cyfrowy numer telefonu, np. 600 700 800.' : '');
    if (n === 'email') fieldErr(el, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Podaj poprawny adres e-mail, np. jan@poczta.pl.' : '');
  }
  form.elements.consent.addEventListener('change', e => { if (e.target.checked) fieldErr(e.target, ''); });

  /* Kroki */
  function go(step, focus = true) {
    state.step = step;
    stepsEls.forEach(s => s.classList.toggle('is-active', +s.dataset.step === step));
    tabs.forEach(t => {
      const n = +t.dataset.stepTab;
      t.classList.toggle('is-current', n === step);
      t.classList.toggle('is-done', n < step);
      if (n === step) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    document.body.classList.toggle('is-booking', step > 1);
    if (step === 2) { renderCal(); renderSlots(); }
    if (focus) {
      const target = $(`[data-step="${step}"]`, booker);
      const top = booker.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) booker.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      const f = step === 4 ? target : $('input:not([type=hidden]), button', target);
      setTimeout(() => f && f.focus({ preventScroll: true }), 60);
    }
  }
  booker.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) {
      if (state.step === 2 && (!state.date || !state.time)) { setErr(2, !state.date ? 'Wybierz dzień treningu.' : 'Wybierz godzinę treningu.'); return; }
      go(state.step + 1);
    }
    if (e.target.closest('[data-prev]')) go(state.step - 1);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (state.step !== 3 || !validate3()) return;
    const btn = $('[data-submit]'); btn.classList.add('is-loading'); btn.disabled = true;
    $('span', btn).textContent = 'Rezerwuję…';
    setTimeout(() => {
      const t = TYPES.find(x => x.id === state.type), f = form.elements;
      const booking = {
        code: 'RR-' + state.date.slice(5).replace('-', '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
        type: t.id, typeName: t.name, dur: t.dur, price: t.price, date: state.date, time: state.time,
        name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), level: f.level.value, notes: f.notes.value.trim()
      };
      const list = load(); list.push(booking); save(list); state.last = booking;
      btn.classList.remove('is-loading'); btn.disabled = false; $('span', btn).textContent = 'Potwierdź rezerwację';
      renderTicket(booking); go(4);
    }, reduce ? 200 : 1100);
  });

  function renderTicket(b) {
    const first = b.name.split(/\s+/)[0];
    $('[data-t-name]').textContent = first;
    $('[data-t-type]').textContent = b.typeName;
    $('[data-t-date]').textContent = cap(fmtShort.format(fromIso(b.date)));
    $('[data-t-time]').textContent = b.time;
    $('[data-t-code]').textContent = b.code;
    $('[data-t-email]').textContent = b.email;
    $('[data-t-price]').textContent = fmtPrice(b.price);
    const tk = $('[data-ticket]'); tk.style.animation = 'none'; tk.offsetHeight; tk.style.animation = '';
  }

  $('[data-ics]').addEventListener('click', () => {
    const b = state.last; if (!b) return;
    const [hh, mm] = b.time.split(':').map(Number);
    const start = fromIso(b.date); start.setHours(hh, mm);
    const end = new Date(start.getTime() + b.dur * 60e3);
    const f = d => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rafal Rzeznik//Trening boksu//PL', 'BEGIN:VEVENT',
      `UID:${b.code}@rafalrzeznik`, `DTSTAMP:${f(new Date())}`,
      `DTSTART;TZID=Europe/Warsaw:${f(start)}`, `DTEND;TZID=Europe/Warsaw:${f(end)}`,
      `SUMMARY:${b.typeName} – Rafał Rzeźnik`, 'LOCATION:ul. Bolesława Prusa 8C\\, 20-064 Lublin',
      `DESCRIPTION:Nr rezerwacji ${b.code}. Płatność gotówką na miejscu: ${fmtPrice(b.price)}. Zabierz strój sportowy\\, buty na zmianę i wodę.`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Trening boksu za 2 godziny', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `trening-boksu-${b.date}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('[data-cancel]').addEventListener('click', () => {
    const b = state.last; if (!b) return;
    save(load().filter(x => x.code !== b.code));
    state.last = null; state.time = null;
    go(2);
    setErr(2, `Rezerwacja ${b.code} została odwołana. Możesz wybrać nowy termin.`);
  });
  $('[data-again]').addEventListener('click', () => {
    state.date = null; state.time = null; form.elements.notes.value = '';
    renderSummary(); go(1);
  });

  /* Linki „Umów trening” / „Wybierz” z karty walk */
  $$('[data-book]').forEach(a => a.addEventListener('click', () => {
    const t = a.dataset.type;
    if (t) {
      state.type = t;
      const r = $(`input[name="type"][value="${t}"]`, typesBox); if (r) r.checked = true;
      renderSummary();
      if (state.step === 4) state.last = null;
      go(2, false);
    }
  }));

  renderSummary();
})();
