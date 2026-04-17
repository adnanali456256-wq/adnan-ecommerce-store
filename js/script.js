/* ================================
   AADI FITNESS STORE — script.js
   ================================ */
'use strict';

/* ===== HERO FRAME-SEQUENCE ANIMATION ===== */
(function initHeroSequence() {
  const canvas = document.getElementById('hero-seq-canvas');
  if (!canvas) return;

  // ── Config ──────────────────────────────────────────────
  const FRAME_COUNT  = 80;
  const FRAME_DIR    = 'hero/';          // relative to index.html
  const FRAME_PREFIX = '_A_smooth,_cinematic_202604162308_';
  const FPS          = 24;              // target playback speed
  const PEAK_FRAME   = 32;             // widest explosion spread
  const MS_PER_FRAME = 1000 / FPS;

  // ── Build file-name list ─────────────────────────────────
  function frameSrc(i) {
    return FRAME_DIR + FRAME_PREFIX + String(i).padStart(3, '0') + '.jpg';
  }

  // ── Reduced-motion: show a single still, skip all looping ─
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas.getContext('2d');
  const frames = new Array(FRAME_COUNT).fill(null);
  let loaded = 0;
  let seqRAF  = null;
  let playing = true;         // toggled by IntersectionObserver
  let lastTS  = 0;
  let currentFrame = 0;

  // ── Resize canvas to fill its CSS box at device resolution ─
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
  }

  // Draw a single frame, scaled to cover (object-fit: cover behaviour)
  function drawFrame(img) {
    if (!img || !img.complete) return;
    const dpr   = window.devicePixelRatio || 1;
    const cW    = canvas.width  / dpr;
    const cH    = canvas.height / dpr;
    const iW    = img.naturalWidth  || img.width;
    const iH    = img.naturalHeight || img.height;
    const scale = Math.max(cW / iW, cH / iH);
    const dW    = iW * scale;
    const dH    = iH * scale;
    const dX    = (cW - dW) / 2;
    const dY    = (cH - dH) / 2;
    ctx.clearRect(0, 0, cW, cH);
    ctx.drawImage(img, dX, dY, dW, dH);
  }

  // ── RAF animation loop ───────────────────────────────────
  function animate(ts) {
    if (!playing) { seqRAF = requestAnimationFrame(animate); return; }

    const delta = ts - lastTS;
    if (delta >= MS_PER_FRAME) {
      lastTS = ts - (delta % MS_PER_FRAME);   // keep phase accurate
      const f = frames[currentFrame];
      if (f && f.complete) drawFrame(f);
      currentFrame = (currentFrame + 1) % FRAME_COUNT;
    }
    seqRAF = requestAnimationFrame(animate);
  }

  // ── Preload all frames ───────────────────────────────────
  function onFrameLoad(i) {
    loaded++;

    // Show the canvas as soon as the initial run of frames is ready
    // (first ~8 frames = ~330 ms buffer)  — prevents blank flash
    if (loaded === 8 && !reducedMotion) {
      resizeCanvas();
      drawFrame(frames[0]);
      canvas.classList.add('loaded');
      seqRAF = requestAnimationFrame(animate);
    }

    // Full preload done — nothing flickery will ever happen now
    if (loaded === FRAME_COUNT) {
      canvas.classList.add('loaded');   // idempotent
    }
  }

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.onload  = () => onFrameLoad(i);
    img.onerror = () => { loaded++; };   // skip missing frames gracefully
    img.src = frameSrc(i);
    frames[i] = img;
  }

  // ── Reduced-motion path: blit peak frame once it loads ───
  if (reducedMotion) {
    const peakImg = new Image();
    peakImg.onload = () => {
      resizeCanvas();
      drawFrame(peakImg);
      canvas.classList.add('loaded');
    };
    peakImg.src = frameSrc(PEAK_FRAME);
    return;                              // skip the RAF engine entirely
  }

  // ── Pause when hero is off-screen (saves GPU) ────────────
  if ('IntersectionObserver' in window) {
    const heroBgObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { playing = e.isIntersecting; });
    }, { threshold: 0.01 });
    heroBgObserver.observe(canvas.closest('.hero') || canvas);
  }

  // ── Re-size on window resize ─────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (seqRAF) cancelAnimationFrame(seqRAF);
      resizeCanvas();
      seqRAF = requestAnimationFrame(animate);
    }, 150);
  }, { passive: true });
})();



