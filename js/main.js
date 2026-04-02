(function () {
  'use strict';

  const header     = document.getElementById('site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const sideMenu   = document.querySelector('.side-menu');
  const menuBtn    = document.querySelector('.menu-btn');
  const sections   = document.querySelectorAll('main section[id]');
  const navLinks   = document.querySelectorAll('.header-nav .nav-link');
  const allNavLinks = document.querySelectorAll('.side-menu a, .header-nav .nav-link');

  /* ── Header scroll class ── */
  function onScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
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
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === '#' + current);
    });
  }

  /* ── Close side menu on nav click ── */
  allNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.checked = false;
    });
  });

  /* ── Close side menu when clicking outside ── */
  document.addEventListener('click', e => {
    if (!menuToggle.checked) return;
    if (!sideMenu.contains(e.target) && !menuBtn.contains(e.target)) {
      menuToggle.checked = false;
    }
  });

  // Run once on load
  onScroll();

})();
