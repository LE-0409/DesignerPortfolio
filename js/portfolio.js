(function () {
  'use strict';

  const CARD_W = 500;

  const carousel   = document.getElementById('cylinderCarousel');
  const modal      = document.getElementById('workModal');
  const modalClose = document.getElementById('modalClose');

  if (!carousel || !modal || !modalClose) {
    console.error('portfolio.js: 필수 DOM 요소를 찾을 수 없습니다.', { carousel, modal, modalClose });
    return;
  }

  let allCards      = [];
  let visibleCards  = [];
  let currentFilter = 'all';
  let filterTimeout = null; // 필터 레이스 컨디션 방지용

  /* ── Cylinder geometry ── */

  function calcRadius(n) {
    if (n <= 1) return 0;
    // 카드가 원통형으로 배치될 때 필요한 반지름 계산
    return Math.round((CARD_W + 40) / (2 * Math.tan(Math.PI / n)));
  }

  function layoutCards(cards) {
    const n = cards.length;
    allCards.forEach(c => (c.style.display = 'none'));
    
    // 0 나누기 방지: 카드가 없을 경우 실행 중단
    if (n === 0) return;

    const r    = calcRadius(n);
    const step = 360 / n;
    
    cards.forEach((c, i) => {
      c.style.display   = '';
      c.style.transform = `rotateY(${i * step}deg) translateZ(${r}px)`;
    });
  }

  function applyFacing() {
    const n = visibleCards.length;
    if (n === 0) return;
    
    const step = 360 / n;
    visibleCards.forEach((c, i) => {
      // JS의 % 연산자는 음수를 반환할 수 있으므로 항상 양수를 보장하는 모듈로 연산 적용
      const world = (((angle + i * step) % 360) + 360) % 360;
      const dist  = Math.min(world, 360 - world);
      
      if (dist >= 90) {
        c.style.opacity       = '0';
        c.style.pointerEvents = 'none';
        c.style.filter        = '';
      } else {
        const t = dist / 90;
        c.style.opacity       = String(1 - t * 0.55);
        // 정면 근처(55도 미만)일 때만 클릭 가능
        c.style.pointerEvents = dist < 55 ? 'auto' : 'none';
        c.style.filter        = `brightness(${0.55 + 0.45 * (1 - t)})`;
      }
    });
  }

  /* ── Angle utilities ── */

  // 각도를 [-180, 180) 범위로 정규화
  const norm = a => ((((a % 360) + 540) % 360) - 180);

  function shortDiff(to, from) {
    let d = to - from;
    if (d >  180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function nearestSnap() {
    const n = visibleCards.length;
    if (n <= 1) return 0;
    const step = 360 / n;
    return norm(Math.round(angle / step) * step);
  }

  /* ── Physics / animation loop ── */

  let angle    = 0;     // 현재 회전각
  let vel      = 0;     // 관성 속도 (deg/ms)
  let snapGoal = null;  // 스냅 목표 지점
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
      vel  *= Math.pow(0.988, dt); // 프레임 독립적 감속
      if (Math.abs(vel) < 0.003) { 
        vel      = 0;
        snapGoal = nearestSnap();
      }
    }

    carousel.style.transform = `rotateY(${angle}deg)`;
    applyFacing();
    requestAnimationFrame(tick);
  }

  /* ── Input Handling ── */

  let ptrId    = null;
  let ptrLastX = 0;
  let ptrLastT = 0;
  let ptrVel   = 0;
  let ptrMoved = 0;
  let lastMoved = 0; // 클릭 판정용

  function onPointerDown(e) {
    if (ptrId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    carousel.setPointerCapture(e.pointerId);

    ptrId    = e.pointerId;
    ptrLastX = e.clientX;
    ptrLastT = e.timeStamp;
    ptrVel   = 0;
    ptrMoved = 0;

    vel      = 0; 
    snapGoal = null;

    carousel.classList.add('grabbing');
  }

  function onPointerMove(e) {
    if (e.pointerId !== ptrId) return;

    const dx = e.clientX - ptrLastX;
    const dt = Math.max(e.timeStamp - ptrLastT, 1);

    angle    = norm(angle + dx * 0.2);
    ptrVel   = ptrVel * 0.6 + (dx * 0.2 / dt) * 0.4; // 지수 이동 평균으로 속도 계산
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

  carousel.addEventListener('pointerdown',   onPointerDown);
  carousel.addEventListener('pointermove',   onPointerMove);
  carousel.addEventListener('pointerup',     onPointerUp);
  carousel.addEventListener('pointercancel', onPointerCancel);
  carousel.addEventListener('lostpointercapture', e => {
    if (e.pointerId === ptrId) releaseDrag(true);
  });

  window.addEventListener('blur', () => {
    if (ptrId !== null) releaseDrag(true);
  });

  /* ── Interaction ── */

  carousel.addEventListener('click', e => {
    // 드래그 거리가 12px 이상이면 클릭으로 간주하지 않음 (오작동 방지)
    if (lastMoved > 12) return;
    const card = e.target.closest('.work-card');
    if (!card) return;
    openModal(card);
  });

  function openModal(card) {
    const bgEl    = card.querySelector('.card-bg');
    const bgClass = bgEl ? ([...bgEl.classList].find(c => /^bg-\d+$/.test(c)) || '') : '';

    const tagEl   = card.querySelector('.card-tag');
    const titleEl = card.querySelector('h3');
    const yearEl  = card.querySelector('.card-year');
    const modalTag   = document.getElementById('modalTag');
    const modalTitle = document.getElementById('modalTitle');
    const modalYear  = document.getElementById('modalYear');
    const vis        = document.getElementById('modalVisual');

    if (!tagEl || !titleEl || !yearEl || !modalTag || !modalTitle || !modalYear || !vis) {
      console.error('portfolio.js: 모달 또는 카드 내 필수 요소를 찾을 수 없습니다.');
      return;
    }

    modalTag.textContent  = tagEl.textContent;
    modalTitle.textContent = titleEl.textContent;
    modalYear.textContent = yearEl.textContent;

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

  /* ── Filter Logic ── */

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
    // 1. 기존 대기 중인 필터 타이머 취소 (레이스 컨디션 방지)
    if (filterTimeout) clearTimeout(filterTimeout);

    // 2. 페이드 아웃 애니메이션
    visibleCards.forEach(c => { 
      c.style.transition = 'opacity 0.2s'; 
      c.style.opacity = '0'; 
    });

    filterTimeout = setTimeout(() => {
      // 3. 필터링 데이터 적용
      visibleCards = filter === 'all'
        ? [...allCards]
        : allCards.filter(c => c.dataset.category === filter);

      // 4. 상태 초기화
      angle     = 0;
      vel       = 0;
      snapGoal  = null;
      lastMoved = 0; 
      
      layoutCards(visibleCards);
      carousel.style.transform = 'rotateY(0deg)';
      
      // 5. 스타일 복구 및 페이드 인
      visibleCards.forEach(c => { 
        c.style.transition = ''; 
        c.style.opacity = ''; 
      });
      applyFacing();
      
      filterTimeout = null;
    }, 220);
  }

  /* ── Initialization ── */

  allCards     = [...document.querySelectorAll('.work-card')];
  visibleCards = [...allCards];
  layoutCards(visibleCards);
  requestAnimationFrame(tick);

})();