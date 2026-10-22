(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  $('[data-year]').textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };

  /* ---------- Theme & accent ---------- */
  const setTheme = (t) => {
    root.dataset.theme = t;
    store.set('theme', t);
    $('meta[name="theme-color"]').content = t === 'light' ? '#F6F5F1' : '#0F1114';
  };
  const toggleTheme = () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
  $('[data-theme-toggle]').addEventListener('click', toggleTheme);

  const ACCENTS = { Sky: '#8BD3FF', Amber: '#F5B26B', Lime: '#B9E769', Lilac: '#C4A7FF' };
  const setAccent = (name) => {
    root.style.setProperty('--accent', ACCENTS[name]);
    store.set('accent', ACCENTS[name]);
    toast(`Accent → ${name}`);
  };

  /* ---------- Hero headline: word-by-word reveal ---------- */
  const title = $('[data-split]');
  const splitWords = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          w.append(inner); frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) splitWords(child);
    });
  };
  splitWords(title);
  $$('.w > span', title).forEach((s, i) => (s.style.transitionDelay = `${i * 45}ms`));
  requestAnimationFrame(() => setTimeout(() => title.classList.add('is-in'), 80));

  /* ---------- Scroll reveal + staggering ---------- */
  const groups = ['.cards', '.skills', '.metrics__grid', '.hero__copy', '.flow', '.notes'];
  groups.forEach((g) => $$(`${g} > .reveal`).forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`)));
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealIO.observe(el));

  /* ---------- Count-up metrics ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const dur = reduced ? 0 : 1600;
      const t0 = performance.now();
      const tick = (t) => {
        const p = dur ? Math.min(1, (t - t0) / dur) : 1;
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = (end * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Scroll progress, active nav, timeline fill ---------- */
  const bar = $('.progress span');
  const timeline = $('[data-timeline]');
  const navLinks = $$('[data-nav]');
  const sections = navLinks.map((a) => $(a.getAttribute('href')));
  let ticking = false;
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;

    const r = timeline.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
    timeline.style.setProperty('--tl', p);

    let current = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === current));
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Custom cursor + magnetic buttons ---------- */
  if (finePointer && !reduced) {
    const cursor = $('.cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('is-on'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    const loop = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .card, [data-tilt]'));
    });

    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => (btn.style.transform = ''));
    });

    // 3D tilt for the phone
    const tiltWrap = $('[data-tilt]');
    const phone = $('.phone', tiltWrap);
    tiltWrap.addEventListener('mousemove', (e) => {
      const r = tiltWrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`;
    });
    tiltWrap.addEventListener('mouseleave', () => (phone.style.transform = ''));
  }

  /* ---------- Cursor spotlight on cards ---------- */
  const spot = (el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
  $$('.card, [data-spotlight]').forEach(spot);

  /* ---------- BLE pairing demo ---------- */
  const bleBtn = $('[data-ble-btn]');
  const bleLog = $('[data-ble-log]');
  const bleChip = $('[data-ble-chip]');
  const radar = $('[data-radar]');
  const log = (text, cls) => {
    const d = document.createElement('div');
    d.textContent = `> ${text}`;
    if (cls) d.className = cls;
    bleLog.append(d);
    while (bleLog.children.length > 6) bleLog.firstChild.remove();
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  let paired = false;
  bleBtn.addEventListener('click', async () => {
    if (paired) {
      paired = false;
      radar.classList.remove('is-ok');
      bleChip.className = 'chip'; bleChip.textContent = 'Idle';
      bleBtn.textContent = 'Pair device';
      log('disconnected');
      return;
    }
    bleBtn.disabled = true;
    bleChip.className = 'chip is-scan'; bleChip.textContent = 'Scanning';
    radar.classList.add('is-scan');
    log('scanning for devices…');
    await wait(900);
    log('found  BP-Monitor-0A3F');
    await wait(600);
    log('connect timeout — retry 1/3', 'warn');
    await wait(800);
    log('auto-reconnect…');
    await wait(700);
    log('bonded · services discovered', 'ok');
    radar.classList.remove('is-scan');
    radar.classList.add('is-ok');
    bleChip.className = 'chip is-ok'; bleChip.textContent = 'Connected';
    bleBtn.disabled = false;
    bleBtn.textContent = 'Disconnect';
    paired = true;
  });

  /* ---------- Project filters ---------- */
  const filters = $$('[data-filter]');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
    $$('.card').forEach((card) => {
      const show = f === 'all' || card.dataset.cat.split(' ').includes(f);
      card.classList.toggle('is-hidden', !show);
    });
  }));

  /* ---------- Project modal ---------- */
  const PROJECTS = {
    sathi: {
      play: 'https://play.google.com/store/apps/details?id=com.samplify.pheblo',
      ios: 'https://apps.apple.com/in/app/samplify-phlebo/id6654902760',
      title: 'Samplify Sathi', platforms: 'iOS · Android · Gosamplify',
      desc: 'Field-force app for phlebotomists who collect blood samples at patients\' homes, used by thousands of concurrent users.',
      meta: { Role: 'Lead React Native engineer', Scope: 'Architecture → release → monitoring', Since: 'Jan 2024' },
      outcomes: [['90%', 'faster BLE pairing'], ['99.51%', 'crash-free sessions'], ['Same day', 'hotfixes over the air']],
      problem: 'Phlebotomists pair Bluetooth medical devices, scan samples and capture handover proof at the patient\'s door, often on low-end Android phones with aggressive battery savers and patchy networks. Pairing failures used to stall a visit, and the staff using the app can\'t debug Bluetooth themselves.',
      build: [
        'A reusable BLE layer over react-native-ble-manager / ble-plx: scan, connect with a timeout, retry automatically, then fall back to manual pairing. Screens use it through a single hook.',
        'Swift and Kotlin native modules for Bluetooth state, permissions and background tasks.',
        'Background sync with react-native-background-fetch, so pending work uploads once the phone is back online.',
        'VisionCamera barcode scanning for sample IDs, plus signature capture and PDF generation for handover proof.',
        'FCM and Notifee notifications, and self-hosted OTA updates with Hot Updater on Firebase.',
      ],
      decisions: [
        ['Retry automatically, then let the user take over', 'Retrying silently forever is worse than a clear manual option. Staff always know what to do next.'],
        ['One BLE module, not Bluetooth calls in every screen', 'Device quirks get fixed in one place, and screens only deal with a small set of states.'],
        ['JS changes over the air, native changes through the stores', 'Updates are tied to the app version, so a bundle never reaches a binary it doesn\'t work with.'],
      ],
      tags: ['React Native', 'BLE', 'Swift', 'Kotlin', 'VisionCamera', 'Firebase', 'Redux', 'Hot Updater'],
    },
    sarthi: {
      play: 'https://play.google.com/store/apps/details?id=com.samplify&hl=en-IN',
      ios: 'https://apps.apple.com/in/app/sarthi-runner/id6566180771',
      title: 'Samplify Sarthi', platforms: 'iOS · Android · Gosamplify',
      desc: 'Runner app for moving samples from collection points to labs, with live location, task flow and proof of handover.',
      meta: { Role: 'Lead React Native engineer', Stack: 'RN 0.84 · React 19 · New Architecture', Since: 'Jan 2024' },
      outcomes: [['99.51%', 'crash-free sessions'], ['~70%', 'faster release cycles'], ['8', 'services re-routable remotely']],
      problem: 'Runners are on the move all day. Background location has to survive Android\'s battery limits, networks drop in transit, and on some phones the GPS silently hangs: the app looks fine while location data goes stale. Every backend migration also needed a new store release.',
      build: [
        'Background location tracking with a foreground service (react-native-background-actions) and a step-by-step location permission flow.',
        'A GPS health monitor that wraps getCurrentPosition once, rules out settings causes, then requests a fix from the fused provider and the raw LocationManager at the same time to confirm a hung GPS. Covered by Jest tests.',
        'Firebase Remote Config routing for 8 backend services, with validation, last-known-good values and local defaults to fall back on.',
        'A Kotlin native module that autofills OTPs using Android\'s SMS Retriever and User Consent APIs.',
        'Redux with redux-persist and versioned migrations, so updating the app never crashes on old saved state.',
        'An OTA deploy guard that blocks any bundle without Sentry, plus one-command rollback.',
      ],
      decisions: [
        ['Detect GPS failure from behaviour, not settings', 'Nothing in the phone\'s settings shows a hung GPS. Only repeated failed fixes reveal it.'],
        ['Never trust a remote config value blindly', 'Validate it and fall back, so one bad value can\'t take the whole fleet offline.'],
        ['Guard the release, not just the code', 'An OTA bundle without crash reporting fails silently, so the deploy script refuses to ship one.'],
      ],
      tags: ['React Native 0.84', 'Kotlin', 'Swift', 'Background location', 'Remote Config', 'Sentry', 'Hot Updater', 'Jest'],
    },
    phelans: {
      play: 'https://play.google.com/store/apps/details?id=com.phelans&hl=en-IN',
      title: 'Phelans Pharmacy', platforms: 'Android · Appinventiv',
      desc: 'Production healthcare e-commerce app for medicine delivery.',
      meta: { Role: 'React Native engineer', Team: 'Appinventiv product team', When: '2022 to 2023' },
      outcomes: [['1000s', 'of SKUs in the catalog'], ['0', 'performance regressions from the state redesign']],
      problem: 'With thousands of SKUs, the cart, profile and inventory screens had to stay fast. An ageing class-component codebase made changes slow and risky.',
      build: [
        'Redux Toolkit state for cart, profile and inventory, using normalised data and memoised selectors so long lists stay smooth.',
        'Moved class components to function components and custom hooks, one feature at a time.',
        'Core shopping features against a Firestore-backed catalog.',
      ],
      decisions: [
        ['Migrate one feature at a time, not all at once', 'Features kept shipping during the migration, and each step could be reviewed on its own.'],
      ],
      tags: ['Redux Toolkit', 'Firestore', 'Hooks'],
    },
    lokbest: {
      play: 'https://play.google.com/store/apps/details?id=com.lokbest&hl=en-IN',
      ios: 'https://apps.apple.com/in/app/lokbest/id1571909931',
      title: 'LokBest', platforms: 'iOS · Android · Allin Info Systems',
      desc: 'Grocery commerce app.',
      meta: { Role: 'Mobile owner (iOS & Android)', When: '2023' },
      problem: 'Signing up took too many steps, and the team couldn\'t see how users moved through the app.',
      build: [
        'Google and Facebook OAuth sign-in to improve login success.',
        'Firebase Analytics events, named and structured together with the product team.',
      ],
      decisions: [
        ['Agree analytics event names before writing code', 'Product and engineering use the same event names, so the dashboards answer real questions.'],
      ],
      tags: ['OAuth', 'Firebase Analytics'],
    },
    swagmee: {
      play: 'https://play.google.com/store/apps/details?id=com.swagmee&hl=en-IN',
      title: 'Swagmee Salon', platforms: 'Android · Allin Info Systems',
      desc: 'At-home salon services platform.',
      meta: { Role: 'Mobile owner', When: '2023' },
      problem: 'Booking and paying for at-home services needed a smooth checkout that customers could trust.',
      build: [
        'End-to-end Razorpay payments, including success, failure and retry states.',
        'Google and Facebook OAuth sign-in.',
        'Pixel-perfect UI built from Figma.',
      ],
      tags: ['Razorpay', 'OAuth', 'Figma → RN'],
    },
  };
  const modal = $('[data-modal]');
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const openProject = (id) => {
    const p = PROJECTS[id];
    if (!p) return;
    $('[data-m-title]', modal).textContent = p.title;
    $('[data-m-platforms]', modal).textContent = p.platforms;
    $('[data-m-desc]', modal).textContent = p.desc;
    $('[data-m-meta]', modal).replaceChildren(...Object.entries(p.meta || {}).map(([k, v]) => el('div', {}, el('dt', { textContent: k }), el('dd', { textContent: v }))));
    const outcomes = $('[data-m-outcomes]', modal);
    outcomes.hidden = !p.outcomes;
    outcomes.replaceChildren(...(p.outcomes || []).map(([v, l]) => el('div', { className: 'outcome' }, el('strong', { textContent: v }), el('span', { textContent: l }))));
    $('[data-m-problem]', modal).textContent = p.problem;
    $('[data-m-build]', modal).replaceChildren(...p.build.map((t) => el('li', { textContent: t })));
    $('[data-m-decisions-wrap]', modal).hidden = !p.decisions;
    $('[data-m-decisions]', modal).replaceChildren(...(p.decisions || []).map(([d, why]) => el('li', {}, el('strong', { textContent: d }), el('span', { textContent: why }))));
    const tags = $('[data-m-tags]', modal);
    tags.replaceChildren(...p.tags.map((t) => el('span', { textContent: t })));
    const stores = $('[data-m-stores]', modal);
    const mk = (href, label) => el('a', { href, textContent: label, className: 'btn btn--small', target: '_blank', rel: 'noopener' });
    stores.replaceChildren(...[p.play && mk(p.play, 'Get it on Google Play ↗'), p.ios && mk(p.ios, 'Download on the App Store ↗')].filter(Boolean));
    modal.showModal();
    modal.scrollTop = 0;
  };
  $$('[data-open-project]').forEach((b) => b.addEventListener('click', () => openProject(b.dataset.openProject)));
  $('[data-close]', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  /* ---------- Experience accordion ---------- */
  $$('.job__head').forEach((head) => head.addEventListener('click', () => {
    const job = head.parentElement;
    const open = !job.classList.contains('is-open');
    job.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open);
  }));

  /* ---------- Copy email ---------- */
  const copyEmail = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Email copied to clipboard'); }
    catch (e) { toast(text); }
  };
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyEmail(b.dataset.copy)));

  /* ---------- Command palette (⌘K / Ctrl+K) ---------- */
  const palette = $('[data-palette]');
  const input = $('[data-palette-input]');
  const list = $('[data-palette-list]');
  const go = (sel) => () => $(sel).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const COMMANDS = [
    { label: 'Go to work', hint: 'section', run: go('#work') },
    { label: 'Go to how I work', hint: 'section', run: go('#process') },
    { label: 'Go to engineering notes', hint: 'section', run: go('#notes') },
    { label: 'Go to experience', hint: 'section', run: go('#experience') },
    { label: 'Go to skills', hint: 'section', run: go('#skills') },
    { label: 'Go to contact', hint: 'section', run: go('#contact') },
    { label: 'Copy email address', hint: 'action', run: () => copyEmail('kayyoomali17@gmail.com') },
    { label: 'Send an email', hint: 'action', run: () => (location.href = 'mailto:kayyoomali17@gmail.com') },
    { label: 'Download résumé', hint: 'action', run: () => $('a[download]').click() },
    { label: 'Open LinkedIn', hint: 'link', run: () => open('https://www.linkedin.com/in/kayyoom-ali-bb989319b/', '_blank', 'noopener') },
    { label: 'Open GitHub', hint: 'link', run: () => open('https://github.com/techAli17', '_blank', 'noopener') },
    { label: 'Toggle light / dark theme', hint: 'theme', run: toggleTheme },
    ...Object.entries(ACCENTS).map(([name, hex]) => ({ label: `Accent: ${name}`, hint: 'theme', swatch: hex, run: () => setAccent(name) })),
    ...Object.entries(PROJECTS).map(([id, p]) => ({ label: `Case study: ${p.title}`, hint: 'project', run: () => openProject(id) })),
  ];
  let filtered = COMMANDS, sel = 0;
  const render = () => {
    list.replaceChildren(...filtered.map((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === sel);
      const label = document.createElement('span');
      if (c.swatch) {
        const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = c.swatch; label.append(sw);
      }
      label.append(c.label);
      const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = c.hint;
      li.append(label, hint);
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; render(); } });
      li.addEventListener('click', () => runCmd(c));
      return li;
    }));
    const active = list.children[sel];
    if (active) active.scrollIntoView({ block: 'nearest' });
  };
  const runCmd = (c) => { palette.close(); setTimeout(c.run, 50); };
  const openPalette = () => {
    if (modal.open) modal.close();
    input.value = ''; filtered = COMMANDS; sel = 0; render();
    palette.showModal(); input.focus();
  };
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.hint.includes(q));
    sel = 0; render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, filtered.length); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
    else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); runCmd(filtered[sel]); }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
  $$('[data-open-palette]').forEach((b) => b.addEventListener('click', openPalette));
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.open ? palette.close() : openPalette();
    }
  });
})();
