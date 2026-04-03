(function () {
  'use strict';

  const scene      = document.getElementById('cylinderScene');
  const carousel   = document.getElementById('cylinderCarousel');
  const modal      = document.getElementById('workModal');
  const modalClose = document.getElementById('modalClose');

  if (!carousel || !modal || !modalClose) {
    console.error('portfolio.js: 필수 DOM 요소를 찾을 수 없습니다.', { carousel, modal, modalClose });
    return;
  }

  let allCards      = [];
  let cardData      = []; // 원본 카드 데이터 (DOM 독립적)
  let currentFilter = 'all';
  let filterTimeout = null;

  /* ── Card data extraction ── */

  function extractCardData(card) {
    const bgEl = card.querySelector('.card-bg');
    return {
      category: card.dataset.category,
      bgClass:  bgEl ? ([...bgEl.classList].find(c => /^bg-\d+$/.test(c)) || '') : '',
      tag:      card.querySelector('.card-tag').textContent,
      title:    card.querySelector('h3').innerHTML,
      year:     card.querySelector('.card-year').textContent,
    };
  }

  function applyDataToSlot(slot, data) {
    slot.dataset.category = data.category;
    slot.querySelector('.card-bg').className     = 'card-bg ' + data.bgClass;
    slot.querySelector('.card-tag').textContent  = data.tag;
    slot.querySelector('h3').innerHTML           = data.title;
    slot.querySelector('.card-year').textContent = data.year;
  }

  /* ── Cylinder geometry ── */

  function getCardW() {
    return allCards.length > 0 ? allCards[0].offsetWidth : 320;
  }

  function calcRadius(n) {
    if (n <= 1) return 0;
    const cardW = getCardW();
    if (window.innerWidth <= 600) {
      // 카드 겹침 방지: 인접 카드 간 chord ≥ cardW 가 되는 최소 반지름
      // chord = 2r·sin(π/n) ≥ cardW  →  r ≥ cardW / (2·sin(π/n))
      const rMin      = Math.ceil(cardW / (2 * Math.sin(Math.PI / n)));
      // perspective 기반 이상값(화면 꽉 채움 기준)도 함께 고려해 큰 쪽 사용
      const vw          = window.innerWidth;
      const perspective = 900;
      const sideMargin  = 48;
      const rDesired  = Math.floor(perspective * (1 - cardW / (vw - sideMargin)));
      return Math.max(rMin, rDesired);
    }
    return Math.round((cardW + 40) / (2 * Math.tan(Math.PI / n)));
  }

  // filteredData: 필터된 원본 데이터 배열.
  // 슬롯 수(allCards.length)는 항상 고정 — 부족하면 반복 배치해 ALL과 동일한 원통 연출.
  function layoutCards(filteredData) {
    if (filteredData.length === 0) return;

    const n    = allCards.length;
    const r    = calcRadius(n);
    const step = 360 / n;

    allCards.forEach((slot, i) => {
      const data = filteredData[i % filteredData.length];
      applyDataToSlot(slot, data);
      slot.style.display   = '';
      slot.style.transform = `rotateY(${i * step}deg) translateZ(${r}px)`;
    });
  }

  function applyFacing() {
    const n = allCards.length;
    if (n === 0) return;

    const step = 360 / n;

    allCards.forEach((c, i) => {
      const world = (((angle + i * step) % 360) + 360) % 360;
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

  // 각도를 [-180, 180) 범위로 정규화
  const norm = a => ((((a % 360) + 540) % 360) - 180);

  function shortDiff(to, from) {
    let d = to - from;
    if (d >  180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function nearestSnap() {
    const n = allCards.length;
    if (n <= 1) return 0;
    const step = 360 / n;
    return norm(Math.round(angle / step) * step);
  }

  /* ── Physics / animation loop ── */

  let angle    = 0;
  let vel      = 0;
  let snapGoal = null;
  let prevTs   = null;
  let rafActive = false;

  function requestTick() {
    if (!rafActive) {
      rafActive = true;
      requestAnimationFrame(tick);
    }
  }

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

    if (snapGoal !== null || Math.abs(vel) >= 0.003 || ptrId !== null) {
      requestAnimationFrame(tick);
    } else {
      rafActive = false;
      prevTs    = null;
    }
  }

  /* ── Input Handling ── */

  let ptrId    = null;
  let ptrLastX = 0;
  let ptrLastT = 0;
  let ptrVel   = 0;
  let ptrMoved = 0;
  let lastMoved = 0;
  let ptrDownCard = null; // pointerdown 시점의 카드 (캡처 전 e.target 기준)

  function onPointerDown(e) {
    if (ptrId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // e.target은 pointerdown이 scene에서 발생할 때 scene 자체를 가리키므로
    // elementFromPoint로 클릭 좌표의 실제 카드를 직접 찾는다
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    ptrDownCard = hit ? hit.closest('.work-card') : null;

    // 폴백: 캐러셀이 ±90° 회전 시(카드 2·6 정면) 캐러셀 자체의 2D 히트박스가
    // 사실상 소멸해 elementFromPoint가 카드를 찾지 못한다.
    // 클릭이 씬 중심(카드 물리적 크기 160×109px 이내)에 있을 때만 정면 카드로 보정한다.
    if (!ptrDownCard && scene) {
      const sr = scene.getBoundingClientRect();
      const cx = sr.left + sr.width  / 2;
      const cy = sr.top  + sr.height / 2;
      if (Math.abs(e.clientX - cx) < 160 && Math.abs(e.clientY - cy) < 109) {
        const n    = allCards.length;
        const step = 360 / n;
        let best   = { dist: Infinity, card: null };
        allCards.forEach((c, i) => {
          const world = (((angle + i * step) % 360) + 360) % 360;
          const dist  = Math.min(world, 360 - world);
          if (dist < best.dist) best = { dist, card: c };
        });
        if (best.dist < 15) ptrDownCard = best.card;
      }
    }

    carousel.setPointerCapture(e.pointerId);

    ptrId    = e.pointerId;
    ptrLastX = e.clientX;
    ptrLastT = e.timeStamp;
    ptrVel   = 0;
    ptrMoved = 0;

    vel      = 0;
    snapGoal = null;

    carousel.classList.add('grabbing');
    if (scene) scene.classList.add('grabbing');
    requestTick();
  }

  function onPointerMove(e) {
    if (e.pointerId !== ptrId) return;

    const dx = e.clientX - ptrLastX;
    const dt = Math.max(e.timeStamp - ptrLastT, 1);

    angle  = norm(angle + dx * 0.2);
    ptrVel = ptrVel * 0.6 + (dx * 0.2 / dt) * 0.4;
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
    const card = ptrDownCard;
    ptrId       = null;
    ptrDownCard = null;
    carousel.classList.remove('grabbing');
    if (scene) scene.classList.remove('grabbing');

    if (cancelled) {
      vel      = 0;
      snapGoal = nearestSnap();
      return;
    }

    // 드래그 거리가 12px 미만이면 탭/클릭으로 처리
    if (ptrMoved <= 12 && card) {
      openModal(card);
      return;
    }

    vel = ptrVel;
    if (Math.abs(vel) < 0.003) {
      vel      = 0;
      snapGoal = nearestSnap();
    }
    requestTick();
  }

  carousel.addEventListener('pointerdown',   onPointerDown);
  carousel.addEventListener('pointermove',   onPointerMove);
  carousel.addEventListener('pointerup',     onPointerUp);
  carousel.addEventListener('pointercancel', onPointerCancel);
  carousel.addEventListener('lostpointercapture', e => {
    if (e.pointerId === ptrId) releaseDrag(true);
  });

  // cylinder-scene(부모)에도 pointerdown 등록:
  // 3D 투영된 측면 카드 영역이 carousel의 2D 경계(500px) 밖에 위치할 때
  // carousel 이벤트가 도달하지 않는 문제를 방지한다.
  // ptrId !== null 가드로 carousel 이벤트와 이중 실행되지 않는다.
  if (scene) scene.addEventListener('pointerdown', onPointerDown);

  window.addEventListener('blur', () => {
    if (ptrId !== null) releaseDrag(true);
  });

  /* ── Interaction ── */

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

    modalTag.textContent = tagEl.textContent;
    modalTitle.innerHTML = titleEl.innerHTML;
    modalYear.textContent = yearEl.textContent;
    vis.className          = 'modal-visual ' + bgClass;

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

  const filterBtns = document.querySelectorAll('.filter-btn');

  function getFilteredData(filter) {
    return filter === 'all'
      ? cardData
      : cardData.filter(d => d.category === filter);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.filter === currentFilter) return;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter(currentFilter);
    });
  });

  function applyFilter(filter) {
    // 1. 기존 대기 중인 필터 타이머 취소 (레이스 컨디션 방지)
    if (filterTimeout) clearTimeout(filterTimeout);

    // 2. 페이드 아웃
    allCards.forEach(c => { c.style.transition = 'opacity 0.2s'; c.style.opacity = '0'; });

    filterTimeout = setTimeout(() => {
      const filtered = getFilteredData(filter);

      // 3. 상태 초기화
      angle     = 0;
      vel       = 0;
      snapGoal  = null;
      lastMoved = 0;

      // 4. 슬롯에 필터된 데이터를 반복 배치 — 항상 ALL과 동일한 원통 연출
      layoutCards(filtered);
      carousel.style.transform = 'rotateY(0deg)';

      // 5. 페이드 인
      allCards.forEach(c => { c.style.transition = ''; c.style.opacity = ''; });
      applyFacing();

      filterTimeout = null;
    }, 220);
  }

  /* ── Initialization ── */

  allCards = [...document.querySelectorAll('.work-card')];
  cardData = allCards.map(extractCardData); // 원본 데이터 추출
  layoutCards(cardData);
  requestTick(); // 초기 렌더 후 정지 상태면 루프 종료

  /* ── Resize handler ── */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      angle    = 0;
      vel      = 0;
      snapGoal = null;
      layoutCards(getFilteredData(currentFilter));
      carousel.style.transform = 'rotateY(0deg)';
      applyFacing();
    }, 150);
  });

})();
