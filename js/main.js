/* ============================================================
   蔚律之都 VERIDIAN CODEX — Main Script
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Scroll Reveal ---------- */
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('v'); });
  }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll('.rv,.rv-l,.rv-r,.rv-s,.sec-hd').forEach(el => obs.observe(el));

  /* ---------- Scroll: progress + nav + parallax ---------- */
  const prog = document.getElementById('prog');
  const nav = document.getElementById('nav');
  const navAs = document.querySelectorAll('.nav-links a');
  const secs = document.querySelectorAll('section[id]');
  const hBg = document.getElementById('hBg');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - innerHeight;
        prog.style.width = (scrollY / total * 100) + '%';
        nav.classList.toggle('scrolled', scrollY > 80);

        let cur = '';
        secs.forEach(s => { if (scrollY >= s.offsetTop - 150) cur = s.id; });
        navAs.forEach(a => a.classList.toggle('act', a.getAttribute('href') === '#' + cur));

        if (scrollY < innerHeight) {
          hBg.style.transform = 'scale(1.06) translateY(' + (scrollY * 0.22) + 'px)';
        }
        ticking = false;
      });
      ticking = true;
    }
  });

  /* ---------- Mobile Nav ---------- */
  document.getElementById('mobT').onclick = () => {
    document.getElementById('navL').classList.toggle('open');
  };
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.onclick = () => document.getElementById('navL').classList.remove('open');
  });

  /* ---------- Load Data & Build Dynamic Sections ---------- */
  fetch('data/site.json')
    .then(r => r.json())
    .then(data => {
      buildCharacters(data.characters);
      buildGallery(data.gallery);
    })
    .catch(() => {
      // Fallback: content already in HTML from server-side or static build
    });

  function buildCharacters(chars) {
    const tabsEl = document.getElementById('cTabs');
    const displayEl = document.getElementById('cDisplay');
    if (!tabsEl || !displayEl || !chars) return;

    tabsEl.innerHTML = '';
    displayEl.innerHTML = '';

    chars.forEach((ch, i) => {
      // Tab
      const btn = document.createElement('button');
      btn.className = 'c-tab' + (i === 0 ? ' act' : '');
      btn.dataset.t = ch.id;
      btn.dataset.c = ch.color;
      btn.innerHTML = ch.name + '<span class="sub">' + ch.en + '</span>';
      tabsEl.appendChild(btn);

      // Card
      const card = document.createElement('div');
      card.className = 'c-card' + (i === 0 ? ' act' : '');
      card.id = ch.id;
      if (ch.color !== 'gray') card.dataset.b = ch.color;
      card.innerHTML =
        '<img src="' + ch.img + '" alt="' + ch.name + '"' + (i > 0 ? ' loading="lazy"' : '') + '>' +
        '<div class="c-desc"><p>' + ch.desc + '</p></div>';
      displayEl.appendChild(card);
    });

    initCharTabs();
  }

  function buildGallery(items) {
    const grid = document.getElementById('gGrid');
    if (!grid || !items) return;

    grid.innerHTML = '';
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'g-item rv d' + (i + 1);
      div.onclick = function () { openLB(this); };
      div.innerHTML =
        '<img src="' + item.src + '" alt="' + item.alt + '" loading="lazy">' +
        '<div class="scan-overlay"></div>';
      grid.appendChild(div);
      obs.observe(div);
    });
  }

  /* ---------- Character Tabs ---------- */
  function initCharTabs() {
    document.querySelectorAll('.c-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.c-tab').forEach(t => t.classList.remove('act'));
        document.querySelectorAll('.c-card').forEach(c => c.classList.remove('act'));
        tab.classList.add('act');
        document.getElementById(tab.dataset.t).classList.add('act');
      };
    });
  }

  /* ---------- Lightbox ---------- */
  window.openLB = function (el) {
    document.getElementById('lbi').src = el.querySelector('img').src;
    document.getElementById('lb').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeLB = function (e) {
    if (e.target.id === 'lb' || e.target.closest('.lb-x')) {
      document.getElementById('lb').classList.remove('open');
      document.body.style.overflow = '';
    }
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('lb').classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  /* ---------- Floating Decorations ---------- */
  (function () {
    const c = document.getElementById('bgDecor');
    if (!c) return;

    // Diamonds
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('div');
      d.className = 'diamond';
      const size = 5 + Math.random() * 12;
      d.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + (Math.random() * 100) + '%;' +
        'animation-duration:' + (20 + Math.random() * 30) + 's;' +
        'animation-delay:' + (Math.random() * 20) + 's;';
      if (Math.random() > 0.5) d.style.borderColor = 'rgba(155,122,255,0.03)';
      c.appendChild(d);
    }

    // Data streams
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('div');
      s.className = 'data-stream';
      s.style.cssText =
        'left:' + (5 + Math.random() * 90) + '%;' +
        'height:' + (60 + Math.random() * 120) + 'px;' +
        'animation-duration:' + (12 + Math.random() * 18) + 's;' +
        'animation-delay:' + (Math.random() * 15) + 's;';
      c.appendChild(s);
    }
  })();

  /* ---------- Hero Logo Glitch (periodic) ---------- */
  const heroLogo = document.querySelector('.hero-logo');
  if (heroLogo) {
    setInterval(() => {
      heroLogo.classList.add('glitch');
      setTimeout(() => heroLogo.classList.remove('glitch'), 200);
    }, 6000 + Math.random() * 4000);
  }

  /* ---------- Age Gate ---------- */
  window.ageConfirm = function () {
    document.getElementById('ag').classList.add('hide');
  };
  window.ageReject = function () {
    window.location.href = 'about:blank';
  };

})();
