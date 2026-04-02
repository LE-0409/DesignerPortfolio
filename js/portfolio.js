(function () {
  'use strict';

  const CARD_W = 500;
  const CARD_H = 340;

  const carousel = document.getElementById('cylinderCarousel');
  const modal    = document.getElementById('workModal');
  const modalClose = document.getElementById('modalClose');

  let allCards     = [];
  let visibleCards = [];
  let currentAngle = 0;
  let velocity     = 0;
  let isDragging   = false;
  let lastX        = 0;
  let dragDeltaX   = 0;
  let dragDeltaY   = 0;
  let touchStartX  = 0;
  let touchStartY  = 0;
  let isHorizontalDrag = false;
  let dragDecided  = false;
  let currentFilter = 'all';

  /* ── Cylinder geometry ── */

  function calcRadius(n) {
    if (n <= 1) return 0;
    // Radius so adjacent card edges are separated by ~40px
    return Math.round((CARD_W + 40) / (2 * Math.tan(Math.PI / n)));
  }

  function layoutCards(cards) {
    const n = cards.length;
    const radius = calcRadius(n);
    const step   = n > 0 ? 360 / n : 0;

    // Hide all, then show only the filtered set
    allCards.forEach(c => { c.style.display = 'none'; });

    cards.forEach((card, i) => {
      card.style.display = '';
      card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
    });
  }

  function updateFacing() {
    const n = visibleCards.length;
    if (n === 0) return;
    const step = 360 / n;

    visibleCards.forEach((card, i) => {
      // Angle of this card's face in world space
      const world = ((currentAngle + i * step) % 360 + 360) % 360;
      // 0 = facing camera, 180 = facing away
      const dist  = Math.min(world, 360 - world); // 0..180

      if (dist >= 90) {
        card.style.opacity       = '0';
        card.style.pointerEvents = 'none';
      } else {
        const t = dist / 90; // 0..1
        card.style.opacity       = String(1 - t * 0.55);
        card.style.pointerEvents = dist < 55 ? 'auto' : 'none';
        card.style.filter        = `brightness(${0.55 + 0.45 * (1 - t)})`;
      }
    });
  }

  function snapToNearest() {
    const n = visibleCards.length;
    if (n <= 1) return currentAngle;
    const step = 360 / n;
    const snapped = Math.round(currentAngle / step) * step;
    return ((snapped % 360) + 540) % 360 - 180;
  }

  /* ── Animation loop ── */

  let targetAngle = 0;
  let snapping    = false;

  function tick() {
    if (isDragging) {
      // Follow pointer directly via dragMove
    } else if (snapping) {
      let diff = targetAngle - currentAngle;
      if (diff >  180) diff -= 360;
      if (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.05) {
        currentAngle = targetAngle;
        snapping = false;
      } else {
        currentAngle += diff * 0.11;
      }
    } else {
      currentAngle += velocity;
      velocity *= 0.91;
      if (Math.abs(velocity) < 0.25) {
        velocity = 0;
        const proposed = snapToNearest();
        let   snapDiff = proposed - currentAngle;
        if (snapDiff >  180) snapDiff -= 360;
        if (snapDiff < -180) snapDiff += 360;
        if (Math.abs(snapDiff) > 0.05) {
          targetAngle = proposed;
          snapping = true;
        }
      }
    }

    // Normalize to [-180, 180) every frame to prevent angle drift
    currentAngle = ((currentAngle % 360) + 540) % 360 - 180;

    carousel.style.transform = `rotateY(${currentAngle}deg)`;
    updateFacing();
    requestAnimationFrame(tick);
  }

  /* ── Drag ── */

  function dragStart(x) {
    isDragging = true;
    snapping   = false;
    velocity   = 0;
    lastX      = x;
    dragDeltaX = 0;
    carousel.classList.add('grabbing');
  }

  function dragMove(x) {
    if (!isDragging) return;
    const dx  = x - lastX;
    currentAngle += dx * 0.15;
    velocity      = dx * 0.15;
    dragDeltaX   += Math.abs(dx);
    lastX         = x;
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    carousel.classList.remove('grabbing');
    // velocity from last dragMove drives inertia; tick handles snap naturally
  }

  // Mouse
  carousel.addEventListener('mousedown', e => {
    e.preventDefault();
    dragStart(e.clientX);
    dragDeltaX = 0;
  });

  window.addEventListener('mousemove', e => dragMove(e.clientX));
  window.addEventListener('mouseup',   () => dragEnd());

  // Touch
  carousel.addEventListener('touchstart', e => {
    touchStartX     = e.touches[0].clientX;
    touchStartY     = e.touches[0].clientY;
    dragDecided     = false;
    isHorizontalDrag = false;
    dragDeltaX      = 0;
  }, { passive: true });

  carousel.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (!dragDecided) {
      dragDecided = true;
      isHorizontalDrag = Math.abs(dx) > Math.abs(dy);
      if (isHorizontalDrag) dragStart(touchStartX);
    }

    if (!isHorizontalDrag) return;
    e.preventDefault();
    dragMove(e.touches[0].clientX);
  }, { passive: false });

  carousel.addEventListener('touchend', () => {
    if (isHorizontalDrag) dragEnd();
    dragDecided = false;
  });

  carousel.addEventListener('touchcancel', () => {
    dragEnd();
    dragDecided = false;
  });

  window.addEventListener('blur', dragEnd);

  /* ── Card click → modal ── */

  carousel.addEventListener('click', e => {
    // Ignore if the user was dragging
    if (dragDeltaX > 12) return;
    const card = e.target.closest('.work-card');
    if (!card) return;
    openModal(card);
  });

  function openModal(card) {
    const bgEl   = card.querySelector('.card-bg');
    const bgClass = [...bgEl.classList].find(c => /^bg-\d+$/.test(c)) || '';

    document.getElementById('modalTag').textContent  = card.querySelector('.card-tag').textContent;
    document.getElementById('modalTitle').innerHTML  = card.querySelector('h3').innerHTML;
    document.getElementById('modalYear').textContent = card.querySelector('.card-year').textContent;

    const vis = document.getElementById('modalVisual');
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
    // Fade out
    visibleCards.forEach(c => { c.style.transition = 'opacity 0.2s'; c.style.opacity = '0'; });

    setTimeout(() => {
      visibleCards = filter === 'all'
        ? [...allCards]
        : allCards.filter(c => c.dataset.category === filter);

      currentAngle = 0;
      velocity     = 0;
      snapping     = false;
      targetAngle  = 0;

      layoutCards(visibleCards);
      carousel.style.transform = 'rotateY(0deg)';

      // Remove inline opacity so updateFacing controls it
      visibleCards.forEach(c => { c.style.transition = ''; c.style.opacity = ''; });
      updateFacing();
    }, 220);
  }

  /* ── Init ── */

  allCards     = [...document.querySelectorAll('.work-card')];
  visibleCards = [...allCards];
  layoutCards(visibleCards);
  requestAnimationFrame(tick);

})();
