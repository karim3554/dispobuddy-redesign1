/* ==========================================================================
   DispoBuddy — Motion System (GSAP 3.12.7 + ScrollTrigger)
   Purposeful, restrained corporate motion across all 11 pages.
   - Transform & opacity only (GPU-composited, zero layout reflow)
   - Strict prefers-reduced-motion support via gsap.matchMedia()
   - Zero stuck-invisible content if JS/GSAP fails to load
   - Zero disruption to tickers, Leaflet map, sticky FAQ nav, or forms/wizard
   ========================================================================== */
(function () {
  'use strict';

  var mm = null;
  var wizardObserver = null;

  function safeArray(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function isVisibleInLayout(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function animateEntrance(targets, opts) {
    var els = (Array.isArray(targets) ? targets : [targets]).filter(isVisibleInLayout);
    if (!els.length) return;
    var cfg = Object.assign(
      {
        y: 16,
        opacity: 0,
        duration: 0.6,
        stagger: 0.075,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        overwrite: 'auto',
      },
      opts || {}
    );
    window.gsap.from(els, cfg);
  }

  function animateOnScroll(targets, triggerEl, opts) {
    var els = (Array.isArray(targets) ? targets : [targets]).filter(isVisibleInLayout);
    if (!els.length) return;
    var trigger = triggerEl || els[0];

    var cfg = Object.assign(
      {
        y: 18,
        opacity: 0,
        duration: 0.6,
        stagger: els.length > 1 ? 0.07 : 0,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        overwrite: 'auto',
        scrollTrigger: {
          trigger: trigger,
          start: 'top 88%',
          once: true,
          fastScrollEnd: true,
        },
      },
      opts || {}
    );
    window.gsap.from(els, cfg);
  }

  function setupHeroMotion() {
    // 1. Homepage split architectural hero (zero cold-load flicker: never drop hero to opacity 0)
    var homeHeroCopy = document.querySelector('.hero .hero-copy');
    if (homeHeroCopy) {
      var copyItems = Array.prototype.slice.call(homeHeroCopy.children).filter(isVisibleInLayout);
      if (copyItems.length) {
        window.gsap.fromTo(
          copyItems,
          { opacity: 0.86, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.52,
            stagger: 0.055,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            overwrite: 'auto',
          }
        );
      }
      var homeHeroVisual = document.querySelector('.hero .hero-visual');
      if (homeHeroVisual && isVisibleInLayout(homeHeroVisual)) {
        window.gsap.fromTo(
          homeHeroVisual,
          { opacity: 0.94, scale: 1.024 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.72,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            overwrite: 'auto',
          }
        );
      }
      return;
    }

    // 2. Criteria page custom hero (preserve exact 772px height & 250x100 logo)
    var criteriaHero = document.querySelector('.page-hero.criteria-hero');
    if (criteriaHero) {
      var parts = [];
      var logo = criteriaHero.querySelector('.criteria-hero-logo');
      if (logo) parts.push(logo);
      var content = criteriaHero.querySelector('.criteria-hero-content');
      if (content) {
        parts = parts.concat(Array.prototype.slice.call(content.children));
      }
      animateEntrance(parts, { y: 16, duration: 0.62, stagger: 0.075 });
      return;
    }

    // 3. Standard inner page heroes (process, proof, join, contact, submit-deal, faq, terms, privacy)
    var innerHero = document.querySelector('.page-hero .container, .page-hero .container-narrow');
    if (innerHero) {
      animateEntrance(Array.prototype.slice.call(innerHero.children), {
        y: 16,
        duration: 0.58,
        stagger: 0.07,
      });
    }
  }

  function setupSharedSections() {
    // Section headers (only animate those not already inside hero)
    safeArray('main .section-header').forEach(function (header) {
      animateOnScroll(header, header, { y: 16, duration: 0.56 });
    });

    // Section footer link banners (Homepage How It Works & Proof)
    safeArray('main .section-footer-link').forEach(function (bar) {
      animateOnScroll(bar, bar, { y: 14, duration: 0.52 });
    });

    // CTA Band Cards (Homepage #submit, Criteria, Process, Proof)
    safeArray('main .cta-band-card').forEach(function (card) {
      animateOnScroll(card, card, { y: 18, scale: 0.988, duration: 0.64 });
    });
  }

  function setupHomepageMotion() {
    // Risk Reversal Strip
    var riskGrid = document.querySelector('.risk-strip .risk-grid');
    if (riskGrid) {
      animateOnScroll(safeArray('.risk-item', riskGrid), riskGrid, {
        y: 14,
        duration: 0.52,
        stagger: 0.065,
      });
    }

    // Mini FAQ 3-card grid
    var miniFaq = document.querySelector('.mini-faq-grid');
    if (miniFaq) {
      animateOnScroll(safeArray('.mini-faq-card', miniFaq), miniFaq, {
        y: 20,
        duration: 0.58,
        stagger: 0.08,
      });
    }

    // Fit 6-card checklist
    var fitGrid = document.querySelector('.fit-grid');
    if (fitGrid) {
      animateOnScroll(safeArray('.fit-card', fitGrid), fitGrid, {
        y: 16,
        duration: 0.54,
        stagger: 0.055,
      });
    }

    // How It Works 6 steps (works cleanly with desktop grid & mobile vertical timeline)
    var stepsGrid = document.querySelector('.steps-grid');
    if (stepsGrid) {
      animateOnScroll(safeArray('.step-card', stepsGrid), stepsGrid, {
        y: 20,
        duration: 0.56,
        stagger: 0.065,
      });
    }

    // Deal Types 8 cards
    var typesGrid = document.querySelector('.types-grid');
    if (typesGrid) {
      animateOnScroll(safeArray('.type-card', typesGrid), typesGrid, {
        y: 16,
        duration: 0.52,
        stagger: 0.045,
      });
    }

    // Active Buyers outer frame only (never touch embedded iframe/Leaflet internals)
    var mapShell = document.querySelector('#buyers .map-frame-shell');
    if (mapShell) {
      animateOnScroll(mapShell, mapShell, { y: 18, duration: 0.62 });
    }

    // Proof layout: testimonial + KPI stack
    var proofLayout = document.querySelector('#proof .proof-layout');
    if (proofLayout) {
      var testimonial = proofLayout.querySelector('.testimonial-card');
      if (testimonial) animateOnScroll(testimonial, proofLayout, { y: 18, duration: 0.6 });
      var kpis = safeArray('.kpi-card', proofLayout);
      if (kpis.length) {
        animateOnScroll(kpis, proofLayout, { y: 16, duration: 0.54, stagger: 0.08, delay: 0.08 });
      }
    }

    // Why Choose DispoBuddy 5-card bento
    var featuresBento = document.querySelector('.features-bento');
    if (featuresBento) {
      animateOnScroll(safeArray('.feature-card', featuresBento), featuresBento, {
        y: 18,
        duration: 0.56,
        stagger: 0.065,
      });
    }

    // Homepage FAQ accordion items
    var homeFaqList = document.querySelector('#faq .accordion-list');
    if (homeFaqList) {
      animateOnScroll(safeArray('.accordion-item', homeFaqList), homeFaqList, {
        y: 14,
        duration: 0.5,
        stagger: 0.05,
      });
    }
  }

  function setupCriteriaMotion() {
    // Never touch .criteria-ticker!
    var reqGrid = document.querySelector('.req-grid');
    if (reqGrid) {
      animateOnScroll(safeArray('.req-card', reqGrid), reqGrid, {
        y: 18,
        duration: 0.54,
        stagger: 0.055,
      });
    }

    var typeTags = document.querySelector('.type-tags');
    if (typeTags) {
      animateOnScroll(safeArray('.type-pill', typeTags), typeTags, {
        y: 12,
        duration: 0.46,
        stagger: 0.035,
      });
    }

    var signalsGrid = document.querySelector('.signals-grid');
    if (signalsGrid) {
      animateOnScroll(safeArray('.signal-panel', signalsGrid), signalsGrid, {
        y: 18,
        duration: 0.58,
        stagger: 0.09,
      });
    }

    var statePills = document.querySelector('.state-pills');
    if (statePills) {
      animateOnScroll(safeArray('.state-pill', statePills), statePills, {
        y: 10,
        duration: 0.44,
        stagger: 0.025,
      });
    }
  }

  function setupProcessMotion() {
    // Each timeline step reveals cleanly as the user scrolls through the 6 steps
    safeArray('.timeline-list .timeline-card').forEach(function (card) {
      animateOnScroll(card, card, { y: 18, duration: 0.56 });
    });

    var needsList = document.querySelector('.needs-list');
    if (needsList) {
      animateOnScroll(safeArray('.needs-item', needsList), needsList, {
        y: 14,
        duration: 0.5,
        stagger: 0.06,
      });
    }
  }

  function setupProofMotion() {
    // Never touch .proof-ticker!
    var statsBar = document.querySelector('.stats-bar-grid');
    if (statsBar) {
      animateEntrance(Array.prototype.slice.call(statsBar.children), {
        y: 12,
        duration: 0.52,
        stagger: 0.065,
        delay: 0.12,
      });
    }

    var quote = document.querySelector('.featured-quote');
    if (quote) {
      animateOnScroll(quote, quote, { y: 18, duration: 0.6 });
    }

    var dealsGrid = document.querySelector('.deals-grid');
    if (dealsGrid) {
      animateOnScroll(safeArray('.deal-card', dealsGrid), dealsGrid, {
        y: 18,
        duration: 0.54,
        stagger: 0.065,
      });
    }

    var compareGrid = document.querySelector('.compare-grid');
    if (compareGrid) {
      animateOnScroll(safeArray('.compare-box', compareGrid), compareGrid, {
        y: 18,
        duration: 0.58,
        stagger: 0.09,
      });
    }
  }

  function setupJoinAndContactMotion() {
    var joinLayout = document.querySelector('.join-layout');
    if (joinLayout) {
      var joinCards = safeArray('.info-card, .trust-row, .form-card', joinLayout);
      animateOnScroll(joinCards, joinLayout, { y: 16, duration: 0.56, stagger: 0.075 });
    }

    var contactLayout = document.querySelector('.contact-layout');
    if (contactLayout) {
      var contactCards = safeArray('.contact-card, .form-card', contactLayout);
      animateOnScroll(contactCards, contactLayout, { y: 16, duration: 0.56, stagger: 0.085 });
    }
  }

  function setupSubmitDealMotion() {
    var wizardShell = document.querySelector('.wizard-shell');
    if (!wizardShell) return;

    var blocks = safeArray('.preview-banner, .stepper, .wizard-card', wizardShell);
    animateEntrance(blocks, { y: 14, duration: 0.52, stagger: 0.07, delay: 0.08 });

    // Observe step-panel & conditional-block class changes for crisp GSAP transitions
    // without interfering with existing wizard state, validation, or autosave
    var form = document.getElementById('dealWizardForm');
    if (form && 'MutationObserver' in window) {
      if (wizardObserver) wizardObserver.disconnect();
      wizardObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type !== 'attributes' || m.attributeName !== 'class') return;
          var el = m.target;
          if (
            (el.classList.contains('step-panel') || el.classList.contains('conditional-block')) &&
            el.classList.contains('active')
          ) {
            window.gsap.fromTo(
              el,
              { opacity: 0, y: 12 },
              {
                opacity: 1,
                y: 0,
                duration: 0.34,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
                overwrite: 'auto',
              }
            );
          }
        });
      });

      safeArray('.step-panel, .conditional-block', form).forEach(function (panel) {
        wizardObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
      });
    }
  }

  function setupBuyersMapMotion() {
    // Only animate surrounding UI chrome in standalone mode.
    // NEVER touch #map, Leaflet container, .sidebar transform, markers, or controls!
    var sidebar = document.getElementById('sidebar');
    var isEmbedded = document.body.classList.contains('is-embedded') || window.self !== window.top;
    if (!sidebar || isEmbedded) return;

    var chromeEls = safeArray('.sidebar-header, .filters, .stats-row', sidebar);
    animateEntrance(chromeEls, { y: 8, duration: 0.45, stagger: 0.05 });

    var banner = document.querySelector('.bottom-banner');
    if (banner) {
      animateEntrance(banner, { y: 8, duration: 0.42, delay: 0.12 });
    }
  }

  function setupFaqPageMotion() {
    // NEVER transform .faq-cat-nav itself (preserves sticky positioning & scroll sync!)
    var catTabs = safeArray('#faqCatNav .faq-cat-tab');
    if (catTabs.length) {
      animateEntrance(catTabs, { y: 8, duration: 0.44, stagger: 0.04, delay: 0.1 });
    }

    safeArray('.faq-content-section .faq-group').forEach(function (group) {
      var title = group.querySelector('.faq-group-title');
      if (title) {
        animateOnScroll(title, group, { y: 14, duration: 0.5 });
      }
      var items = safeArray('.accordion-item', group);
      if (items.length) {
        animateOnScroll(items, group, { y: 14, duration: 0.5, stagger: 0.045 });
      }
    });

    var stillCard = document.querySelector('.still-card');
    if (stillCard) {
      animateOnScroll(stillCard, stillCard, { y: 16, duration: 0.56 });
    }
  }

  function setupLegalMotion() {
    var legalCard = document.querySelector('.legal-card');
    if (legalCard) {
      animateEntrance(legalCard, { y: 16, duration: 0.56, delay: 0.08 });
    }
  }

  function initMotion() {
    if (!window.gsap || !window.ScrollTrigger) return;

    // Prevent duplicate ScrollTriggers on re-initialization
    if (mm) {
      mm.revert();
      mm = null;
    }
    if (wizardObserver) {
      wizardObserver.disconnect();
      wizardObserver = null;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });

    mm = window.gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      setupHeroMotion();
      setupSharedSections();
      setupHomepageMotion();
      setupCriteriaMotion();
      setupProcessMotion();
      setupProofMotion();
      setupJoinAndContactMotion();
      setupSubmitDealMotion();
      setupBuyersMapMotion();
      setupFaqPageMotion();
      setupLegalMotion();

      return function () {
        if (wizardObserver) {
          wizardObserver.disconnect();
          wizardObserver = null;
        }
      };
    });

    // Keep ScrollTrigger measurements accurate once fonts & images finish loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    }
    window.addEventListener(
      'load',
      function () {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      },
      { once: true }
    );
  }

  window.DBMotion = {
    version: '1.0.0',
    init: initMotion,
    destroy: function () {
      if (mm) {
        mm.revert();
        mm = null;
      }
      if (wizardObserver) {
        wizardObserver.disconnect();
        wizardObserver = null;
      }
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion);
  } else {
    initMotion();
  }
})();
