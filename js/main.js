/* ============================================
   ANDERSON & DESIGNS - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initPageLoader();
    initSmoothScroll();
    initHeroPin();
    initHeroTagline();
    initHeroBgFade();
    initNavbar();
    initSocial();
    initOutro();
    initWorkTags();
    initWorkFilters();
    initCtaExpand();
    initParallax();
    initCtaSpark();
    initScrollAnimations();
    initMobileMenu();
    initSlidingPortfolio();
    initCardParallax();
    // initContactForm(); // Disabled - using EmailJS in contact.html instead
});

/* ============================================
   Smooth (inertial) Scrolling - Lenis
   ============================================ */
function initSmoothScroll() {
    // Honour reduced-motion: leave native scrolling untouched.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
    script.onload = function() {
        if (typeof window.Lenis === 'undefined') return;

        var lenis = new window.Lenis({
            lerp: 0.1,            // lower = smoother / more drift
            wheelMultiplier: 1,
            smoothWheel: true
            // smoothTouch defaults off - phones keep their native scroll
        });
        window.lenis = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Route same-page anchor jumps through Lenis so they glide too.
        document.querySelectorAll('a[href^="#"]').forEach(function(a) {
            a.addEventListener('click', function(e) {
                var id = a.getAttribute('href');
                if (id.length < 2) return;
                var target = document.querySelector(id);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: -80 });
            });
        });
    };
    document.head.appendChild(script);
}

/* ============================================
   Hero Pin - delayed scroll before the content
   below the hero. Desktop + motion only.
   ============================================ */
function initHeroPin() {
    const pin = document.querySelector('.hero-pin');
    if (!pin || !window.matchMedia) return;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const html = document.documentElement;

    const apply = () => {
        const on = fine.matches && !reduce.matches &&
            !html.classList.contains('liquid-hero-reduced');
        if (on === html.classList.contains('has-hero-pin')) return;

        // Toggling the pin changes the page height by ~1 viewport, which
        // would shove the scroll position. Measure the delta and keep the
        // same content parked under the viewport.
        const before = pin.offsetHeight;
        html.classList.toggle('has-hero-pin', on);
        const delta = pin.offsetHeight - before;

        if (delta !== 0 && window.pageYOffset > 0) {
            const y = Math.max(0, window.pageYOffset + delta);
            if (window.lenis) window.lenis.scrollTo(y, { immediate: true });
            else window.scrollTo(0, y);
        }
    };

    apply();
    fine.addEventListener('change', apply);
    reduce.addEventListener('change', apply);
    // The reduce-motion toggle flips a class on <html>; react to it.
    new MutationObserver(apply).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });
}

/* ============================================
   Hero Tagline - parallax + fade behind the logo
   ============================================ */
function initHeroTagline() {
    const tag = document.querySelector('[data-hero-tagline]');
    if (!tag) return;

    // Leave it static for reduced-motion visitors.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Drift rate: a fraction of the scroll, close to (a little under) the
    // gradient background's own parallax so the text feels stuck to it.
    // No opacity fade - it applied to the whole layer, which dragged the
    // hover gif inside .tagline-strong down with it.
    const PARALLAX = 0.22;

    const onScroll = () => {
        const vh = window.innerHeight || 1;
        const p = (window.pageYOffset || 0) / vh;
        tag.style.transform =
            'translate3d(0,' + (-p * PARALLAX * vh).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}

/* ============================================
   Outro - while the orange CTA/footer block is on
   screen, clear the navbar and both side rails out
   of frame (CSS does the moving; this just flips
   .outro-active on <html>)
   ============================================ */
function initOutro() {
    const outro = document.querySelector('[data-outro]');
    if (!outro || !window.IntersectionObserver) return;

    const root = document.documentElement;
    new IntersectionObserver(function (entries) {
        root.classList.toggle('outro-active', entries[0].isIntersecting);
    }, { rootMargin: '0px 0px -35% 0px' }).observe(outro);
}

/* ============================================
   Page loader - the spinning mark shown on first
   load and again while moving between pages
   ============================================ */
function initPageLoader() {
    const root = document.documentElement;
    const loader = document.querySelector('.page-loader');
    if (!loader) { root.classList.remove('is-loading'); return; }

    const MIN_MS = 450;   // keep it up at least this long so it can't flash
    const MAX_MS = 6000;  // failsafe: never trap the visitor behind it
    const start = performance.now();
    let done = false;

    function hide() {
        if (done) return;
        done = true;
        root.classList.remove('is-loading');
    }

    function hideWhenReady() {
        const waited = performance.now() - start;
        setTimeout(hide, Math.max(0, MIN_MS - waited));
    }

    if (document.readyState === 'complete') hideWhenReady();
    else window.addEventListener('load', hideWhenReady);
    setTimeout(hide, MAX_MS);

    // Bring it back on the way out, so the spin covers the page swap.
    document.addEventListener('click', function (e) {
        const link = e.target.closest && e.target.closest('a[href]');
        if (!link || e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (link.target && link.target !== '_self') return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
            href.startsWith('tel:')) return;

        // same-origin only, and not a jump to the page we're already on
        let url;
        try { url = new URL(href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;

        e.preventDefault();
        done = false;
        root.classList.add('is-loading');
        setTimeout(function () { location.href = url.href; }, 320);
    });

    // Coming back via the browser's back/forward cache
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) { done = false; hide(); }
    });
}

