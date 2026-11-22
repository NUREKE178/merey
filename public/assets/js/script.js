/* «Мерей» — Қыз ұзату тойы — site controller */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- hero particles ---------------- */
  const particles = $('#particles');
  if (particles && !reduceMotion) {
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--dur', (7 + Math.random() * 7).toFixed(2) + 's');
      s.style.setProperty('--delay', (Math.random() * 5).toFixed(2) + 's');
      s.style.left = (6 + Math.random() * 88).toFixed(1) + '%';
      s.style.bottom = (5 + Math.random() * 75).toFixed(1) + '%';
      const size = (2 + Math.random() * 2.5).toFixed(1);
      s.style.width = s.style.height = size + 'px';
      particles.appendChild(s);
    }
  }

  /* ---------------- reveal on scroll ---------------- */
  const revealTargets = $$('.section-inner > *');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    revealTargets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i, 5) * 0.09).toFixed(2) + 's';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------------- music player & autoplay ---------------- */
  const AUDIO_SRC = 'assets/audio/5588669ada1c6a66638df27bdc4c0666.mp3';
  const audio = new Audio(AUDIO_SRC);
  audio.preload = 'auto';
  audio.volume = 0.85;

  const btnPlay = $('#btnPlay');
  const btnPrev = $('#btnPrev');
  const btnNext = $('#btnNext');
  const progressTrack = $('#progressTrack');
  const progressFill = $('#progressFill');
  const tCur = $('#tCur');
  const tDur = $('#tDur');
  const playerNote = $('#playerNote');

  const dock = $('#musicDock');
  const dockToggle = $('#dockToggle');
  const dockIconUse = $('#dockIconUse');
  const activate = $('#musicActivate');

  const PLAY_ICON = '#ic-play';
  const PAUSE_ICON = '#ic-pause';
  const STORAGE_KEY = 'merey-music-enabled';
  let audioLoadedOk = false;
  let audioErrored = false;

  const fmt = (sec) => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  const setDockVisible = (visible) => {
    if (!dock) return;
    document.body.classList.toggle('music-active', visible);
    if (visible) {
      dock.removeAttribute('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => dock.classList.add('is-visible')));
    } else {
      dock.classList.remove('is-visible');
      dock.setAttribute('hidden', '');
    }
  };

  const setActivateVisible = (visible) => {
    if (!activate) return;
    if (visible) activate.removeAttribute('hidden');
    else activate.setAttribute('hidden', '');
  };

  const setIcons = (playing) => {
    const btnIcon = btnPlay ? btnPlay.querySelector('use') : null;
    if (btnIcon) {
      btnIcon.setAttribute('href', playing ? PAUSE_ICON : PLAY_ICON);
      btnPlay.setAttribute('aria-label', playing ? 'Тоқтату' : 'Ойнату');
    }
    if (dockIconUse) {
      dockIconUse.setAttribute('href', playing ? PAUSE_ICON : PLAY_ICON);
      dockToggle.setAttribute('aria-label', playing ? 'Музыканы тоқтату' : 'Музыканы қосу');
    }
    if (dock) dock.classList.toggle('is-playing', playing);
  };

  const setNote = (text, isError = false) => {
    if (!playerNote) return;
    playerNote.textContent = text;
    playerNote.classList.toggle('is-error', isError);
  };

  const updateProgress = () => {
    const dur = audio.duration;
    if (dur && isFinite(dur)) {
      progressFill.style.width = ((audio.currentTime / dur) * 100) + '%';
      progressTrack.setAttribute('aria-valuenow', Math.round((audio.currentTime / dur) * 100));
      tDur.textContent = fmt(dur);
    } else {
      progressFill.style.width = '0%';
    }
    tCur.textContent = fmt(audio.currentTime);
  };

  const persistPreference = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  };

  const tryPlay = async () => {
    try {
      await audio.play();
      persistPreference();
      setActivateVisible(false);
      setDockVisible(true);
      setIcons(true);
      return true;
    } catch (e) {
      setActivateVisible(true);
      return false;
    }
  };

  audio.addEventListener('loadedmetadata', () => {
    audioLoadedOk = true;
    audioErrored = false;
    setNote('Той үнісі — Алтынай Жорабаева');
    updateProgress();
  });
  audio.addEventListener('error', () => {
    audioLoadedOk = false;
    audioErrored = true;
    setNote('Аудио файл табылмады — файлды қосу қажет', true);
  });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('play', () => {
    setDockVisible(true);
    setIcons(true);
    setActivateVisible(false);
    setNote('Ойнап жатады — Алтынай Жорабаева');
  });
  audio.addEventListener('pause', () => {
    setIcons(false);
    setNote('Ойнату тоқтатылды — Алтынай Жорабаева');
  });
  audio.addEventListener('ended', () => {
    setIcons(false);
    setNote('Той үнісі — Алтынай Жорабаева');
    updateProgress();
  });

  const togglePlay = () => {
    if (audioErrored || !audioLoadedOk) {
      audioErrored = false;
      audio.load();
      setActivateVisible(true);
      setNote('Аудио файл табылмады — файлды қосу қажет', true);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => setActivateVisible(true));
    } else {
      audio.pause();
    }
  };

  btnPlay.addEventListener('click', togglePlay);
  dockToggle.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => setActivateVisible(true)); });
  btnNext.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => setActivateVisible(true)); });
  if (activate) activate.addEventListener('click', () => { tryPlay(); });

  const seekFromEvent = (e) => {
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = ratio * audio.duration;
    }
    updateProgress();
  };
  progressTrack.addEventListener('click', seekFromEvent);
  progressTrack.addEventListener('keydown', (e) => {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const step = audio.duration * 0.05;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { audio.currentTime = Math.min(audio.duration, audio.currentTime + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { audio.currentTime = Math.max(0, audio.currentTime - step); e.preventDefault(); }
    if (e.key === 'Home') { audio.currentTime = 0; e.preventDefault(); }
    if (e.key === 'End') { audio.currentTime = audio.duration; e.preventDefault(); }
  });

  /* ---- autoplay attempt + graceful fallback ----
     Browsers block audio-with-sound autoplay. We try once right away,
     and once more on the very first user interaction. If it fails, an
     elegant activation button is shown — we never claim it started. */
  const preferred = (() => { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; } })();

  const tryAutoplay = async () => {
    try {
      await audio.play();
      persistPreference();
      setActivateVisible(false);
      setDockVisible(true);
      setIcons(true);
    } catch (e) {
      setActivateVisible(true); // honest fallback, not a fake success
    }
  };

  // autoplay attempt on load
  tryAutoplay();

  // retry on the first user interaction anywhere
  window.addEventListener('pointerdown', () => {
    if (audio.paused) tryAutoplay();
  }, { once: true, passive: true });
  window.addEventListener('keydown', () => {
    if (audio.paused) tryAutoplay();
  }, { once: true, passive: true });

  // retry on visibility change only after a prior failure (e.g. unlock after returning to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audio.paused && preferred) tryAutoplay();
  });

  /* ---------------- calendar (December 2026) ---------------- */
  const calGrid = $('#calGrid');
  if (calGrid) {
    const year = 2026, month = 11, eventDay = 12, daysInMonth = 31;
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const blanks = firstDow;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < blanks; i++) {
      const d = document.createElement('div');
      d.className = 'cal-empty';
      d.setAttribute('aria-hidden', 'true');
      frag.appendChild(d);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;
      if (day === eventDay) {
        cell.classList.add('is-event');
        cell.setAttribute('aria-label', '12 желтоқсан — қыз ұзату тойы күні');
        cell.setAttribute('aria-current', 'date');
      }
      frag.appendChild(cell);
    }
    calGrid.appendChild(frag);
  }

  /* ---------------- countdown ---------------- */
  const EVENT_TIME = new Date('2026-12-12T19:00:00+06:00').getTime();
  const cdDays = $('#cdDays'), cdHours = $('#cdHours'), cdMins = $('#cdMins'), cdSecs = $('#cdSecs'), cdStatus = $('#cdStatus');
  const pad2 = (n) => String(n).padStart(2, '0');
  const renderCountdown = () => {
    const diff = EVENT_TIME - Date.now();
    if (diff <= 0) {
      cdDays.textContent = '00'; cdHours.textContent = '00'; cdMins.textContent = '00'; cdSecs.textContent = '00';
      if (cdStatus) cdStatus.textContent = 'Қыз ұзату тойы басталды! ✨';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    cdDays.textContent = days;
    cdHours.textContent = pad2(hours);
    cdMins.textContent = pad2(mins);
    cdSecs.textContent = pad2(secs);
    if (cdStatus) cdStatus.textContent = 'Мерейдің қыз ұзату тойына дейін';
  };
  renderCountdown();
  setInterval(renderCountdown, 1000);

  /* ---------------- RSVP form ---------------- */
  const form = $('#rsvpForm');
  const success = $('#rsvpSuccess');
  const successText = $('#successText');
  const nameInput = $('#rsvp-name');
  const guestsInput = $('#rsvp-guests');
  const guestsMinus = $('#guestsMinus');
  const guestsPlus = $('#guestsPlus');
  const formNote = $('#formNote');
  const errName = $('#err-name');
  const errGuests = $('#err-guests');
  const btnSubmit = $('#rsvpSubmit');
  const rsvpAgain = $('#rsvpAgain');

  const clampGuests = (v) => Math.min(30, Math.max(1, v));

  guestsMinus.addEventListener('click', () => { guestsInput.value = clampGuests(parseInt(guestsInput.value, 10) - 1 || 1); clearGuestsError(); });
  guestsPlus.addEventListener('click', () => { guestsInput.value = clampGuests(parseInt(guestsInput.value, 10) + 1 || 2); clearGuestsError(); });
  guestsInput.addEventListener('change', () => { guestsInput.value = clampGuests(parseInt(guestsInput.value, 10) || 1); clearGuestsError(); });

  const showErr = (el, msg) => { if (!el) return; el.textContent = msg; el.hidden = !msg; };
  const clearGuestsError = () => showErr(errGuests, '');
  clearErr();
  function clearErr() { showErr(errName, ''); clearGuestsError(); }

  const validate = () => {
    clearErr();
    let ok = true;
    const name = nameInput.value.trim();
    if (name.length < 2) { showErr(errName, 'Қонақтың толық аты-жөнін беріңіз (кемінде 2 таңба).'); ok = false; }
    const guests = parseInt(guestsInput.value, 10);
    if (!Number.isInteger(guests) || guests < 1 || guests > 30) { showErr(errGuests, '1–30 аралығындағы санды көрсетіңіз.'); ok = false; }
    const coming = document.querySelector('input[name="coming"]:checked');
    if (!coming) { if (formNote) formNote.textContent = 'Тойға келу туралы жауабыңызды көрсетіңіз.'; ok = false; }
    return ok ? { name, guests, coming: coming.value } : null;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    btnSubmit.disabled = true;
    const original = btnSubmit.textContent;
    btnSubmit.textContent = 'ЖИБЕРИЛІП ЖАТЫР…';
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        const guestsLine = data.guests === 1 ? '1 адам' : data.guests + ' адам';
        successText.textContent = data.coming === 'yes'
          ? `${data.name}, рақмет! Сіз ${guestsLine} Мерейдің қыз ұзату тойына келуге жауап бердіңіз. Өмірзақ пен Алия сіздерді 12 желтоқсан күні қуанышпен күтеді.`
          : `${data.name}, жауабыңыз сақталды. Өмірзақ пен Алия сіздерге мол қуанышты тілейді.`;
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        if (formNote) formNote.textContent = body.error || 'Жіберу мүмкін болмады. Қайталап көріңіз.';
      }
    } catch (err) {
      if (formNote) formNote.textContent = 'Серверге қосылу мүмкін болмады. Интернетті тексеріңіз.';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = original;
    }
  });

  rsvpAgain.addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------------- gallery carousel ---------------- */
  const SLIDES = [
    { src: 'assets/images/gallery-ceremony.jpg', alt: 'Қыз ұзату тойы — ақ киімдегі қыз', caption: 'Қыз ұзату тойы' },
    { src: 'assets/images/gallery-bride-chair.jpg', alt: 'Дәстүрлі киімдегі қыз', caption: 'Ақ киімдегі Мерей' },
    { src: 'assets/images/gallery-tapestry.jpg', alt: 'Алтын өрнек матасы', caption: 'Алтын мата — өрнек' },
    { src: 'assets/images/gallery-embroidery.jpg', alt: 'Алтын өрнекті мата', caption: 'Алтын өрнек' },
    { src: 'assets/images/bg-bride-white.jpg', alt: 'Ақ матадағы Мерей', caption: 'Мерейдің сәті' },
  ];
  const galImg = $('#galImg');
  const galCaption = $('#galCaption');
  const galDots = $('#galDots');
  const galPrev = $('#galPrev');
  const galNext = $('#galNext');
  let galIndex = 0, galTimer = null;

  const renderDots = () => {
    galDots.innerHTML = '';
    SLIDES.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gal-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Сурет ' + (i + 1));
      if (i === galIndex) dot.classList.add('is-active');
      dot.addEventListener('click', () => goSlide(i, true));
      galDots.appendChild(dot);
    });
  };
  const showSlide = (i) => {
    galImg.classList.add('is-switching');
    setTimeout(() => {
      galImg.src = SLIDES[i].src;
      galImg.alt = SLIDES[i].alt;
      galCaption.textContent = SLIDES[i].caption;
      galImg.classList.remove('is-switching');
      renderDots();
    }, reduceMotion ? 0 : 230);
  };
  const goSlide = (i, userInitiated = false) => {
    galIndex = (i + SLIDES.length) % SLIDES.length;
    showSlide(galIndex);
    if (userInitiated) restartAutoplay();
  };
  const nextSlide = () => goSlide(galIndex + 1);
  const prevSlide = () => goSlide(galIndex - 1);
  galPrev.addEventListener('click', prevSlide);
  galNext.addEventListener('click', nextSlide);

  const restartAutoplay = () => {
    if (galTimer) clearInterval(galTimer);
    if (reduceMotion) return;
    galTimer = setInterval(nextSlide, 6500);
  };
  const pauseAutoplay = () => { if (galTimer) { clearInterval(galTimer); galTimer = null; } };
  restartAutoplay();
  ['galPrev', 'galNext'].forEach((id) => { const n = $('#' + id); if (n) n.addEventListener('mouseenter', pauseAutoplay); n.addEventListener('mouseleave', restartAutoplay); });
  const galleryFrame = $('.gallery-frame');
  if (galleryFrame) {
    galleryFrame.addEventListener('pointerenter', pauseAutoplay);
    galleryFrame.addEventListener('pointerleave', restartAutoplay);
    galleryFrame.addEventListener('focusin', pauseAutoplay);
    galleryFrame.addEventListener('focusout', restartAutoplay);
  }
  renderDots();
})();
