(function () {
  'use strict';

  const CARD_W = 500;

  const carousel   = document.getElementById('cylinderCarousel');
  const modal      = document.getElementById('workModal');
  const modalClose = document.getElementById('modalClose');

  let allCards      = [];
  let visibleCards  = [];
  let currentFilter = 'all';

  /* ── Cylinder geometry ── */

  function calcRadius(n) {
    if (n <= 1) return 0;
    return Math.round((CARD_W + 40) / (2 * Math.tan(Math.PI / n)));
  }

  function layoutCards(cards) {
    const n    = cards.length;
    const r    = calcRadius(n);
    const step = n > 0 ? 360 / n : 0;
    allCards.forEach(c => (c.style.display = 'none'));
    cards.forEach((c, i) => {
      c.style.display   = '';
      c.style.transform = `rotateY(${i * step}deg) translateZ(${r}px)`;
    });
  }

  function applyFacing() {
    const n = visibleCards.length;
    if (!n) return;
    const step = 360 / n;
    visibleCards.forEach((c, i) => {
      const world = ((angle + i * step) % 360 + 360) % 360;
      const dist  = Math.min(world, 360 - world);
      if (dist >= 90) {
        c.style.opacity       = '0';
        c.style.pointerEvents = 'none';
        c.style.filter        = '';
      } else {
        const t = dist / 90;
        c.style.opacity       = String(1 - t * 0.55);
        c.style.pointerEvents = dist < 55 ? 'auto' : 'none';
        c.style.filter        = `brightness(${0.55 + 0.45 * (1 - t)})`;
      }
    });
  }

  /* ── Angle utilities ── */

  const norm = a => ((a % 360) + 540) % 360 - 180;

  function shortDiff(to, from) {
    let d = to - from;
    if (d >  180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function nearestSnap() {
    const n = visibleCards.length;
    if (n <= 1) return angle;
    const step = 360 / n;
    return norm(Math.round(angle / step) * step);
  }

  /* ── Physics / animation loop ── */

  let angle    = 0;     // current rotation, always in [-180, 180)
  let vel      = 0;     // deg/ms — drives inertia coast
  let snapGoal = null;  // target angle while snapping (null = not snapping)
  let prevTs   = null;

  function tick(ts) {
    const dt = prevTs !== null ? Math.min(ts - prevTs, 50) : 16;
    prevTs = ts;

    if (snapGoal !== null) {
      const d = shortDiff(snapGoal, angle);
      if (Math.abs(d) < 0.05) {
        angle    = snapGoal;
        snapGoal = null;
      } else {
        angle = norm(angle + d * 0.15);
      }
    } else if (vel !== 0) {
      angle = norm(angle + vel * dt);
      vel  *= Math.pow(0.988, dt);   // frame-rate-independent decay
      if (Math.abs(vel) < 0.003) {   // ~0.05 deg/frame @60fps
        vel      = 0;
        snapGoal = nearestSnap();
      }
    }

    carousel.style.transform = `rotateY(${angle}deg)`;
    applyFacing();
    requestAnimationFrame(tick);
  }

  /* ── Input — Pointer Events API ── */
  // Uses setPointerCapture so release/cancel are always delivered
  // CSS touch-action:pan-y lets the browser handle vertical scroll natively

  let ptrId    = null;  // active pointer id (null = no drag)
  let ptrLastX = 0;
  let ptrLastT = 0;
  let ptrVel   = 0;     // smoothed velocity in deg/ms
  let ptrMoved = 0;     // total px moved (used by click guard)

  function onPointerDown(e) {
    if (ptrId !== null) return;                              // ignore extra touches
    if (e.pointerType === 'mouse' && e.button !== 0) return; // left button only
    e.preventDefault();
    carousel.setPointerCapture(e.pointerId);

    ptrId    = e.pointerId;
    ptrLastX = e.clientX;
    ptrLastT = e.timeStamp;
    ptrVel   = 0;
    ptrMoved = 0;

    vel      = 0;     // stop inertia
    snapGoal = null;  // cancel snap

    carousel.classList.add('grabbing');
  }

  function onPointerMove(e) {
    if (e.pointerId !== ptrId) return;

    const dx = e.clientX - ptrLastX;
    const dt = Math.max(e.timeStamp - ptrLastT, 1);

    angle    = norm(angle + dx * 0.2);
    ptrVel   = ptrVel * 0.6 + (dx * 0.2 / dt) * 0.4; // exponential moving average
    ptrMoved += Math.abs(dx);

    ptrLastX = e.clientX;
    ptrLastT = e.timeStamp;
  }

  function onPointerUp(e) {
    if (e.pointerId !== ptrId) return;
    releaseDrag(false);
  }

  function onPointerCancel(e) {
    if (e.pointerId !== ptrId) return;
    releaseDrag(true);
  }

  function releaseDrag(cancelled) {
    lastMoved = ptrMoved;
    ptrId     = null;
    carousel.classList.remove('grabbing');

    if (cancelled) {
      vel      = 0;
      snapGoal = nearestSnap();
      return;
    }

    vel = ptrVel;
    if (Math.abs(vel) < 0.003) {
      vel      = 0;
      snapGoal = nearestSnap();
    }
  }

  let lastMoved = 0;

  carousel.addEventListener('pointerdown',      onPointerDown,   { passive: false });
  carousel.addEventListener('pointermove',      onPointerMove,   { passive: false });
  carousel.addEventListener('pointerup',        onPointerUp);
  carousel.addEventListener('pointercancel',    onPointerCancel);

  // Safety: fires whenever pointer capture is released for any reason
  // (covers cases where pointercancel is not dispatched, e.g. tab switch on some browsers)
  carousel.addEventListener('lostpointercapture', e => {
    if (e.pointerId === ptrId) releaseDrag(true);
  });

  // Safety: force-release drag when window loses focus
  window.addEventListener('blur', () => {
    if (ptrId !== null) releaseDrag(true);
  });

  /* ── Card click → modal ── */

  carousel.addEventListener('click', e => {
    if (lastMoved > 12) return;
    const card = e.target.closest('.work-card');
    if (!card) return;
    openModal(card);
  });

  function openModal(card) {
    const bgEl    = card.querySelector('.card-bg');
    const bgClass = [...bgEl.classList].find(c => /^bg-\d+$/.test(c)) || '';
    document.getElementById('modalTag').textContent  = card.querySelector('.card-tag').textContent;
    document.getElementById('modalTitle').innerHTML  = card.querySelector('h3').innerHTML;
    document.getElementById('modalYear').textContent = card.querySelector('.card-year').textContent;
    const vis     = document.getElementById('modalVisual');
    vis.className = 'modal-visual ' + bgClass;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ── Filter ── */

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.filter === currentFilter) return;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter(currentFilter);
    });
  });

  function applyFilter(filter) {
    visibleCards.forEach(c => { c.style.transition = 'opacity 0.2s'; c.style.opacity = '0'; });
    setTimeout(() => {
      visibleCards = filter === 'all'
        ? [...allCards]
        : allCards.filter(c => c.dataset.category === filter);
      angle    = 0;
      vel      = 0;
      snapGoal = null;
      layoutCards(visibleCards);
      carousel.style.transform = 'rotateY(0deg)';
      visibleCards.forEach(c => { c.style.transition = ''; c.style.opacity = ''; });
      applyFacing();
    }, 220);
  }

  /* ── Init ── */

  allCards     = [...document.querySelectorAll('.work-card')];
  visibleCards = [...allCards];
  layoutCards(visibleCards);
  requestAnimationFrame(tick);

})();