/* ══════════════════════════════════════════════════════════════
   WORK CATEGORIES
   ══════════════════════════════════════════════════════════════
   THIS IS THE ONLY PLACE CATEGORIES ARE DEFINED.

   To tag a project, put the slugs on its card in the HTML:

       <a class="work-card" data-cats="logo brand print">

   Two or three is the intent. The pills under the title and the
   filter bar on work.html are both generated from this list, so
   you never write pill markup or SVG by hand.

   To rename a category, change its label below.
   To add one, add a slug + label + icon paths below.
   ══════════════════════════════════════════════════════════════ */
const WORK_CATEGORIES = {
    logo: {
        label: 'Logo Design',
        icon: '<circle cx="9.5" cy="9.5" r="5.5"/><rect x="9" y="9" width="11" height="11" rx="2"/>'
    },
    brand: {
        label: 'Brand System',
        icon: '<path d="M12 3 21 7.6 12 12.2 3 7.6 12 3Z"/><path d="M3 12.4 12 17l9-4.6"/><path d="M3 16.8 12 21.4l9-4.6"/>'
    },
    illustration: {
        label: 'Illustrations',
        icon: '<path d="M14.5 3.6 20.4 9.5 9.9 20H4v-5.9L14.5 3.6Z"/><path d="M12.6 5.5 18.5 11.4"/><path d="M4 20c1.6-1.2 2.2-2.6 2-4.2"/>'
    },
    motion: {
        label: 'Motion Graphics',
        icon: '<path d="M10 7.6 17.5 12 10 16.4V7.6Z"/><path d="M6.2 6.4 6.2 17.6"/><path d="M3 8.8 3 15.2"/>'
    },
    web: {
        label: 'Web & Digital',
        icon: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9.2h18"/><path d="M6.2 6.9h.01M8.9 6.9h.01"/>'
    },
    social: {
        label: 'Social Media',
        icon: '<path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.7-.37L4 21l1.5-3.6A6.9 6.9 0 0 1 3.5 12.4C3.5 8.4 7.3 5.2 12 5.2s8.5 3.2 8.5 7.2Z"/><path d="M9.2 12.3h.01M12 12.3h.01M14.8 12.3h.01"/>'
    },
    print: {
        label: 'Print & Packaging',
        icon: '<path d="M3.4 7.7 12 3.4l8.6 4.3v8.6L12 20.6l-8.6-4.3V7.7Z"/><path d="M3.4 7.7 12 12l8.6-4.3"/><path d="M12 12v8.6"/>'
    }
};

const WORK_FILTER_MAX = 3;   // how many filters can be on at once

function catIcon(slug) {
    const cat = WORK_CATEGORIES[slug];
    if (!cat) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true">' + cat.icon + '</svg>';
}

function cardCats(card) {
    return (card.getAttribute('data-cats') || '')
        .split(/\s+/)
        .filter(function (s) { return s && WORK_CATEGORIES[s]; });
}

