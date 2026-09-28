/* ============================================================
   Nabil Sehli — portfolio
   Shared behaviour: theme, clock, smooth scroll, reveals, carousels.
   Every feature degrades to a working page if its library is absent.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- theme ----------
     The initial value is set by an inline script in <head> so the page
     never flashes the wrong theme. This only wires up the toggle. */
  var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  var SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>';

  function paintIcon() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var ico = document.getElementById('icoTheme');
    if (ico) ico.innerHTML = dark ? SUN : MOON;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#08080A' : '#ffffff');
  }
  paintIcon();

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch (e) {}
      paintIcon();
    });
  }

  /* ---------- live clock, Casablanca ---------- */
  var clockEl = document.getElementById('clock');
  if (clockEl) {
    var tick = function () {
      var s;
      try {
        s = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Casablanca',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date());
      } catch (e) {
        s = new Date().toTimeString().slice(0, 8);
      }
      clockEl.textContent = s;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
  }

  /* in-page anchors only — real page links navigate normally */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -80 });
      else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- reveals + bloom parallax ---------- */
  if (window.gsap && window.ScrollTrigger && !reduced) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('[data-r]').forEach(function (el) {
      /* Anything already within the first screenful stays as it is. Animating it
         would leave part of the opening frame blank while nothing has scrolled. */
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      gsap.from(el, {
        opacity: 0, y: 26, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
    gsap.utils.toArray('.bloom').forEach(function (b) {
      if (!b.parentElement) return;
      gsap.to(b, {
        yPercent: 16, ease: 'none',
        scrollTrigger: { trigger: b.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------- cursor-following glow ----------
     A soft light that trails the pointer across every page. It lerps toward the
     cursor rather than snapping to it, and only repaints while it still has
     ground to cover, so an idle pointer costs nothing. */
  (function () {
    var wrap = document.getElementById('cursorGlow');
    if (!wrap) return;
    var orb = wrap.querySelector('i');
    if (!orb) return;

    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reduced) return;   /* touch, or reduced motion: leave it parked */

    var tx = window.innerWidth * 0.5, ty = window.innerHeight * 0.4;
    var cx = tx, cy = ty;
    var running = false;

    function frame() {
      cx += (tx - cx) * 0.085;
      cy += (ty - cy) * 0.085;
      orb.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });

    orb.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
  })();

  /* ---------- lightbox ----------
     A screen shown inside the stage is a fraction of its real size, which on a
     phone makes it unreadable. Every .stage gets an Enlarge button (clicking the
     image does the same) that opens a copy full size. On small screens the copy
     keeps a readable width and scrolls sideways rather than shrinking to fit. */
  var ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  var ICON_CLOSE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var ICON_PAUSE  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICON_PLAY   = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';

  var carousels = [];           /* each carousel's update(), rerun when anything pauses them */
  var lightboxOpen = false;
  function updateCarousels() { carousels.forEach(function (fn) { fn(); }); }

  var lightbox = (function () {
    var dlg = document.createElement('dialog');
    if (typeof dlg.showModal !== 'function') return null;
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Enlarged screen');
    dlg.setAttribute('data-lenis-prevent', '');
    dlg.innerHTML =
      '<div class="lb-bar"><p class="lb-cap"><span class="t"></span><span class="d"></span></p>' +
      '<span class="lb-hint">Scroll to explore</span>' +
      '<button type="button" class="lb-x" aria-label="Close">' + ICON_CLOSE + '</button></div>' +
      '<div class="lb-body"></div>';
    document.body.appendChild(dlg);

    var body = dlg.querySelector('.lb-body');
    var tEl = dlg.querySelector('.lb-cap .t');
    var dEl = dlg.querySelector('.lb-cap .d');
    var opener = null;

    dlg.querySelector('.lb-x').addEventListener('click', function () { dlg.close(); });
    /* a click on the dark surround, not on the picture, closes it */
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target === body) dlg.close(); });
    dlg.addEventListener('close', function () {
      body.textContent = '';
      lightboxOpen = false;
      if (lenis) lenis.start();
      updateCarousels();
      if (opener && opener.focus) opener.focus();
    });

    return function (node, title, desc) {
      var copy = node.cloneNode(true);
      /* the copy's ids would duplicate the page's; its url(#...) refs still resolve to the original */
      [copy].concat([].slice.call(copy.querySelectorAll('[id]'))).forEach(function (n) { n.removeAttribute('id'); });
      copy.removeAttribute('loading');
      body.textContent = '';
      body.appendChild(copy);
      tEl.textContent = title || '';
      dEl.textContent = desc || '';
      opener = document.activeElement;
      lightboxOpen = true;
      updateCarousels();
      if (lenis) lenis.stop();
      dlg.showModal();
      body.scrollTop = 0; body.scrollLeft = 0;
    };
  })();

  if (lightbox) {
    document.querySelectorAll('.stage').forEach(function (stage) {
      var meta = stage.parentElement.querySelector('.slide-meta');
      function open() {
        var node = stage.querySelector('.slide.on img, .slide.on svg');
        if (!node) return;
        lightbox(node,
          meta && meta.querySelector('.t') ? meta.querySelector('.t').textContent : node.getAttribute('alt'),
          meta && meta.querySelector('.d') ? meta.querySelector('.d').textContent : '');
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zoom';
      b.innerHTML = ICON_EXPAND + '<span>Enlarge</span>';
      b.addEventListener('click', open);
      stage.appendChild(b);
      stage.classList.add('zoomable');
      stage.addEventListener('click', function (e) { if (e.target.closest('.slide')) open(); });
    });
  }

  /* ---------- carousels ----------
     Any number per page. Markup:
     <div class="stage" data-carousel>
       <div class="slides">
         <div class="slide on" data-grad="..." data-title="..." data-desc="..."><img ...></div>
       </div>
     </div>
     <div class="track"></div>
     <div class="slide-meta"><span class="t"></span><span class="d"></span></div>

     Rotation runs only while the carousel is on screen and the tab is visible.
     It holds while the pointer rests on it, stops for good once keyboard focus
     enters it, and has its own pause button. Reduced motion starts it stopped. */
  document.querySelectorAll('[data-carousel]').forEach(function (stage) {
    var wrap   = stage.parentElement;
    var holder = stage.querySelector('.slides');
    var slides = [].slice.call(stage.querySelectorAll('.slide'));
    var track  = wrap.querySelector('.track');
    var meta   = wrap.querySelector('.slide-meta');
    var tEl    = meta ? meta.querySelector('.t') : null;
    var dEl    = meta ? meta.querySelector('.d') : null;
    if (!slides.length || !track) return;

    var DUR = 5200;
    var idx = 0, elapsed = 0, last = 0, raf = 0;
    var stopped = reduced;
    var hovering = false;
    var onscreen = !('IntersectionObserver' in window);

    var proj = wrap.closest('.proj');
    var name = proj && proj.querySelector('h2') ? proj.querySelector('h2').textContent + ' screens' : 'Screens';
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-roledescription', 'carousel');
    stage.setAttribute('aria-label', name);
    slides.forEach(function (s, i) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
    });

    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', 'Choose a screen');
    var play = document.createElement('button');
    play.type = 'button';
    play.className = 'play';
    play.addEventListener('click', function () { stopped = !stopped; paint(); update(); });
    track.appendChild(play);

    var bars = slides.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bar';
      b.setAttribute('aria-label', 'Show screen ' + (i + 1) + ' of ' + slides.length +
        (s.dataset.title ? ': ' + s.dataset.title : ''));
      b.appendChild(document.createElement('span'));
      b.addEventListener('click', function () { go(i); });
      track.appendChild(b);
      return b;
    });

    function progress() { return stopped ? '100%' : (Math.min(1, elapsed / DUR) * 100).toFixed(2) + '%'; }

    function paint() {
      slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
      bars.forEach(function (b, i) {
        b.setAttribute('aria-current', i === idx ? 'true' : 'false');
        b.style.setProperty('--p', i === idx ? progress() : '0%');
      });
      var s = slides[idx];
      if (s.dataset.grad) stage.style.setProperty('--stage-grad', s.dataset.grad);
      if (tEl) tEl.textContent = s.dataset.title || '';
      if (dEl) dEl.textContent = s.dataset.desc || '';
      play.innerHTML = stopped ? ICON_PLAY : ICON_PAUSE;
      play.setAttribute('aria-label', stopped ? 'Play the slideshow' : 'Pause the slideshow');
      /* announce a change only when the visitor caused it */
      holder.setAttribute('aria-live', stopped ? 'polite' : 'off');
    }

    function go(i) {
      idx = (i + slides.length) % slides.length;
      elapsed = 0;
      paint();
    }

    function frame(now) {
      elapsed += Math.min(now - last, 100);
      last = now;
      if (elapsed >= DUR) go(idx + 1);
      else bars[idx].style.setProperty('--p', progress());
      raf = requestAnimationFrame(frame);
    }

    function update() {
      var run = !stopped && !hovering && onscreen && !document.hidden && !lightboxOpen;
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    carousels.push(update);

    stage.addEventListener('mouseenter', function () { hovering = true; update(); });
    stage.addEventListener('mouseleave', function () { hovering = false; update(); });

    /* keyboard focus inside stops rotation until the visitor presses play */
    wrap.addEventListener('focusin', function (e) {
      if (e.target === play || stopped) return;
      var keyboard = true;
      try { keyboard = e.target.matches(':focus-visible'); } catch (err) {}
      if (keyboard) { stopped = true; paint(); update(); }
    });

    track.addEventListener('keydown', function (e) {
      var i = bars.indexOf(e.target);
      if (i < 0) return;
      var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      go(i + step);
      bars[idx].focus();
    });

    /* swipe on touch screens */
    var x0 = null, y0 = 0;
    stage.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    if (!onscreen) {
      new IntersectionObserver(function (entries) {
        onscreen = entries[entries.length - 1].isIntersecting;
        update();
      }, { threshold: 0.2 }).observe(stage);
    }

    paint();
    update();
  });

  document.addEventListener('visibilitychange', updateCarousels);
})();
