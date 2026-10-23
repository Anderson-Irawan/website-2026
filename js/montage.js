/* ============================================
   MONTAGE - cycles random images of the
   work inside the square behind the "For
   Dreamers & Daredevils" phrase.
   See css/montage.css.

   Every picture Sanity holds for a project is
   fair game: the card still, the hover still,
   the case study hero and every image in its
   media rows.
   ============================================ */
(function () {
    const box = document.querySelector('[data-montage]');
    if (!box) return;

    /* ---- tunables ---- */
    const HOLD = 500;        // ms each picture stays up
    const FADE_IN = 0.5;     // screens of scroll it takes to fade up
    const PRELOAD = 4;       // how many pictures ahead to fetch

    const SANITY = {
        projectId: '7z9npbl2',
        dataset: 'production',
        apiVersion: '2024-01-01',
    };
    const HOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
        ? 'api.sanity.io' : 'apicdn.sanity.io';

    const reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)');

    function isReduced() {
        return (reduce && reduce.matches) ||
            document.documentElement.classList.contains('liquid-hero-reduced');
    }

    /* asset._ref is image-<hash>-<w>x<h>-<ext>, which maps straight onto
       a CDN url with no second request. Asked for at the square's own
       size, so a montage is not 74 full-size photographs. */
    function imgUrl(ref) {
        if (!ref) return '';
        const p = String(ref).split('-');
        if (p.length < 4) return '';
        return 'https://cdn.sanity.io/images/' + SANITY.projectId + '/' +
            SANITY.dataset + '/' + p[1] + '-' + p[2] + '.' + p[3] +
            '?w=900&h=900&fit=crop&auto=format&q=75';
    }

    /* ---- the picture that is showing ---- */
    const img = document.createElement('img');
    img.className = 'montage__img';
    img.alt = '';
    img.decoding = 'async';
    box.appendChild(img);

    let shots = [];
    let at = 0;
    let timer = null;

    function preloadFrom(i) {
        for (let n = i; n < Math.min(i + PRELOAD, shots.length); n++) {
            const pre = new Image();
            pre.src = shots[n];
        }
    }

    function step() {
        if (!shots.length) return;
        img.src = shots[at];
        at = (at + 1) % shots.length;
        /* reshuffle each time round, so the order is never the same twice */
        if (at === 0) shuffle(shots);
        preloadFrom(at);
    }

    function start() {
        if (timer || !shots.length) return;
        step();
        if (isReduced()) return;   // one still, no cycling
        timer = setInterval(step, HOLD);
    }

    function stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    }

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /* ---- fade up once the gradient square has lifted away ---- */
    const pin = document.querySelector('.hero-pin');
    let ticking = false;

    function update() {
        ticking = false;
        const vh = window.innerHeight || 1;
        let p = 1;
        if (pin) {
            /* the sticky hero releases here; the gradient square is on its
               way off the top by then, so this one fades into its place */
            const released = pin.offsetTop + pin.offsetHeight - vh;
            const y = window.pageYOffset || 0;
            p = Math.min(1, Math.max(0, (y - released) / (vh * FADE_IN)));
        }
        box.style.setProperty('--montage-in', p.toFixed(3));

        /* only run the cycle while it is actually on screen */
        if (p > 0.01 && !document.hidden) start();
        else stop();
    }

    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    /* ---- go ---- */
    /* The montage is a hand-picked 16: only pictures of the work applied
       to something real - packaging, print, signage, garments, screens.
       Logos on their own, type specimens, colour palettes and flat
       artwork are left out, they read as swatches at this size.

       Every project is in at least once, apart from City of Bristol
       College, which is deliberately left out. Named by slug and slot
       rather than by asset id, so re-uploading a picture in the Studio
       keeps the montage working. Slots: card, hover, hero, or rN.M for
       the Mth picture in the Nth media row of the case study. */
    const PICKS = [
        ['hot', 'hero'],          // poster out in the city
        ['hot', 'r1.0'],          // embroidered cap
        ['pagikopi', 'card'],     // coffee pouches
        ['pagikopi', 'hero'],     // boxes being carried
        ['bci', 'card'],          // neon sign on brick
        ['bci', 'hero'],          // site hoarding
        ['bci', 'r1.0'],          // stationery set
        ['kynara', 'card'],       // taped shipping box
        ['iscream', 'r3.0'],      // menu boards in the shop
        ['iscream', 'r4.0'],      // cups and merch
        ['mumu', 'card'],         // shopfront
        ['mumu', 'r2.0'],         // packaging and pastries
        ['furari', 'card'],       // the t-shirt, worn
        ['furari', 'r10.0'],      // paper bag
        ['nusa-antara', 'card'],  // the cloth, shot on location
        ['nusa-antara', 'hero'],  // swing tag
    ];

    const QUERY = '*[_type == "project" && defined(slug.current)]{' +
        '"slug": slug.current,' +
        '"a": cardStill.asset._ref,' +
        '"b": cardHover.image.asset._ref,' +
        '"c": hero.image.asset._ref,' +
        '"d": blocks[_type == "mediaRow"].items[].image.asset._ref}';

    /* the slots of one project, keyed the way PICKS names them */
    function slotsOf(p) {
        const map = {};
        if (p.a) map.card = p.a;
        if (p.b) map.hover = p.b;
        if (p.c) map.hero = p.c;
        (p.d || []).forEach(function (row, i) {
            const items = Array.isArray(row) ? row : [row];
            items.forEach(function (ref, j) {
                if (ref) map['r' + i + '.' + j] = ref;
            });
        });
        return map;
    }

    fetch('https://' + SANITY.projectId + '.' + HOST + '/v' + SANITY.apiVersion +
        '/data/query/' + SANITY.dataset + '?query=' + encodeURIComponent(QUERY))
        .then(function (r) {
            if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
            return r.json();
        })
        .then(function (j) {
            const bySlug = {};
            (j.result || []).forEach(function (p) {
                if (p.slug) bySlug[p.slug] = slotsOf(p);
            });

            const refs = [];
            PICKS.forEach(function (pick) {
                const slots = bySlug[pick[0]];
                const ref = slots && slots[pick[1]];
                if (ref) refs.push(ref);
                else console.warn('montage: no picture at', pick.join(' '));
            });

            /* one of each: a repeat inside a short montage is obvious */
            shots = shuffle(Array.from(new Set(refs)).map(imgUrl).filter(Boolean));
            if (!shots.length) return;

            preloadFrom(0);
            update();
        })
        .catch(function (err) {
            /* no montage rather than an empty square */
            console.warn('montage: could not load the work images:', err);
        });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('visibilitychange', update);
    new MutationObserver(update).observe(document.documentElement,
        { attributes: true, attributeFilter: ['class'] });
    update();
})();