/* Build the tag pills under every card title, on any page. */
function initWorkTags() {
    document.querySelectorAll('.work-card[data-cats]').forEach(function (card) {
        const meta = card.querySelector('.work-card__meta');
        if (!meta || meta.querySelector('.work-card__tags')) return;

        const cats = cardCats(card);
        if (!cats.length) return;

        const wrap = document.createElement('span');
        wrap.className = 'work-card__tags';
        wrap.innerHTML = cats.map(function (slug) {
            return '<span class="tag">' + WORK_CATEGORIES[slug].label +
                catIcon(slug) + '</span>';
        }).join('');

        // the pills stand in for the old single category line
        const old = meta.querySelector('.work-card__cat');
        if (old) old.remove();
        meta.appendChild(wrap);
    });
}

/* Filter bar - only builds where <div data-work-filters> exists (work.html).
   Multi-select up to WORK_FILTER_MAX; picking another drops the oldest. */
function initWorkFilters() {
    const bar = document.querySelector('[data-work-filters]');
    if (!bar) return;

    const scatter = document.querySelector('.work-scatter');
    if (!scatter) return;

    const PER_ROW = 3;

    // Every card, in source order. This array is the source of truth -
    // the .work-row divs get rebuilt around it on every filter change,
    // so the surviving cards always repack into full rows instead of
    // leaving holes where a hidden card used to sit. Moving the nodes
    // (rather than cloning) keeps their video and hover listeners.
    const cards = Array.from(scatter.querySelectorAll('.work-card'));
    if (!cards.length) return;

    // only offer categories that something actually uses
    const used = Object.keys(WORK_CATEGORIES).filter(function (slug) {
        return cards.some(function (c) { return cardCats(c).indexOf(slug) !== -1; });
    });

    // On mobile the chips collapse behind a toggle; on desktop the
    // toggle is hidden by CSS and the list is always open.
    bar.innerHTML =
        '<button type="button" class="work-filters__toggle" aria-expanded="false" ' +
        'aria-controls="work-filter-list">' +
        '<span>Filter</span>' +
        '<span class="work-filters__state">All</span>' +
        '<svg class="work-filters__chev" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="work-filters__list" id="work-filter-list">' +
        '<button type="button" class="work-filter" data-cat="all" aria-pressed="true">All</button>' +
        used.map(function (slug) {
            return '<button type="button" class="work-filter" data-cat="' + slug +
                '" aria-pressed="false">' + WORK_CATEGORIES[slug].label +
                catIcon(slug) + '</button>';
        }).join('') +
        '</div>';

    const buttons = Array.from(bar.querySelectorAll('.work-filter'));
    const allBtn = bar.querySelector('[data-cat="all"]');
    const toggle = bar.querySelector('.work-filters__toggle');
    const state = bar.querySelector('.work-filters__state');
    let active = [];   // oldest first

    toggle.addEventListener('click', function () {
        const open = bar.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    function render() {
        buttons.forEach(function (b) {
            const slug = b.getAttribute('data-cat');
            b.setAttribute('aria-pressed',
                slug === 'all' ? String(active.length === 0)
                               : String(active.indexOf(slug) !== -1));
        });

        // what the collapsed mobile toggle reads
        state.textContent = active.length === 0
            ? 'All'
            : (active.length === 1 ? WORK_CATEGORIES[active[0]].label
                                   : active.length + ' selected');

        const visible = cards.filter(function (card) {
            if (active.length === 0) return true;
            const cats = cardCats(card);
            return active.some(function (a) { return cats.indexOf(a) !== -1; });
        });

        relayout(visible);

        const empty = document.querySelector('[data-work-empty]');
        if (empty) empty.hidden = visible.length > 0;
    }

    /* Rebuild the rows around whichever cards survived the filter, so
       they repack three-up instead of leaving gaps. */
    function relayout(visible) {
        const frag = document.createDocumentFragment();

        for (let i = 0; i < visible.length; i += PER_ROW) {
            const row = document.createElement('div');
            row.className = 'work-row';
            visible.slice(i, i + PER_ROW).forEach(function (card, n) {
                card.style.setProperty('--i', String(n));
                card.classList.remove('work-card--enter');
                row.appendChild(card);
            });
            frag.appendChild(row);
        }

        // drop the old rows (their cards are already re-parented above,
        // and anything filtered out is simply left detached)
        scatter.querySelectorAll('.work-row').forEach(function (r) { r.remove(); });
        scatter.prepend(frag);

        // retrigger the entrance on the cards now on screen
        requestAnimationFrame(function () {
            visible.forEach(function (card) {
                card.classList.add('work-card--enter');
            });
        });
    }

    bar.addEventListener('click', function (e) {
        const btn = e.target.closest('.work-filter');
        if (!btn) return;
        const slug = btn.getAttribute('data-cat');

        if (slug === 'all') {
            active = [];
        } else {
            const at = active.indexOf(slug);
            if (at !== -1) {
                active.splice(at, 1);                 // toggle off
            } else {
                active.push(slug);
                if (active.length > WORK_FILTER_MAX) active.shift();  // drop oldest
            }
        }
        render();
    });

    allBtn.setAttribute('aria-pressed', 'true');
    render();
}

/* ============================================
   CTA band grows on approach
   The black slab gains 10% of its resting height
   as padding top and bottom while it's on screen,
   and settles back once it leaves.
   ============================================ */
function initCtaExpand() {
    const band = document.querySelector('.cta-band');
    if (!band || !window.IntersectionObserver) return;
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Percentage padding resolves against width, so measure the height
    // ourselves. Measure with the class off so we always read the rest size.
    function measure() {
        const wasOpen = band.classList.contains('is-open');
        band.classList.remove('is-open');
        band.style.setProperty('--cta-grow', '0px');
        const rest = band.offsetHeight;
        band.style.setProperty('--cta-grow', (rest * 0.3).toFixed(1) + 'px');
        if (wasOpen) band.classList.add('is-open');
    }

    measure();
    window.addEventListener('resize', measure);

    // Bottom margin is positive so it starts opening before the band
    // actually reaches the viewport; top margin is negative so it starts
    // closing while it's still partly on screen, rather than at the
    // moment it clears the edge.
    new IntersectionObserver(function (entries) {
        band.classList.toggle('is-open', entries[0].isIntersecting);
    }, { rootMargin: '-20% 0px 30% 0px' }).observe(band);
}

/* ============================================
   Generic scroll parallax
   Any element with data-parallax="<rate>" drifts
   as it crosses the viewport. Higher rate = more
   lag. Off on mobile and under reduced-motion.
   ============================================ */
function initParallax() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;

    const CAP = 90;   // px, so nothing drifts into its neighbours
    const stackedMQ = window.matchMedia
        ? window.matchMedia('(max-width: 760px)') : null;
    let ticking = false;

    function update() {
        ticking = false;
        const vh = window.innerHeight || 1;

        if (stackedMQ && stackedMQ.matches) {
            els.forEach(function (el) { el.style.removeProperty('--py'); });
            return;
        }

        const mid = vh / 2;
        els.forEach(function (el) {
            const r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) return;
            const rate = parseFloat(el.getAttribute('data-parallax')) || 0;
            let y = -((r.top + r.height / 2) - mid) * rate;
            y = Math.max(-CAP, Math.min(CAP, y));
            el.style.setProperty('--py', y.toFixed(1) + 'px');
        });
    }

    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
}

