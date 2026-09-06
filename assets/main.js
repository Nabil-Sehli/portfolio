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

  /* ---------- carousels ----------
     Any number per page. Markup:
     <div class="stage" data-carousel>
       <div class="slides">
         <div class="slide on" data-grad="..." data-title="..." data-desc="..."><img ...></div>
       </div>
     </div>
     <div class="track"></div>
     <div class="slide-meta"><span class="t"></span><span class="d"></span></div>
  */
  document.querySelectorAll('[data-carousel]').forEach(function (stage) {
    var wrap   = stage.parentElement;
    var slides = [].slice.call(stage.querySelectorAll('.slide'));
    var track  = wrap.querySelector('.track');
    var meta   = wrap.querySelector('.slide-meta');
    var tEl    = meta ? meta.querySelector('.t') : null;
    var dEl    = meta ? meta.querySelector('.d') : null;
    if (!slides.length || !track) return;

    var idx = 0;
    var DUR = 5200;
    var startedAt = 0;
    var paused = false;

    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Show image ' + (i + 1) + ' of ' + slides.length);
      b.appendChild(document.createElement('span'));
      b.addEventListener('click', function () { go(i); });
      track.appendChild(b);
    });
    var bars = [].slice.call(track.children);

    function paint() {
      slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
      bars.forEach(function (b, i) {
        b.setAttribute('aria-current', i === idx ? 'true' : 'false');
        if (i !== idx) b.style.setProperty('--p', i < idx ? '100%' : '0%');
      });
      var s = slides[idx];
      if (s.dataset.grad) stage.style.setProperty('--stage-grad', s.dataset.grad);
      if (tEl) tEl.textContent = s.dataset.title || '';
      if (dEl) dEl.textContent = s.dataset.desc || '';
    }

    function go(i) {
      idx = (i + slides.length) % slides.length;
      startedAt = performance.now();
      paint();
    }

    paint();

    if (reduced) {
      bars[0].style.setProperty('--p', '100%');
      return;
    }

    startedAt = performance.now();
    requestAnimationFrame(function frame(now) {
      if (paused) {
        // hold the bar where it is while the pointer rests on the stage
        startedAt = now - Math.min(now - startedAt, DUR * 0.999);
      }
      var p = Math.min(1, (now - startedAt) / DUR);
      bars[idx].style.setProperty('--p', (p * 100).toFixed(2) + '%');
      if (!paused && p >= 1) go(idx + 1);
      requestAnimationFrame(frame);
    });

    stage.addEventListener('mouseenter', function () { paused = true; });
    stage.addEventListener('mouseleave', function () { paused = false; });
  });
})();
