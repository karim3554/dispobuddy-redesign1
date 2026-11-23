/* ==========================================================================
   DispoBuddy — Style Variant Shared Behavior & Reference-Matched Interactions
   - Animated numeric counters (0 -> target once on scroll, preserving suffixes)
   - Staggered scroll reveals (1s expo-out) & ambient state-tile pulse wave
   - CTA arrow glide wrapper, WAI-ARIA FAQ accordions, sticky FAQ sync, mobile drawer
   - Strict prefers-reduced-motion support & zero duplicate observers/listeners
   ========================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── SKIP LINK & ACTIVE NAV A11Y ────────────────────────────────────────── */
  var mainEl = document.querySelector('main');
  if (mainEl && !document.querySelector('.sv-skip-link')) {
    if (!mainEl.id) mainEl.id = 'main-content';
    var skip = document.createElement('a');
    skip.href = '#' + mainEl.id;
    skip.className = 'sv-skip-link';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  document.querySelectorAll('.sv-nav a.active, .sv-mobile-drawer a.active').forEach(function (a) {
    a.setAttribute('aria-current', 'page');
  });

  /* ── WRAP CTA ARROWS FOR REFERENCE +8px HOVER GLIDE ─────────────────────── */
  document.querySelectorAll('.sv-btn').forEach(function (btn) {
    if (btn.querySelector('.sv-arrow')) return;
    if (btn.innerHTML.indexOf('→') !== -1 || btn.innerHTML.indexOf('&#8594;') !== -1) {
      btn.innerHTML = btn.innerHTML.replace(/(\s*)(→|&#8594;)/, '$1<span class="sv-arrow" aria-hidden="true">→</span>');
    }
  });

  /* ── STAGGERED AMBIENT PULSE ON STATE TILES (REFERENCE: 0.15s * i) ──────── */
  document.querySelectorAll('.sv-states-grid').forEach(function (grid) {
    Array.prototype.slice.call(grid.querySelectorAll('.sv-state-box')).forEach(function (box, idx) {
      box.style.setProperty('--sv-pulse-delay', (idx * 0.15).toFixed(2) + 's');
    });
  });

  /* ── AUTOMATIC SIBLING STAGGER DELAYS (EXACT LOVABLE REFERENCE CADENCE) ── */
  if (!prefersReduced) {
    document.querySelectorAll('.sv-types-grid').forEach(function (grid) {
      Array.prototype.slice.call(grid.querySelectorAll('.sv-type-tile.sv-reveal')).forEach(function (el, idx) {
        el.style.setProperty('--sv-reveal-delay', (idx * 0.05).toFixed(2) + 's');
      });
    });
    document.querySelectorAll('.sv-grid-2').forEach(function (grid) {
      Array.prototype.slice.call(grid.querySelectorAll('.sv-fit-card.sv-reveal, .sv-card.sv-reveal')).forEach(function (el, idx) {
        el.style.setProperty('--sv-reveal-delay', idx % 2 === 1 ? '0.10s' : '0s');
      });
    });
    document.querySelectorAll('.sv-grid-3').forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll('.sv-reveal')).forEach(function (el, idx) {
        el.style.setProperty('--sv-reveal-delay', Math.min(idx * 0.12, 0.36).toFixed(2) + 's');
      });
    });
    document.querySelectorAll('.sv-grid-4, .sv-metrics-strip, .sv-metrics-4, .sv-kpi-stack, .stats-row').forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll('.sv-reveal')).forEach(function (el, idx) {
        el.style.setProperty('--sv-reveal-delay', Math.min(idx * 0.1, 0.4).toFixed(2) + 's');
      });
    });
    document.querySelectorAll('.sv-why-grid').forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll('.sv-reveal')).forEach(function (el, idx) {
        el.style.setProperty('--sv-reveal-delay', Math.min(idx * 0.08, 0.4).toFixed(2) + 's');
      });
    });
  }

  /* ── HEADER SCROLL ELEVATION ────────────────────────────────────────────── */
  var header = document.querySelector('.sv-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── MOBILE DRAWER ──────────────────────────────────────────────────────── */
  var burger = document.getElementById('svBurger');
  var drawer = document.getElementById('svDrawer');
  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('is-open'));
    });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawer(false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setDrawer(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960 && drawer.classList.contains('is-open')) {
        setDrawer(false);
      }
    });
  }

  /* ── UNIVERSAL FAQ ACCORDIONS (WAI-ARIA) ────────────────────────────────── */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.sv-faq-item'));
  faqItems.forEach(function (item, idx) {
    var btn = item.querySelector('.sv-faq-trigger');
    var panel = item.querySelector('.sv-faq-panel');
    if (!btn || !panel) return;
    if (!btn.id) btn.id = 'sv-faq-t-' + (idx + 1);
    if (!panel.id) panel.id = 'sv-faq-p-' + (idx + 1);
    btn.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', btn.id);

    if (item.classList.contains('is-open')) {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      var list = item.closest('.sv-faq-list');
      if (list) {
        list.querySelectorAll('.sv-faq-item.is-open').forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            var ob = other.querySelector('.sv-faq-trigger');
            var op = other.querySelector('.sv-faq-panel');
            if (ob) ob.setAttribute('aria-expanded', 'false');
            if (op) op.style.maxHeight = '0px';
          }
        });
      }
      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
      panel.style.maxHeight = !isOpen ? panel.scrollHeight + 'px' : '0px';
    });
  });

  /* ── FAQ CATEGORY STICKY SYNC (faq.html) ────────────────────────────────── */
  var faqTabs = Array.prototype.slice.call(document.querySelectorAll('.sv-faq-tab[data-cat]'));
  var faqGroups = Array.prototype.slice.call(document.querySelectorAll('.sv-faq-group[id]'));
  if (faqTabs.length && faqGroups.length) {
    function setActiveTab(id) {
      faqTabs.forEach(function (t) {
        var active = t.getAttribute('data-cat') === id;
        t.classList.toggle('is-active', active);
        if (active) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    }

    if (window.location.hash) {
      var hashId = window.location.hash.slice(1);
      if (document.getElementById(hashId)) setActiveTab(hashId);
    }

    window.addEventListener(
      'scroll',
      function () {
        var offset = window.scrollY + 180;
        var current = faqGroups[0].id;
        faqGroups.forEach(function (g) {
          if (g.offsetTop <= offset) current = g.id;
        });
        setActiveTab(current);
      },
      { passive: true }
    );
  }

  /* ── ANIMATED NUMERIC COUNTERS (REFERENCE: 0 -> TARGET ONCE ON SCROLL) ──── */
  function setupAnimatedCounters() {
    if (prefersReduced || !('IntersectionObserver' in window)) return;

    var counterEls = Array.prototype.slice.call(
      document.querySelectorAll('.sv-metric-val, .sv-kpi-box strong')
    );

    var prepared = [];
    counterEls.forEach(function (el) {
      if (el.dataset.svCounted === '1') return;
      // Preserve child <span> (e.g. ★, +, DAYS) while animating only the leading numeric text node
      var textNode = null;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3 && /\d/.test(el.childNodes[i].nodeValue)) {
          textNode = el.childNodes[i];
          break;
        }
      }
      if (!textNode) return;
      var raw = textNode.nodeValue;
      // Skip non-single-number ranges like "24-48" or ratios like "30/"
      if (/\d+\s*[-/]\s*\d*/.test(raw)) return;

      var match = raw.match(/^([^0-9]*)(\d+(?:\.\d+)?)(.*)$/);
      if (!match) return;

      var prefix = match[1];
      var numStr = match[2];
      var suffix = match[3];
      var target = parseFloat(numStr);
      var decimals = numStr.indexOf('.') !== -1 ? numStr.split('.')[1].length : 0;

      // Initialize at 0 before scrolling into view (matching reference 0.0★ / $0.0M+ / 0+)
      textNode.nodeValue = prefix + (0).toFixed(decimals) + suffix;
      prepared.push({ el: el, textNode: textNode, prefix: prefix, target: target, decimals: decimals, suffix: suffix, started: false });
    });

    if (!prepared.length) return;

    function animateItem(item) {
      if (item.started) return;
      item.started = true;
      item.el.dataset.svCounted = '1';
      var duration = 1400;
      var startTime = performance.now();

      function frame(now) {
        var progress = Math.min(1, (now - startTime) / duration);
        // Smooth ease-out cubic
        var eased = 1 - Math.pow(1 - progress, 3);
        var val = item.target * eased;
        item.textNode.nodeValue = item.prefix + val.toFixed(item.decimals) + item.suffix;
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          item.textNode.nodeValue = item.prefix + item.target.toFixed(item.decimals) + item.suffix;
        }
      }
      window.requestAnimationFrame(frame);
    }

    var counterIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          for (var i = 0; i < prepared.length; i++) {
            if (prepared[i].el === entry.target) {
              animateItem(prepared[i]);
              counterIO.unobserve(entry.target);
              break;
            }
          }
        });
      },
      { threshold: 0.25 }
    );

    prepared.forEach(function (item) {
      counterIO.observe(item.el);
    });
  }

  setupAnimatedCounters();

  /* ── SCROLL REVEALS (REFERENCE: 60px RISE, 1s EXPO-OUT, ONCE ON ENTER) ──── */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.sv-reveal'));
  if (!reveals.length || prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
      el.classList.add('is-in', 'is-settled');
    });
    return;
  }

  // Progressive enhancement: only hide reveal elements once JS & IO are ready
  document.documentElement.classList.add('sv-anim-ready');

  function revealElement(el) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    // Release reveal transition after entrance finishes so hover transitions run at 0s delay with zero conflict
    var rawDelay = el.style.getPropertyValue('--sv-reveal-delay') || '0s';
    var delayMs = Math.round((parseFloat(rawDelay) || 0) * 1000);
    window.setTimeout(function () {
      el.classList.add('is-settled');
    }, delayMs + 1050);
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
  );

  reveals.forEach(function (el) {
    io.observe(el);
  });
})();