/* ============================================
   "Rock & Roll" hover gif - drifts with the
   cursor, and removes itself if the file is
   missing so no broken image shows up
   ============================================ */
function initCtaSpark() {
    document.querySelectorAll('.cta-spark, .gif-pop').forEach(function (spark) {
        const gif = spark.querySelector('.cta-spark__gif, .gif-pop__img');
        if (!gif) return;

        gif.addEventListener('error', function () { gif.remove(); });

        spark.addEventListener('pointermove', function (e) {
            const r = spark.getBoundingClientRect();
            if (!r.width) return;
            const x = (e.clientX - (r.left + r.width / 2)) / r.width; // -0.5 .. 0.5
            spark.style.setProperty('--gx', (x * 30).toFixed(1) + 'px');
        }, { passive: true });

        spark.addEventListener('pointerleave', function () {
            spark.style.setProperty('--gx', '0px');
        });
    });
}

/* ============================================
   Hero background fade - the fixed liquid gradient
   fades out to black as the page scrolls toward the
   "For Dreamers & Daredevils" divider
   ============================================ */
function initHeroBgFade() {
    const bg = document.querySelector('.liquid-hero__bg');
    const target = document.querySelector('.portfolio-section');
    if (!bg || !target) return;

    // The nav's black backdrop pops in (its own 0.4s ease) once the
    // "For Dreamers" divider crosses the middle of the viewport.
    // initNavbar bows out on this page - see there.
    const navbar = document.querySelector('.navbar');
    const divider = document.querySelector('.hero-divider');

    let ticking = false;
    function update() {
        ticking = false;
        const vh = window.innerHeight || 1;
        const top = target.getBoundingClientRect().top;
        // Full liquid until the portfolio is ~1.5 screens away; fully
        // black by the time its top edge is ~2/3 down the viewport.
        const START = vh * 1.5;   // top distance where the fade begins
        const END = vh * 0.65;    // top distance where it's fully black
        const p = Math.max(0, Math.min(1, (top - END) / (START - END)));
        bg.style.opacity = p.toFixed(3);

        if (navbar && divider) {
            const dr = divider.getBoundingClientRect();
            const mid = dr.top + dr.height / 2;
            navbar.classList.toggle('is-solid', mid < vh * 0.5);
        }
    }
    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
}

