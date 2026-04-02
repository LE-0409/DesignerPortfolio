(function () {
  'use strict';

  const header      = document.getElementById('site-header');
  const menuBtn     = document.querySelector('.menu-btn');
  const sideMenu    = document.querySelector('.side-menu');
  const sections    = document.querySelectorAll('main section[id]');
  const navLinks    = document.querySelectorAll('.header-nav .nav-link');
  const allNavLinks = document.querySelectorAll('.side-menu a, .header-nav .nav-link');

  /* ── Menu toggle ── */
  function openMenu() {
    document.body.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', '메뉴 닫기');
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', '메뉴 열기');
  }

  menuBtn.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  /* ── Close menu on nav click ── */
  allNavLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  /* ── Close menu when clicking outside ── */
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('menu-open')) return;
    if (!sideMenu.contains(e.target) && !menuBtn.contains(e.target)) {
      closeMenu();
    }
  });

  /* ── Header scroll class ── */
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 50);
    highlightActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Active nav highlight ── */
  function highlightActiveNav() {
    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - 112) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }

  onScroll();

})();
