/* ==========================================================================
   DispoBuddy — Premium Motion System v2.0 (GSAP 3.12.7 + ScrollTrigger)
   - Cinematic clip-path + scale reveals & restrained WebGL hero showcase
   - Line-by-line editorial typography reveals (preserving semantics & a11y)
   - Purposeful ScrollTrigger storytelling (Process sticky stage + HIW rail)
   - Native View Transitions API + branded navy fallback with failsafe
   - Restrained desktop-only magnetic CTAs & refined micro-interactions
   - Strict prefers-reduced-motion support & zero duplicate listeners/triggers
   ========================================================================== */
(function () {
  'use strict';

  var mm = null;
  var wizardObserver = null;
  var cleanupFns = [];
  var pageTransitionBound = false;
  var trackedHeadings = [];
  var headingResizeObserver = null;
  var headingResizeTimer = null;

  function safeArray(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function isVisibleInLayout(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function registerCleanup(fn) {
    if (typeof fn === 'function') cleanupFns.push(fn);
  }

  function runCleanups() {
    while (cleanupFns.length) {
      var fn = cleanupFns.pop();
      try {
        fn();
      } catch (e) {}
    }
    if (wizardObserver) {
      wizardObserver.disconnect();
      wizardObserver = null;
    }
    if (headingResizeTimer) {
      clearTimeout(headingResizeTimer);
      headingResizeTimer = null;
    }
    if (headingResizeObserver) {
      headingResizeObserver.disconnect();
      headingResizeObserver = null;
    }
    while (trackedHeadings.length) {
      var entry = trackedHeadings.pop();
      try {
        if (entry.tween) {
          if (entry.tween.scrollTrigger) entry.tween.scrollTrigger.kill();
          entry.tween.kill();
        }
        if (entry.emTween) {
          if (entry.emTween.scrollTrigger) entry.emTween.scrollTrigger.kill();
          entry.emTween.kill();
        }
        if (entry.el && entry.el.dataset.dbOrigHtml) {
          entry.el.innerHTML = entry.el.dataset.dbOrigHtml;
          delete entry.el.dataset.dbLinesReady;
          delete entry.el.dataset.dbHeadingBound;
        }
      } catch (e) {}
    }
  }

  /* ── 1. PREMIUM LINE-BY-LINE TYPOGRAPHY REVEALS ─────────────────────────── */
  function splitHeadingIntoLines(el, isReflow) {
    if (!el || !isVisibleInLayout(el)) return null;
    if (!isReflow && el.dataset.dbLinesReady === '1') {
      return safeArray('.db-line-inner', el);
    }

    var origHtml = el.dataset.dbOrigHtml || el.innerHTML;
    el.dataset.dbOrigHtml = origHtml;
    if (isReflow) {
      el.innerHTML = origHtml;
      delete el.dataset.dbLinesReady;
    }

    var plainText = (el.innerHTML || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!plainText) return null;
    if (!el.hasAttribute('aria-label')) {
      el.setAttribute('aria-label', plainText);
    }

    // Tokenize into word spans while preserving <em> wrappers and explicit <br>
    var tokens = [];
    function walk(node, isEm) {
      if (node.nodeType === 3) {
        var parts = node.nodeValue.split(/(\s+)/);
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            tokens.push({ type: 'space', text: ' ' });
          } else {
            tokens.push({ type: 'word', text: part, em: isEm });
          }
        });
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        if (tag === 'br') {
          tokens.push({ type: 'br' });
        } else {
          var nextEm = isEm || tag === 'em';
          Array.prototype.slice.call(node.childNodes).forEach(function (child) {
            walk(child, nextEm);
          });
        }
      }
    }

    Array.prototype.slice.call(el.childNodes).forEach(function (child) {
      walk(child, false);
    });

    // Build temporary inline measurement spans
    var frag = document.createDocumentFragment();
    var wordEls = [];
    tokens.forEach(function (tok) {
      if (tok.type === 'br') {
        frag.appendChild(document.createElement('br'));
        wordEls.push({ type: 'br' });
      } else if (tok.type === 'space') {
        frag.appendChild(document.createTextNode(' '));
      } else {
        var span = document.createElement('span');
        span.style.display = 'inline-block';
        span.textContent = tok.text;
        if (tok.em) span.dataset.em = '1';
        frag.appendChild(span);
        wordEls.push({ type: 'word', el: span, text: tok.text, em: tok.em });
      }
    });

    var prevDisplay = el.style.display;
    var computedDisplay = window.getComputedStyle(el).display;
    if (computedDisplay && computedDisplay.indexOf('flex') !== -1) {
      el.style.display = 'block';
    }

    el.innerHTML = '';
    el.appendChild(frag);

    // Group words into visual lines using getBoundingClientRect().top
    var lines = [];
    var currentLine = [];
    var lastTop = null;

    wordEls.forEach(function (item) {
      if (item.type === 'br') {
        if (currentLine.length) {
          lines.push(currentLine);
          currentLine = [];
          lastTop = null;
        }
        return;
      }
      var top = Math.round(item.el.getBoundingClientRect().top);
      if (lastTop !== null && Math.abs(top - lastTop) > 6) {
        lines.push(currentLine);
        currentLine = [];
      }
      currentLine.push(item);
      lastTop = top;
    });
    if (currentLine.length) lines.push(currentLine);

    el.style.display = prevDisplay;

    if (!lines.length) {
      el.innerHTML = origHtml;
      return null;
    }

    // Reconstruct clean semantic visual lines
    var outFrag = document.createDocumentFragment();
    lines.forEach(function (lineWords) {
      var mask = document.createElement('span');
      mask.className = 'db-line-mask';
      mask.setAttribute('aria-hidden', 'true');

      var inner = document.createElement('span');
      inner.className = 'db-line-inner';

      var activeEm = null;
      lineWords.forEach(function (w, idx) {
        if (idx > 0) {
          if (activeEm && w.em) {
            activeEm.appendChild(document.createTextNode(' '));
          } else {
            activeEm = null;
            inner.appendChild(document.createTextNode(' '));
          }
        }
        if (w.em) {
          if (!activeEm) {
            activeEm = document.createElement('em');
            inner.appendChild(activeEm);
          }
          activeEm.appendChild(document.createTextNode(w.text));
        } else {
          activeEm = null;
          inner.appendChild(document.createTextNode(w.text));
        }
      });

      mask.appendChild(inner);
      outFrag.appendChild(mask);
    });

    el.innerHTML = '';
    el.appendChild(outFrag);
    el.dataset.dbLinesReady = '1';

    return safeArray('.db-line-inner', el);
  }

  function markHeadingMasksRevealed(el) {
    safeArray('.db-line-mask', el).forEach(function (mask) {
      mask.classList.add('is-revealed');
    });
  }

  function buildHeadingTweens(entry, lines) {
    var style = entry.style || 'masked-rise';
    var isHero = entry.isHero;
    var el = entry.el;
    var scrollCfg = isHero
      ? undefined
      : {
          trigger: entry.trigger || el,
          start: 'top 92%',
          once: true,
          fastScrollEnd: true,
        };

    var fromVars;
    var toVars;

    if (style === 'clip-wipe') {
      // Style B: Horizontal directional clip wipe
      fromVars = {
        clipPath: 'inset(0% 100% 0% 0%)',
        x: -10,
        opacity: 0.25,
      };
      toVars = {
        clipPath: 'inset(0% 0% 0% 0%)',
        x: 0,
        opacity: 1,
        duration: entry.duration || 0.66,
        stagger: entry.stagger || 0.075,
        ease: 'power3.out',
        clearProps: 'clipPath,transform,opacity',
        overwrite: 'auto',
        scrollTrigger: scrollCfg,
        onStart: function () {
          entry.revealed = true;
        },
        onComplete: function () {
          entry.revealed = true;
          markHeadingMasksRevealed(el);
        },
      };
    } else if (style === 'stagger-rise') {
      // Style C: Staggered sequential line rise
      fromVars = { yPercent: 94, opacity: 0.01 };
      toVars = {
        yPercent: 0,
        opacity: 1,
        duration: entry.duration || 0.64,
        stagger: entry.stagger || 0.085,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        overwrite: 'auto',
        scrollTrigger: scrollCfg,
        onStart: function () {
          entry.revealed = true;
        },
        onComplete: function () {
          entry.revealed = true;
          markHeadingMasksRevealed(el);
        },
      };
    } else if (style === 'hero') {
      // Style E: Stronger editorial hero entrance (zero cold-load flicker on homepage hero)
      var isHomeHero = !!el.closest('.hero');
      fromVars = isHomeHero
        ? { yPercent: 34, opacity: 0.9 }
        : { yPercent: 46, opacity: 0.01 };
      toVars = {
        yPercent: 0,
        opacity: 1,
        duration: entry.duration || 0.72,
        stagger: entry.stagger || 0.09,
        ease: 'power4.out',
        clearProps: 'transform,opacity',
        overwrite: 'auto',
        onStart: function () {
          entry.revealed = true;
        },
        onComplete: function () {
          entry.revealed = true;
          markHeadingMasksRevealed(el);
        },
      };
    } else {
      // Style A (primary): Masked vertical reveal
      fromVars = { yPercent: 108, opacity: 0.01 };
      toVars = {
        yPercent: 0,
        opacity: 1,
        duration: entry.duration || 0.68,
        stagger: entry.stagger || 0.075,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        overwrite: 'auto',
        scrollTrigger: scrollCfg,
        onStart: function () {
          entry.revealed = true;
        },
        onComplete: function () {
          entry.revealed = true;
          markHeadingMasksRevealed(el);
        },
      };
    }

    entry.tween = window.gsap.fromTo(lines, fromVars, toVars);

    // Style D: Subtle independent highlight reveal for orange <em> brand words
    var ems = safeArray('.db-line-inner em', el);
    if (ems.length && style !== 'clip-wipe') {
      entry.emTween = window.gsap.fromTo(
        ems,
        { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0.72 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          opacity: 1,
          duration: 0.56,
          delay: isHero ? 0.18 : 0.14,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'clipPath,opacity',
          overwrite: 'auto',
          scrollTrigger: scrollCfg,
        }
      );
    }
  }

  function scheduleHeadingReflow() {
    if (headingResizeTimer) clearTimeout(headingResizeTimer);
    headingResizeTimer = setTimeout(function () {
      headingResizeTimer = null;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var didReflow = false;
      trackedHeadings.forEach(function (entry) {
        if (!entry.el || !document.body.contains(entry.el) || !isVisibleInLayout(entry.el)) return;
        var container = entry.observeTarget || entry.el;
        var currentWidth = Math.round(container.getBoundingClientRect().width);
        var currentFontSize = window.getComputedStyle(entry.el).fontSize;
        if (Math.abs(currentWidth - entry.lastWidth) < 10 && currentFontSize === entry.lastFontSize) {
          return;
        }

        entry.lastWidth = currentWidth;
        entry.lastFontSize = currentFontSize;
        didReflow = true;

        if (entry.tween) {
          if (entry.tween.scrollTrigger) entry.tween.scrollTrigger.kill();
          entry.tween.kill();
          entry.tween = null;
        }
        if (entry.emTween) {
          if (entry.emTween.scrollTrigger) entry.emTween.scrollTrigger.kill();
          entry.emTween.kill();
          entry.emTween = null;
        }

        var lines = splitHeadingIntoLines(entry.el, true);
        if (!lines || !lines.length) return;

        // Never hide already-revealed, hero, or visible/passed headings during resize
        var rect = entry.el.getBoundingClientRect();
        var atOrAboveView = rect.top < window.innerHeight + 60;
        var nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
        if (entry.revealed || entry.isHero || atOrAboveView || nearBottom) {
          entry.revealed = true;
          window.gsap.set(lines, { clearProps: 'clipPath,transform,opacity' });
          markHeadingMasksRevealed(entry.el);
        } else {
          buildHeadingTweens(entry, lines);
        }
      });

      if (didReflow && window.ScrollTrigger) {
        window.ScrollTrigger.refresh();
      }
    }, 180);
  }

  function ensureHeadingResizeObserver() {
    if (headingResizeObserver) return;
    if ('ResizeObserver' in window) {
      headingResizeObserver = new ResizeObserver(function () {
        scheduleHeadingReflow();
      });
    } else {
      window.addEventListener('resize', scheduleHeadingReflow, { passive: true });
      registerCleanup(function () {
        window.removeEventListener('resize', scheduleHeadingReflow);
      });
    }
  }

  function revealHeadingLines(el, opts) {
    if (!el || !isVisibleInLayout(el)) return;
    if (el.classList.contains('sr-only') || el.dataset.dbHeadingBound === '1') return;

    var lines = splitHeadingIntoLines(el, false);
    if (!lines || !lines.length) return;

    el.dataset.dbHeadingBound = '1';

    var cfg = opts || {};
    var isHero = !!cfg.hero;
    var style = cfg.style || (isHero ? 'hero' : 'masked-rise');
    var observeTarget = el.parentElement || el;

    var entry = {
      el: el,
      observeTarget: observeTarget,
      lastWidth: Math.round(observeTarget.getBoundingClientRect().width),
      lastFontSize: window.getComputedStyle(el).fontSize,
      isHero: isHero,
      style: style,
      trigger: cfg.trigger || el,
      duration: cfg.duration,
      stagger: cfg.stagger,
      revealed: false,
      tween: null,
      emTween: null,
    };

    buildHeadingTweens(entry, lines);
    trackedHeadings.push(entry);

    ensureHeadingResizeObserver();
    if (headingResizeObserver) {
      headingResizeObserver.observe(observeTarget);
    }
  }

  /* ── 2. STANDARD ENTRANCE & SCROLL HELPERS ──────────────────────────────── */
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

  function animateClipReveal(el, opts) {
    if (!el || !isVisibleInLayout(el)) return;
    var cfg = opts || {};
    var fromClip = cfg.fromClip || 'inset(8% 0% 0% 0% round 16px)';
    var toClip = cfg.toClip || 'inset(0% 0% 0% 0% round 16px)';
    window.gsap.fromTo(
      el,
      {
        clipPath: fromClip,
        opacity: cfg.fromOpacity !== undefined ? cfg.fromOpacity : 0.85,
        y: cfg.y !== undefined ? cfg.y : 14,
      },
      {
        clipPath: toClip,
        opacity: 1,
        y: 0,
        duration: cfg.duration || 0.78,
        ease: 'power3.out',
        clearProps: 'clipPath,transform,opacity',
        overwrite: 'auto',
        scrollTrigger: cfg.immediate
          ? undefined
          : {
              trigger: cfg.trigger || el,
              start: 'top 88%',
              once: true,
              fastScrollEnd: true,
            },
      }
    );
  }

  /* ── 3. RESTRAINED WEBGL SHOWCASE EFFECT (HOMEPAGE HERO PHOTO ONLY) ─────── */
  function setupHeroWebGL() {
    // Desktop fine-pointer & capable hardware only; static <img> remains intact as fallback
    var isDesktopFine =
      window.matchMedia('(min-width: 1025px)').matches &&
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(hover: hover)').matches;
    if (!isDesktopFine) return;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return;

    var hero = document.querySelector('.hero');
    var visual = document.querySelector('.hero .hero-visual');
    var img = visual ? visual.querySelector('img') : null;
    if (!hero || !visual || !img) return;
    if (visual.querySelector('.hero-webgl-canvas')) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero-webgl-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    var gl = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
    } catch (e) {
      gl = null;
    }
    if (!gl) return;

    var vsSrc =
      'attribute vec2 a_pos; varying vec2 v_uv; void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }';
    var fsSrc =
      'precision mediump float;' +
      'uniform sampler2D u_tex;' +
      'uniform vec2 u_res;' +
      'uniform vec2 u_imgRes;' +
      'uniform vec2 u_mouse;' +
      'uniform float u_strength;' +
      'uniform float u_time;' +
      'varying vec2 v_uv;' +
      'void main(){' +
      '  float cAspect = u_res.x / max(u_res.y, 1.0);' +
      '  float iAspect = u_imgRes.x / max(u_imgRes.y, 1.0);' +
      '  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);' +
      // Match CSS object-fit: cover; object-position: left bottom;
      '  if (cAspect > iAspect) {' +
      '    float scale = iAspect / cAspect;' +
      '    uv.y = (1.0 - scale) + uv.y * scale;' +
      '  } else {' +
      '    float scale = cAspect / iAspect;' +
      '    uv.x = uv.x * scale;' +
      '  }' +
      '  vec2 d = v_uv - u_mouse;' +
      '  float dist = length(d * vec2(cAspect, 1.0));' +
      '  float wave = exp(-dist * 4.2) * sin(dist * 14.0 - u_time * 3.2);' +
      '  vec2 offset = normalize(d + 0.0001) * wave * u_strength * 0.0085;' +
      '  vec2 sampleUv = clamp(uv + offset, vec2(0.001), vec2(0.999));' +
      '  gl_FragColor = texture2D(u_tex, sampleUv);' +
      '}';

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uImgRes = gl.getUniformLocation(prog, 'u_imgRes');
    var uMouse = gl.getUniformLocation(prog, 'u_mouse');
    var uStrength = gl.getUniformLocation(prog, 'u_strength');
    var uTime = gl.getUniformLocation(prog, 'u_time');

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var destroyed = false;
    var rafId = 0;
    var mouseX = 0.65;
    var mouseY = 0.45;
    var targetStrength = 0.72; // gentle initial entrance shimmer that settles to 0
    var currentStrength = 0.72;
    var startTime = performance.now();

    function resize() {
      if (destroyed) return;
      var cssW = visual.offsetWidth || Math.round(visual.getBoundingClientRect().width);
      var cssH = visual.offsetHeight || Math.round(visual.getBoundingClientRect().height);
      if (!cssW || !cssH) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(1, Math.round(cssW * dpr));
      var h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, cssW, cssH);
      drawFrame();
    }

    function drawFrame() {
      if (destroyed || !gl) return;
      var elapsed = (performance.now() - startTime) * 0.001;
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uStrength, currentStrength);
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function tick() {
      if (destroyed) return;
      currentStrength += (targetStrength - currentStrength) * 0.08;
      targetStrength *= 0.92;
      drawFrame();
      if (currentStrength > 0.004 || targetStrength > 0.004) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentStrength = 0;
        targetStrength = 0;
        drawFrame();
        rafId = 0;
      }
    }

    function wake() {
      if (!rafId && !destroyed) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function onPointerMove(e) {
      var rect = visual.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      mouseY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      targetStrength = Math.min(1.0, targetStrength + 0.32);
      wake();
    }

    function onContextLost(e) {
      e.preventDefault();
      teardown();
    }

    function uploadAndStart() {
      if (destroyed || !img.naturalWidth) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.uniform2f(uImgRes, img.naturalWidth, img.naturalHeight);
        // Size and paint the first WebGL frame before attaching to DOM (prevents cold-load blank flash)
        resize();
        if (!canvas.parentNode) {
          visual.appendChild(canvas);
        }
        wake();
      } catch (e) {
        teardown();
      }
    }

    function teardown() {
      if (destroyed) return;
      destroyed = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      hero.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      try {
        var ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) {}
      gl = null;
    }

    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('webglcontextlost', onContextLost);
    registerCleanup(teardown);

    if (img.complete && img.naturalWidth > 0) {
      uploadAndStart();
    } else {
      img.addEventListener('load', uploadAndStart, { once: true });
    }
  }

  /* ── 4. HERO MOTION (HOMEPAGE + ALL INNER PAGES) ────────────────────────── */
  function setupHeroMotion() {
    // 1. Homepage Hero (cinematic clip-path + line-by-line h1 + restrained WebGL)
    var homeHeroCopy = document.querySelector('.hero .hero-copy');
    if (homeHeroCopy) {
      var homeH1 = homeHeroCopy.querySelector('h1');
      if (homeH1) {
        revealHeadingLines(homeH1, { hero: true, duration: 0.66, stagger: 0.08 });
      }

      var restCopy = Array.prototype.slice
        .call(homeHeroCopy.children)
        .filter(function (child) {
          return child !== homeH1 && isVisibleInLayout(child);
        });
      if (restCopy.length) {
        window.gsap.fromTo(
          restCopy,
          { opacity: 0.86, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.54,
            stagger: 0.055,
            delay: 0.08,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            overwrite: 'auto',
          }
        );
      }

      var homeHeroVisual = document.querySelector('.hero .hero-visual');
      if (homeHeroVisual && isVisibleInLayout(homeHeroVisual)) {
        var isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) {
          window.gsap.fromTo(
            homeHeroVisual,
            {
              opacity: 0.96,
              clipPath: 'inset(0% 0% 8% 0%)',
              scale: 1.03,
            },
            {
              opacity: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              scale: 1,
              duration: 0.86,
              ease: 'power3.out',
              clearProps: 'clipPath,transform,opacity',
              overwrite: 'auto',
            }
          );
        } else {
          // Desktop: keep the masked .hero-visual container stationary so its soft left
          // gradient mask never shifts or gets sliced by a hard clip-path seam.
          // Animate the inner media cleanly inside the stationary masked frame.
          setupHeroWebGL();
          var mediaTargets = safeArray('img, .hero-webgl-canvas', homeHeroVisual);
          if (mediaTargets.length) {
            window.gsap.fromTo(
              mediaTargets,
              {
                opacity: 0.95,
                scale: 1.042,
                x: 12,
                transformOrigin: 'right center',
              },
              {
                opacity: 1,
                scale: 1,
                x: 0,
                duration: 0.86,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
                overwrite: 'auto',
              }
            );
          }
        }
      }
      return;
    }

    // 2. Criteria page custom hero (preserve exact 772px height & 250x100 logo)
    var criteriaHero = document.querySelector('.page-hero.criteria-hero');
    if (criteriaHero) {
      var logo = criteriaHero.querySelector('.criteria-hero-logo');
      if (logo && isVisibleInLayout(logo)) {
        animateEntrance(logo, { y: 12, duration: 0.56 });
      }
      var content = criteriaHero.querySelector('.criteria-hero-content');
      if (content) {
        var cH1 = content.querySelector('h1');
        if (cH1) revealHeadingLines(cH1, { hero: true, duration: 0.64 });
        var cRest = Array.prototype.slice.call(content.children).filter(function (ch) {
          return ch !== cH1;
        });
        animateEntrance(cRest, { y: 14, duration: 0.56, stagger: 0.07, delay: 0.1 });
      }
      return;
    }

    // 3. Standard inner page heroes (process, proof, join, contact, submit-deal, faq, terms, privacy)
    var innerHero = document.querySelector('.page-hero .container, .page-hero .container-narrow');
    if (innerHero) {
      var innerH1 = innerHero.querySelector('h1');
      if (innerH1) revealHeadingLines(innerH1, { hero: true, duration: 0.62 });
      var innerRest = Array.prototype.slice.call(innerHero.children).filter(function (ch) {
        return ch !== innerH1;
      });
      animateEntrance(innerRest, { y: 14, duration: 0.56, stagger: 0.065, delay: 0.08 });
    }
  }

  /* ── 5. SHARED SECTIONS (CURATED TYPOGRAPHY REVEALS + CTA BANDS) ────────── */
  function pickSectionTitleStyle(titleEl, index) {
    var hasEm = !!titleEl.querySelector('em');
    var hasBr = !!titleEl.querySelector('br');
    var words = (titleEl.textContent || '').trim().split(/\s+/).filter(Boolean);
    // Keep <em> headings on vertical reveals so Style D highlight wipe stands out
    if (!hasEm && !hasBr && words.length <= 5 && index % 2 === 1) {
      return 'clip-wipe';
    }
    if (words.length >= 7) {
      return 'stagger-rise';
    }
    return 'masked-rise';
  }

  function setupSharedSections() {
    safeArray('main .section-header').forEach(function (header, idx) {
      var title = header.querySelector('.section-title');
      if (title) {
        revealHeadingLines(title, {
          trigger: header,
          style: pickSectionTitleStyle(title, idx),
        });
      }
      var others = Array.prototype.slice.call(header.children).filter(function (ch) {
        return ch !== title;
      });
      if (others.length) {
        animateOnScroll(others, header, { y: 14, duration: 0.54, stagger: 0.06 });
      }
    });

    // Catch standalone .section-title headings outside .section-header
    // (e.g., Homepage #faq .section-title, Process .needs-layout .section-title)
    safeArray('main .section-title').forEach(function (title) {
      if (title.dataset.dbHeadingBound === '1') return;
      revealHeadingLines(title, {
        trigger: title,
        style: 'stagger-rise',
      });
    });

    safeArray('main .section-footer-link').forEach(function (bar) {
      animateOnScroll(bar, bar, { y: 14, duration: 0.52 });
    });

    safeArray('main .cta-band-card').forEach(function (card) {
      animateClipReveal(card, {
        fromClip: 'inset(6% 0% 0% 0% round 24px)',
        toClip: 'inset(0% 0% 0% 0% round 24px)',
        fromOpacity: 0.85,
        y: 16,
        duration: 0.72,
      });
      var ctaH2 = card.querySelector('h2');
      if (ctaH2) {
        revealHeadingLines(ctaH2, { trigger: card, style: 'stagger-rise' });
      }
    });
  }

  /* ── 6. HOMEPAGE MOTION & HOW-IT-WORKS SCROLL RAIL ──────────────────────── */
  function setupHomepageMotion() {
    var riskGrid = document.querySelector('.risk-strip .risk-grid');
    if (riskGrid) {
      animateOnScroll(safeArray('.risk-item', riskGrid), riskGrid, {
        y: 14,
        duration: 0.52,
        stagger: 0.065,
      });
    }

    var miniFaq = document.querySelector('.mini-faq-grid');
    if (miniFaq) {
      animateOnScroll(safeArray('.mini-faq-card', miniFaq), miniFaq, {
        y: 20,
        duration: 0.58,
        stagger: 0.08,
      });
    }

    var fitGrid = document.querySelector('.fit-grid');
    if (fitGrid) {
      animateOnScroll(safeArray('.fit-card', fitGrid), fitGrid, {
        y: 16,
        duration: 0.54,
        stagger: 0.055,
      });
    }

    // Secondary scroll storytelling: subtle scroll-scrubbed progress rail on #how-it-works
    var stepsGrid = document.querySelector('#how-it-works .steps-grid');
    if (stepsGrid) {
      var rail = document.querySelector('#how-it-works .hiw-scroll-rail');
      if (!rail) {
        rail = document.createElement('div');
        rail.className = 'hiw-scroll-rail';
        rail.setAttribute('aria-hidden', 'true');
        rail.innerHTML = '<div class="hiw-scroll-rail-fill"></div>';
        stepsGrid.parentNode.insertBefore(rail, stepsGrid);
      }
      var fill = rail.querySelector('.hiw-scroll-rail-fill');
      if (fill) {
        window.gsap.fromTo(
          fill,
          { scaleX: 0.16 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: stepsGrid,
              start: 'top 78%',
              end: 'bottom 58%',
              scrub: 0.4,
            },
          }
        );
      }

      animateOnScroll(safeArray('.step-card', stepsGrid), stepsGrid, {
        y: 20,
        duration: 0.56,
        stagger: 0.065,
      });
    }

    var typesGrid = document.querySelector('.types-grid');
    if (typesGrid) {
      animateOnScroll(safeArray('.type-card', typesGrid), typesGrid, {
        y: 16,
        duration: 0.52,
        stagger: 0.045,
      });
    }

    // Outer frame clip reveal only (never touch embedded iframe/Leaflet internals)
    var mapShell = document.querySelector('#buyers .map-frame-shell');
    if (mapShell) {
      animateClipReveal(mapShell, {
        fromClip: 'inset(6% 0% 0% 0% round 20px)',
        toClip: 'inset(0% 0% 0% 0% round 20px)',
        fromOpacity: 0.9,
        y: 16,
        duration: 0.72,
      });
    }

    var proofLayout = document.querySelector('#proof .proof-layout');
    if (proofLayout) {
      var testimonial = proofLayout.querySelector('.testimonial-card');
      if (testimonial) {
        animateClipReveal(testimonial, {
          fromClip: 'inset(0% 6% 0% 0% round 20px)',
          toClip: 'inset(0% 0% 0% 0% round 20px)',
          fromOpacity: 0.86,
          y: 16,
          duration: 0.72,
          trigger: proofLayout,
        });
      }
      var kpis = safeArray('.kpi-card', proofLayout);
      if (kpis.length) {
        animateOnScroll(kpis, proofLayout, { y: 16, duration: 0.54, stagger: 0.08, delay: 0.08 });
      }
    }

    var featuresBento = document.querySelector('.features-bento');
    if (featuresBento) {
      animateOnScroll(safeArray('.feature-card', featuresBento), featuresBento, {
        y: 18,
        duration: 0.56,
        stagger: 0.065,
      });
    }

    var homeFaqList = document.querySelector('#faq .accordion-list');
    if (homeFaqList) {
      animateOnScroll(safeArray('.accordion-item', homeFaqList), homeFaqList, {
        y: 14,
        duration: 0.5,
        stagger: 0.05,
      });
    }
  }

  /* ── 7. CRITERIA, PROCESS STORYTELLING, PROOF, FORMS, MAP, FAQ, LEGAL ───── */
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
      safeArray('.signal-panel', signalsGrid).forEach(function (panel, idx) {
        animateClipReveal(panel, {
          fromClip: idx === 0 ? 'inset(0% 6% 0% 0% round 18px)' : 'inset(0% 0% 0% 6% round 18px)',
          toClip: 'inset(0% 0% 0% 0% round 18px)',
          fromOpacity: 0.85,
          y: 16,
          duration: 0.68,
          trigger: signalsGrid,
        });
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
    var cards = safeArray('.timeline-list .timeline-card');
    if (!cards.length) return;

    // Sequential reveal on all viewports
    cards.forEach(function (card) {
      animateOnScroll(card, card, { y: 18, duration: 0.58 });
    });

    // Primary Scroll Storytelling: desktop sticky visual stage synced with the 6 steps
    var stage = document.querySelector('.process-stage');
    if (stage && window.matchMedia('(min-width: 1024px)').matches) {
      var metas = [
        '~5 min deal form',
        '24–48hr underwriting',
        '2 min DocuSign JV',
        'Matched vetted buyers',
        'Offers & title coordination',
        '50/50 split paid at close',
      ];
      var numEl = document.getElementById('processStageNum');
      var countEl = document.getElementById('processStageCount');
      var titleEl = document.getElementById('processStageTitle');
      var metaEl = document.getElementById('processStageMeta');
      var barEl = document.getElementById('processStageBar');
      var dots = safeArray('.process-stage-dot', stage);
      var currentIdx = -1;

      function setActiveStep(idx) {
        if (idx === currentIdx || idx < 0 || idx >= cards.length) return;
        currentIdx = idx;
        var label = idx < 9 ? '0' + (idx + 1) : String(idx + 1);
        var h3 = cards[idx].querySelector('h3');

        if (numEl) {
          numEl.textContent = label;
          window.gsap.fromTo(
            numEl,
            { y: 8, opacity: 0.45 },
            { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity' }
          );
        }
        if (countEl) countEl.textContent = label;
        if (titleEl && h3) titleEl.textContent = h3.textContent;
        if (metaEl) metaEl.textContent = metas[idx] || '';
        if (barEl) barEl.style.transform = 'scaleX(' + ((idx + 1) / cards.length).toFixed(3) + ')';

        cards.forEach(function (c, i) {
          c.classList.toggle('is-active-step', i === idx);
        });
        dots.forEach(function (d, i) {
          d.classList.toggle('is-active', i === idx);
          d.setAttribute('aria-selected', String(i === idx));
        });
      }

      setActiveStep(0);

      cards.forEach(function (card, idx) {
        window.ScrollTrigger.create({
          trigger: card,
          start: 'top 56%',
          end: 'bottom 44%',
          onEnter: function () {
            setActiveStep(idx);
          },
          onEnterBack: function () {
            setActiveStep(idx);
          },
        });
      });

      // Clickable jump dots on desktop stage
      dots.forEach(function (dot) {
        var onClick = function () {
          var targetIdx = parseInt(dot.getAttribute('data-step-target'), 10);
          if (!isNaN(targetIdx) && cards[targetIdx]) {
            var y = cards[targetIdx].getBoundingClientRect().top + window.scrollY - 110;
            window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
          }
        };
        dot.addEventListener('click', onClick);
        registerCleanup(function () {
          dot.removeEventListener('click', onClick);
        });
      });
    }

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
      animateClipReveal(quote, {
        fromClip: 'inset(6% 0% 0% 0% round 20px)',
        toClip: 'inset(0% 0% 0% 0% round 20px)',
        fromOpacity: 0.86,
        y: 16,
        duration: 0.72,
      });
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
      safeArray('.info-card h2, .form-card h2', joinLayout).forEach(function (h2) {
        revealHeadingLines(h2, { trigger: h2, style: 'clip-wipe' });
      });
    }

    var contactLayout = document.querySelector('.contact-layout');
    if (contactLayout) {
      var contactCards = safeArray('.contact-card, .form-card', contactLayout);
      animateOnScroll(contactCards, contactLayout, { y: 16, duration: 0.56, stagger: 0.085 });
      var contactTitle = document.getElementById('contactTitle');
      if (contactTitle) {
        revealHeadingLines(contactTitle, { trigger: contactTitle, style: 'clip-wipe' });
      }
    }
  }

  function setupSubmitDealMotion() {
    var wizardShell = document.querySelector('.wizard-shell');
    if (!wizardShell) return;

    var blocks = safeArray('.preview-banner, .stepper, .wizard-card', wizardShell);
    animateEntrance(blocks, { y: 14, duration: 0.52, stagger: 0.07, delay: 0.08 });

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
              { opacity: 0, y: 10 },
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
    // NEVER touch #map, Leaflet container, .sidebar transform, markers, or controls!
    var sidebar = document.getElementById('sidebar');
    var isEmbedded = document.body.classList.contains('is-embedded') || window.self !== window.top;
    if (!sidebar || isEmbedded) return;

    var mapTitle = sidebar.querySelector('.sidebar-title h1');
    if (mapTitle) {
      revealHeadingLines(mapTitle, { hero: true, style: 'clip-wipe', duration: 0.58 });
    }

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
        revealHeadingLines(title, { trigger: group, style: 'clip-wipe', duration: 0.64 });
      }
      var items = safeArray('.accordion-item', group);
      if (items.length) {
        animateOnScroll(items, group, { y: 14, duration: 0.5, stagger: 0.045 });
      }
    });

    var stillCard = document.querySelector('.still-card');
    if (stillCard) {
      animateOnScroll(stillCard, stillCard, { y: 16, duration: 0.56 });
      var stillH2 = stillCard.querySelector('h2');
      if (stillH2) {
        revealHeadingLines(stillH2, { trigger: stillCard, style: 'stagger-rise' });
      }
    }
  }

  function setupLegalMotion() {
    var legalCard = document.querySelector('.legal-card');
    if (legalCard) {
      animateEntrance(legalCard, { y: 16, duration: 0.56, delay: 0.08 });
    }
  }

  /* ── 8. RESTRAINED DESKTOP-ONLY MAGNETIC CTA MICRO-INTERACTIONS ─────────── */
  function setupMagneticCTAs() {
    var finePointer =
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(hover: hover)').matches &&
      window.matchMedia('(min-width: 1024px)').matches;
    if (!finePointer) return;

    var targets = safeArray('.hero .btn-primary, .cta-band-card .btn-primary, .navbar-actions .btn-primary');
    targets.forEach(function (btn) {
      var maxShift = 4.5; // restrained ±4.5px movement
      var onMove = function (e) {
        var rect = btn.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var dx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        var dy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        window.gsap.to(btn, {
          x: dx * maxShift,
          y: dy * maxShift,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };
      var onLeave = function () {
        window.gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.42,
          ease: 'power3.out',
          clearProps: 'x,y',
          overwrite: 'auto',
        });
      };
      btn.addEventListener('pointermove', onMove, { passive: true });
      btn.addEventListener('pointerleave', onLeave, { passive: true });
      btn.addEventListener('blur', onLeave, { passive: true });
      registerCleanup(function () {
        btn.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointerleave', onLeave);
        btn.removeEventListener('blur', onLeave);
        window.gsap.set(btn, { clearProps: 'x,y' });
      });
    });
  }

  /* ── 9. PREMIUM PAGE TRANSITIONS (VIEW TRANSITIONS API + NAVY FALLBACK) ─── */
  function setupPageTransitions() {
    if (pageTransitionBound) return;
    pageTransitionBound = true;

    // Native CSS @view-transition handles modern browsers automatically (including back/forward).
    // Only bind the JS navy curtain fallback when native cross-document View Transitions are unsupported.
    var supportsNativeVT =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('view-transition-name', 'none');

    if (supportsNativeVT) return;

    var veil = document.createElement('div');
    veil.className = 'db-page-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);

    var navTimer = null;
    function clearVeil() {
      if (navTimer) {
        clearTimeout(navTimer);
        navTimer = null;
      }
      veil.classList.remove('is-active');
    }

    window.addEventListener('pageshow', clearVeil);
    window.addEventListener('popstate', clearVeil);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;
      if (link.hasAttribute('download')) return;
      var target = link.getAttribute('target');
      if (target && target !== '_self') return;

      var rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(rawHref)) return;

      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      veil.classList.add('is-active');

      var safety = setTimeout(clearVeil, 900);
      navTimer = setTimeout(function () {
        clearTimeout(safety);
        window.location.href = url.href;
      }, 170);
    });
  }

  /* ── 10. INITIALIZATION & CLEANUP ───────────────────────────────────────── */
  function initMotion() {
    setupPageTransitions();

    if (!window.gsap || !window.ScrollTrigger) return;

    // Prevent duplicate ScrollTriggers, listeners, or observers on re-init
    if (mm) {
      mm.revert();
      mm = null;
    }
    runCleanups();

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
      setupMagneticCTAs();

      return function () {
        runCleanups();
      };
    });

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
    version: '2.0.0',
    init: initMotion,
    destroy: function () {
      if (mm) {
        mm.revert();
        mm = null;
      }
      runCleanups();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion);
  } else {
    initMotion();
  }
})();