/* ============================================
   Portfolio cards - the whole card drifts at its
   own gentle rate as it passes the viewport
   ============================================ */
function initCardParallax() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Skip the squish rows (work.html) - those cards stay row-aligned.
    const cards = Array.from(document.querySelectorAll('.work-card'))
        .filter(function (c) { return !c.closest('.work-scatter--squish'); });
    if (!cards.length) return;

    // Per-card drift rate: px of lag per px the card sits from the
    // viewport centre. Set it on the card with  style="--p: 0.12"
    //   --p: 0     -> that card doesn't move
    //   higher     -> more lag / drift
    // Cards without a --p fall back to this "sprinkled" default set.
    const FALLBACK = [0.07, 0.15, 0.1, 0.16, 0.08, 0.12, 0.115, 0.17, 0.09, 0.14];
    const CAP = 140; // px, so a card near the edge never flies off
    // No parallax once the grid collapses to a single stacked column
    // (matches the .work-scatter 760px breakpoint in styles.css).
    const stackedMQ = window.matchMedia
        ? window.matchMedia('(max-width: 760px)') : null;
    let ticking = false;
    let rates = [];

    function readRates() {
        rates = cards.map(function (card, i) {
            var v = parseFloat(getComputedStyle(card).getPropertyValue('--p'));
            return isNaN(v) ? FALLBACK[i % FALLBACK.length] : v;
        });
    }

    function update() {
        ticking = false;
        if (stackedMQ && stackedMQ.matches) {
            cards.forEach((card) => card.style.removeProperty('--py'));
            return;
        }
        const mid = (window.innerHeight || 1) / 2;
        cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            if (r.bottom < -160 || r.top > mid * 2 + 160) return;
            const offset = (r.top + r.height / 2) - mid;   // -above / +below
            let y = -offset * rates[i];                     // lag toward centre
            y = Math.max(-CAP, Math.min(CAP, y));
            card.style.setProperty('--py', y.toFixed(1) + 'px');
        });
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    readRates();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { readRates(); onScroll(); });
    update();
}

/* ============================================
   Social links - clone the footer set into a fixed
   side rail (desktop) and the burger menu (mobile)
   ============================================ */
function initSocial() {
    const lines = '<span class="side-rail__line"></span>';

    // Left rail: copyright
    const left = document.createElement('div');
    left.className = 'side-rail side-rail--left';
    left.innerHTML = lines +
        '<div class="side-rail__body">' +
        '<span class="side-rail__label">Double Dash Creative © 2026</span>' +
        '</div>' + lines;
    document.body.appendChild(left);

    const source = document.querySelector('.footer-social');
    if (!source) return;
    // The footer lists icon + handle name; the rail and the burger menu
    // want icons only, so clone and drop the labels.
    const iconsOnly = source.cloneNode(true);
    iconsOnly.querySelectorAll('.footer-social__name').forEach(n => n.remove());
    const markup = iconsOnly.innerHTML;

    // Right rail: social icons
    const right = document.createElement('div');
    right.className = 'side-rail side-rail--right';
    right.setAttribute('aria-label', 'Social links');
    right.innerHTML = lines +
        '<div class="side-rail__body side-rail__social">' + markup + '</div>' +
        lines;
    document.body.appendChild(right);

    // Copy into the burger menu (mobile)
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const li = document.createElement('li');
        li.className = 'nav-social';
        li.innerHTML = markup;
        navLinks.appendChild(li);
    }
}