/* ===== PARTICLE BACKGROUND ===== */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['rgba(0,255,136,', 'rgba(0,229,255,', 'rgba(255,107,53,', 'rgba(255,230,0,'];

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.r  = Math.random() * 2 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.a  = Math.random() * 0.55 + 0.1;
      this.c  = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.c + this.a + ')';
      ctx.fill();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  // Draw connecting lines
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,255,136,${0.04 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ===== NAVBAR ===== */
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('back-top');

window.addEventListener('scroll', () => {
  if (navbar)  navbar.classList.toggle('scrolled', window.scrollY > 60);
  if (backTop) backTop.classList.toggle('show',    window.scrollY > 500);
}, { passive: true });

/* ===== HAMBURGER ===== */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', e => {
    if (navbar && !navbar.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    }
  });
}

/* ===== BACK TO TOP ===== */
if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ===== SMOOTH SCROLL ===== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const off = (document.getElementById('navbar')?.offsetHeight || 72) + 16;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
  });
});

/* ===== CART COUNTER ===== */
let cartCount = 0;
const cartEl = document.getElementById('cart-count');
function updateCart(n) {
  cartCount += n;
  if (cartEl) { cartEl.textContent = cartCount; cartEl.style.display = cartCount > 0 ? 'flex' : 'none'; }
}
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.product || 'Product';
    updateCart(1);
    const orig = btn.innerHTML;
    btn.innerHTML = '<iconify-icon icon="mdi:check-circle"></iconify-icon> Added!';
    btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
  });
});

/* ===== COUNTER ANIMATION ===== */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  if (isNaN(target)) return;
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isFloat = String(target).includes('.');
  const dur = 1800; const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    const v = target * (1 - Math.pow(1 - p, 3));
    el.textContent = prefix + (isFloat ? v.toFixed(1) : Math.floor(v).toLocaleString()) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if ('IntersectionObserver' in window) {
  const co = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); co.unobserve(e.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-counter]').forEach(el => co.observe(el));
} else {
  document.querySelectorAll('[data-counter]').forEach(animateCounter);
}

/* ===== FAQ ACCORDION ===== */
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  if (!q) return;
  q.setAttribute('tabindex', '0');
  q.setAttribute('role', 'button');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); q.click(); }
  });
});

/* ===== ORDER FORM → WHATSAPP ===== */
const orderForm = document.getElementById('order-form');
if (orderForm) {
  orderForm.addEventListener('submit', e => {
    e.preventDefault();
    const name    = (document.getElementById('of-name')?.value    || '').trim();
    const phone   = (document.getElementById('of-phone')?.value   || '').trim();
    const address = (document.getElementById('of-address')?.value || '').trim();
    const product = (document.getElementById('of-product')?.value || '').trim();
    const qty     = (document.getElementById('of-qty')?.value     || '1').trim();
    const note    = (document.getElementById('of-note')?.value    || '').trim();

    if (!name || !phone || !address || !product) {
      alert('Please fill in all required fields.');
      return;
    }

    const msg = [
      `🏋️ *New Order — Aadi Fitness Store*`,
      ``,
      `👤 *Name:* ${name}`,
      `📞 *Phone:* ${phone}`,
      `📍 *Address:* ${address}`,
      ``,
      `🛒 *Product:* ${product}`,
      `🔢 *Quantity:* ${qty}`,
      note ? `📝 *Note:* ${note}` : '',
      ``,
      `✅ Please confirm my order. Thank you!`
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(msg);
    const waURL   = `https://wa.me/923139424383?text=${encoded}`;
    window.open(waURL, '_blank', 'noopener,noreferrer');
    orderForm.reset();
  });
}

/* ===== YEAR ===== */
const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();
