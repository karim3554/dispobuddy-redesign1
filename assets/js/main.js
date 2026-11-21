/* ==========================================================================
   DispoBuddy — Shared Interactive Behavior (Redesign Concept Demo)
   ========================================================================== */
(function () {
  'use strict';

  /* ── ACCESSIBLE SKIP-TO-CONTENT LINK ────────────────────────────────────── */
  const mainEl = document.querySelector('main') || document.querySelector('.page-wrap');
  if (mainEl && !document.querySelector('.skip-link')) {
    if (!mainEl.id) mainEl.id = 'main-content';
    const skip = document.createElement('a');
    skip.href = '#' + mainEl.id;
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  /* ── ACTIVE NAV ARIA-CURRENT & DECORATIVE SVG A11Y ──────────────────────── */
  document.querySelectorAll('.navbar-links a.active, .mobile-menu a.active').forEach((a) => {
    if (!a.hasAttribute('aria-current')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('svg').forEach((svg) => {
    if (!svg.hasAttribute('aria-label') && !svg.hasAttribute('aria-labelledby') && !svg.hasAttribute('role')) {
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
    }
  });

  document.querySelectorAll('.form-error, .err-banner').forEach((el) => {
    if (!el.hasAttribute('role')) el.setAttribute('role', 'alert');
    if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  });

  /* ── NAVBAR SCROLL ELEVATION ────────────────────────────────────────────── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── MOBILE MENU DRAWER ─────────────────────────────────────────────────── */
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  function setMenuOpen(open) {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (hamburger && mobileMenu) {
    if (!mobileMenu.id) mobileMenu.id = 'mobile-nav-drawer';
    hamburger.setAttribute('aria-controls', mobileMenu.id);

    hamburger.addEventListener('click', () => {
      const next = !mobileMenu.classList.contains('is-open');
      setMenuOpen(next);
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        setMenuOpen(false);
        hamburger.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && mobileMenu.classList.contains('is-open')) {
        setMenuOpen(false);
      }
    });

    window.addEventListener('pageshow', () => {
      if (mobileMenu.classList.contains('is-open')) {
        setMenuOpen(false);
      }
    });
  }

  /* ── SMOOTH FAQ ACCORDIONS (FULL WAI-ARIA WIRING) ───────────────────────── */
  document.querySelectorAll('.accordion-trigger').forEach((btn, idx) => {
    const item = btn.closest('.accordion-item');
    const panel = item ? item.querySelector('.accordion-panel') : null;
    if (panel) {
      if (!btn.id) btn.id = 'acc-trigger-' + (idx + 1);
      if (!panel.id) panel.id = 'acc-panel-' + (idx + 1);
      btn.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', btn.id);
    }

    btn.addEventListener('click', () => {
      if (!item) return;
      const isOpen = item.classList.contains('is-open');
      const list = item.closest('.accordion-list');

      // Close sibling items for a clean corporate accordion experience
      if (list) {
        list.querySelectorAll('.accordion-item.is-open').forEach((other) => {
          if (other !== item) {
            other.classList.remove('is-open');
            const otherBtn = other.querySelector('.accordion-trigger');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
      }

      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ── PROGRESSIVE FALLBACK FOR REVEAL ELEMENTS ───────────────────────────── */
  /* Primary motion is handled by assets/js/motion.js (GSAP + ScrollTrigger).   */
  /* Ensure .reveal elements stay marked visible if motion.js is unavailable.   */
  document.querySelectorAll('.reveal').forEach((el) => {
    el.classList.add('is-visible');
  });
})();