/* ============================================
   Navbar - fade the black backdrop in on scroll
   ============================================ */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Homepage: the backdrop is driven by initHeroBgFade so it tracks
    // the background fade to black exactly.
    if (document.querySelector('.liquid-hero__bg')) return;

    // Most pages: black fades in after ~0.4 of a viewport.
    const heroPin = document.querySelector('.hero-pin');
    const TRIGGER = 0.4;

    const onScroll = () => {
        const base = window.innerHeight * TRIGGER;
        const threshold = heroPin
            ? Math.max(base, heroPin.offsetHeight - window.innerHeight)
            : base;
        navbar.classList.toggle('is-solid', window.pageYOffset > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ============================================
   Scroll Animations (Intersection Observer)
   ============================================ */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length === 0) return;
    
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay based on element position
                const delay = index * 100;
                
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                
                // Unobserve after animation
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

/* ============================================
   Mobile Menu Toggle
   ============================================ */
function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuToggle || !navLinks) return;

    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        menuToggle.classList.toggle('active', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        // lock the page behind the full-screen overlay
        document.documentElement.classList.toggle('menu-open', open);
        if (window.lenis) open ? window.lenis.stop() : window.lenis.start();
    }

    menuToggle.addEventListener('click', () => {
        setMenu(!navLinks.classList.contains('active'));
    });

    // Close on link tap
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });
}

/* ============================================
   Contact Form Handler
   ============================================ */
function initContactForm() {
    const form = document.querySelector('#contact-form');
    
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Gather form data
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Build mailto link
        const subject = encodeURIComponent(`Project Inquiry: ${data['project-type']} from ${data['company']}`);
        const body = encodeURIComponent(
            `Name: ${data['name']}\n` +
            `Company: ${data['company']}\n` +
            `Email: ${data['email']}\n` +
            `Project Type: ${data['project-type']}\n` +
            `Budget: ${data['budget'] || 'Not specified'}\n` +
            `Timeframe: ${data['timeframe']}\n\n` +
            `Project Description:\n${data['description']}`
        );
        
        // Open mailto link
        window.location.href = `mailto:irawanandersonputra@gmail.com?subject=${subject}&body=${body}`;
    });
}

/* ============================================
   Sliding Portfolio Animation
   ============================================ */
function initSlidingPortfolio() {
    const items = document.querySelectorAll('.portfolio-item-sliding');

    if (items.length === 0) return;

    function updateSlideProgress() {
        items.forEach(item => {
            const overlay = item.querySelector('.portfolio-image-overlay');
            const imageContainer = item.querySelector('.portfolio-images');
            const direction = item.getAttribute('data-slide-direction');

            if (!overlay || !imageContainer) return;

            // Get image container position relative to viewport
            const rect = imageContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate scroll progress (0 to 1)
            // Start: when image is 20% into viewport
            // End: when top of image reaches center of viewport
            const startPoint = windowHeight / 2;
            const endPoint = windowHeight / 6;

            let progress = 0;

            // Only start calculating when the image container's bottom enters viewport
            if (rect.bottom > 0 && rect.top <= startPoint) {
                if (rect.top >= endPoint) {
                    // Image is between bottom of screen and center
                    progress = (startPoint - rect.top) / (startPoint - endPoint);
                    progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
                } else {
                    // Image has passed center point
                    progress = 1;
                }
            }

            // Apply transform based on direction and progress
            let translateValue;
            if (direction === 'left') {
                translateValue = -100 + (progress * 100); // Start at -100%, end at 0%
            } else {
                translateValue = 100 - (progress * 100); // Start at 100%, end at 0%
            }

            overlay.style.transform = `translateX(${translateValue}%)`;
        });
    }

    // Update on scroll
    window.addEventListener('scroll', updateSlideProgress);

    // Initial update
    updateSlideProgress();
}

/* ============================================
   Smooth Scroll for Anchor Links
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const id = this.getAttribute('href');
        // Bare "#" placeholders and "#top" have no element to find - let the
        // browser handle them rather than cancelling the click and throwing.
        if (!id || id.length < 2) return;

        let target = null;
        try { target = document.querySelector(id); } catch (err) { return; }
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

/* ============================================
   Portfolio Item Hover Effects
   ============================================ */
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.zIndex = '10';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.zIndex = '1';
    });
});

/* ============================================
   Page Load Animation Trigger
   ============================================ */
window.addEventListener('load', function() {
    document.body.classList.add('loaded');

    // Trigger fade-in animations for above-the-fold content
    const heroElements = document.querySelectorAll('.liquid-hero .fade-in');
    heroElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, index * 150);
    });
});
