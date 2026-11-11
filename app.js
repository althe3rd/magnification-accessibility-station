/* Magnification Station: interactive demos */
(() => {
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ───────────── Station 1: magnifier lens ───────────── */
  const DESIGN_W = 960, DESIGN_H = 600;
  const stage = $('#lens-stage');
  const mock = $('#mock');
  const view = $('#minimap-view');
  const visibleOut = $('#lens-visible');
  const note = $('#lens-note');

  let k = 3, fx = 0.62, fy = 0.6; // start near the Add to cart button
  let variant = 'bad';
  let cart = 0;
  let toastTimer;

  function renderLens() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const fit = W / DESIGN_W;
    // Full-screen magnifier model: the point under the pointer stays under the pointer.
    const ox = fx * (W * k - W);
    const oy = fy * (H * k - H);
    mock.style.transform = `translate(${-ox}px, ${-oy}px) scale(${fit * k})`;

    const size = 100 / k;
    view.style.width = size + '%';
    view.style.height = size + '%';
    view.style.left = fx * (100 - size) + '%';
    view.style.top = fy * (100 - size) + '%';
    visibleOut.textContent = Math.round(100 / (k * k)) + '%';
  }

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    fx = clamp((e.clientX - r.left) / r.width);
    fy = clamp((e.clientY - r.top) / r.height);
    renderLens();
  });

  stage.addEventListener('keydown', (e) => {
    if (e.target !== stage) return;
    const step = e.shiftKey ? 0.15 : 0.05;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    fx = clamp(fx + m[0]);
    fy = clamp(fy + m[1]);
    renderLens();
  });

  // Focus tracking, like real magnifiers: pan to whatever receives keyboard focus.
  mock.addEventListener('focusin', (e) => {
    const s = mock.getBoundingClientRect().width / DESIGN_W; // current visual scale
    const mr = mock.getBoundingClientRect();
    const er = e.target.closest('label, button, a')?.getBoundingClientRect() || e.target.getBoundingClientRect();
    fx = clamp(((er.left + er.width / 2) - mr.left) / s / DESIGN_W);
    fy = clamp(((er.top + er.height / 2) - mr.top) / s / DESIGN_H);
    renderLens();
    stage.scrollTop = 0; stage.scrollLeft = 0; // stop the browser's own scroll-into-view
  });
  stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });

  function setZoom(value) {
    k = Number(value);
    const radio = $(`input[name="lens-zoom"][value="${value}"]`);
    if (radio) radio.checked = true;
    renderLens();
  }
  $$('input[name="lens-zoom"]').forEach((r) => r.addEventListener('change', () => setZoom(r.value)));

  function resetShop() {
    cart = 0;
    $('#m-cart-count').textContent = '0';
    $('#m-banner').hidden = true;
    $('#m-toast').hidden = true;
    $('#m-inline-error').hidden = true;
    $('#m-status').textContent = '';
    $('#m-sizes').classList.remove('invalid');
    $$('input[name="m-size"]').forEach((r) => (r.checked = false));
    clearTimeout(toastTimer);
  }

  const notes = {
    bad: '<p><strong>What to notice:</strong> in the fragile design the error banner appears at the top of the page, and the confirmation pops up in the far corner, then fades away.</p>',
    good: '<p><strong>What to notice:</strong> the error and the confirmation both appear right beside the button, where your eyes already are. The confirmation also stays put and is announced to screen readers.</p>',
  };

  $$('input[name="lens-variant"]').forEach((r) =>
    r.addEventListener('change', () => {
      variant = r.value;
      mock.dataset.variant = variant;
      resetShop();
      note.innerHTML = notes[variant];
    })
  );

  $('#m-add').addEventListener('click', () => {
    const size = $('input[name="m-size"]:checked', mock);
    const sizes = $('#m-sizes');
    if (variant === 'bad') {
      if (!size) { $('#m-banner').hidden = false; return; }
      $('#m-banner').hidden = true;
      cart++;
      const count = $('#m-cart-count');
      count.textContent = cart;
      count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump');
      const toast = $('#m-toast');
      toast.hidden = false;
      toast.classList.remove('fade'); void toast.offsetWidth; toast.classList.add('fade');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
    } else {
      if (!size) {
        $('#m-inline-error').hidden = false;
        sizes.classList.add('invalid');
        $('#m-status').textContent = 'Choose a size to continue.';
        return;
      }
      $('#m-inline-error').hidden = true;
      sizes.classList.remove('invalid');
      cart++;
      $('#m-cart-count').textContent = cart;
      $('#m-status').innerHTML = `✓ Added size ${size.value}. Your cart has ${cart} item${cart === 1 ? '' : 's'}. <a href="#lens" tabindex="-1">View cart</a>`;
    }
  });
  $$('input[name="m-size"]').forEach((r) => r.addEventListener('change', () => {
    if (variant === 'good') { $('#m-inline-error').hidden = true; $('#m-sizes').classList.remove('invalid'); $('#m-status').textContent = ''; }
  }));

  $('#lens-reveal').addEventListener('click', () => setZoom(1));

  new ResizeObserver(renderLens).observe(stage);
  renderLens();

  /* ───────────── Station 2: reflow at 400% ───────────── */
  const ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  const WINDOW_W = 1280, WINDOW_H = 800; // the simulated laptop browser window, in CSS px at 100%
  const rfStage = $('#rf-stage');
  const rfViewport = $('#rf-viewport');
  const rfSite = $('#rf-site');
  const rfRange = $('#rf-zoom');
  const rfOut = $('#rf-zoom-out');
  const verdict = $('#rf-verdict');
  const supportsZoom = 'zoom' in document.documentElement.style;

  function renderReflow() {
    const Z = ZOOMS[Number(rfRange.value)];
    const display = rfStage.clientWidth / WINDOW_W; // shrink the whole window to fit the page
    const cssW = WINDOW_W / Z, cssH = WINDOW_H / Z;  // the layout viewport the site actually gets
    rfViewport.style.width = cssW + 'px';
    rfViewport.style.height = cssH + 'px';
    if (supportsZoom) {
      rfViewport.style.zoom = Z * display;
      rfViewport.style.transform = '';
    } else {
      rfViewport.style.transformOrigin = '0 0';
      rfViewport.style.transform = `scale(${Z * display})`;
    }
    const pct = Math.round(Z * 100) + '%';
    rfOut.textContent = pct;
    rfRange.setAttribute('aria-valuetext', `${pct}, about a ${Math.round(cssW)} pixel wide layout`);

    requestAnimationFrame(() => {
      const overflow = rfViewport.scrollWidth - rfViewport.clientWidth > 2;
      const w = Math.round(cssW);
      verdict.dataset.ok = String(!overflow);
      verdict.textContent = overflow
        ? `✗ At ${pct} the page is ${w} CSS px wide, but this layout needs ${Math.round(rfViewport.scrollWidth)} px. Readers must scroll sideways to finish every line.`
        : `✓ At ${pct} the page is ${w} CSS px wide, and everything fits. No horizontal scrolling.`;
    });
  }

  rfRange.addEventListener('input', renderReflow);
  $$('input[name="rf-variant"]').forEach((r) =>
    r.addEventListener('change', () => { rfSite.dataset.variant = r.value; rfViewport.scrollTo(0, 0); renderReflow(); })
  );
  new ResizeObserver(renderReflow).observe(rfStage);
  renderReflow();

  /* ───────────── Station 3: text size ───────────── */
  const txRoot = $('#tx-root');
  $$('input[name="tx-size"]').forEach((r) =>
    r.addEventListener('change', () => txRoot.style.setProperty('--tx', r.value))
  );
})();
