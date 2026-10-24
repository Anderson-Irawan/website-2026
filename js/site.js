/* Double Dash Creative - all site JavaScript in one file (logo-3d.js stays
   separate: it is an ES module). Every section no-ops when its markup is
   not on the page. */

/* "Lite" tier: phones and touch screens. Set once, before any section
   runs, and read as window.lite by the sections that have a heavy per-frame
   cost (the two WebGL backgrounds, the project cards, the montage) and by
   logo-3d.js. Same cut-off as the stacked layout in the CSS (760px), plus
   any device whose main pointer is a finger, which catches tablets and
   landscape phones. */
window.lite = !!(window.matchMedia &&
    window.matchMedia('(max-width: 760px), (pointer: coarse)').matches);


/* ======================================================================
   js/projects.js
   ====================================================================== */
/* ============================================
   CASE STUDIES

   The content lives in Sanity. Edit a project in the Studio, refresh the
   site - there is nothing to re-upload.

   Pages are  /work/<project>, listed on the home page

   Each project is turned into rows (sanityToRows below) with these fields:
     project   which case study the row belongs to
     type      intro | hero | media | text
     file      image URL, or a video filename
     alt       what the image shows (on an intro row: the role line)
     row       give two to four media rows the same number to sit them
               side by side. Blank = full width on its own.
     width     that item's share of the row as a %. Blank = even split.
     heading   the section heading (on an intro row: the project name)
     text      the paragraphs. New line in the cell = new paragraph.
     poster    still frame shown before a video plays
     bg        background colour behind a full-width item

   Every project needs an intro row and a hero row. After that the order
   is yours - read top to bottom, that is the page.

   Video: `file` is a .mp4/.webm/.mov filename; they all live in
   assets/videos. Muted, looping, and only starts once it scrolls
   into view, so a page of clips does not all download at once.
   ============================================ */

/* Sanity. These are public identifiers, not secrets: reads from a public
   dataset need no token, and none should ever appear in this file. */
const SANITY = {
    projectId: '7z9npbl2',
    dataset: 'production',
    apiVersion: '2024-01-01',   // pinned on purpose, not a floating version
};

/* Clean case study urls are produced by .htaccess plus case.php, and a
   local dev server has neither. Anything that is not the live host gets
   the template with a query string instead, which the renderer below
   still understands. That keeps Live Server, a phone on the LAN and a
   bare file:// preview all working.

   Duplicated in sanity-cards.js on purpose: the two never load on the
   same page, so there is nothing to share them through. */
function caseUrl(slug) {
    const live = /(^|\.)doubledashcreative\.com$/.test(location.hostname);
    return live ? '/work/' + slug : 'case-study.html?p=' + slug;
}

/* Editing locally? Use the uncached API so a publish shows on the next
   refresh. In production use the CDN, which is faster and far cheaper
   but holds a 60 second cache - fine for visitors, maddening when you
   are iterating on copy. */
const SANITY_HOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'api.sanity.io'
    : 'apicdn.sanity.io';

(function () {
    /* Root-relative, not relative. These pages are served at /work/<slug>,
       one level down, so 'assets/videos/x.mp4' would resolve against
       /work/ and 404 - which is exactly what happened to every case study
       video the moment the urls changed. A leading slash pins them to the
       site root wherever the page itself lives. */
    const VIDEOS = '/assets/videos/';
    const VIDEO = /\.(mp4|webm|mov)$/i;

    const mount = document.querySelector('[data-case-study]');
    if (!mount) return;

    /* Hold the loading screen until the content has arrived, the page is
       built and the hero image has actually decoded - otherwise the
       loader lifts on window load, which happens while <main> is still
       empty, and you watch the page assemble itself. initPageLoader
       picks this up; its MAX_MS is the failsafe if we never resolve. */
    let ready;
    window.PAGE_READY = new Promise(function (resolve) { ready = resolve; });

    /* the hero is the only image worth waiting on - the rest are lazy
       and below the fold, and blocking on them would take seconds */
    function heroPainted() {
        const img = mount.querySelector('.case-study-hero img');
        if (!img || img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    }

    /* ---- rendering ---- */
    /* videos all sit together in assets/videos, so they only need the
       filename. Anything already absolute is left alone, which is how
       Sanity's CDN image URLs pass through untouched. */
    const src = function (p) {
        if (/^https?:\/\//i.test(p)) return p;
        return VIDEO.test(p) ? VIDEOS + p : p;
    };

    function paraList(cell) {
        return (cell || '').split('\n')
            .map(function (t) { return t.trim(); })
            .filter(Boolean);
    }

    function paras(cell) {
        return paraList(cell).map(function (t) { return '<p>' + t + '</p>'; }).join('');
    }

    function media(r) {
        if (!VIDEO.test(r.file)) {
            return '<img src="' + src(r.file) + '" alt="' + r.alt + '"' +
                ' loading="lazy" decoding="async">';
        }
        return '<video muted loop playsinline preload="none" data-cs-play' +
            (r.poster ? ' poster="' + src(r.poster) + '"' : '') +
            ' aria-label="' + r.alt + '">' +
            '<source src="' + src(r.file) + '" type="video/mp4">' +
            '</video>';
    }

    function hero(r) {
        /* data-height drives the CSS. The sheet has no height column, so
           its heroes fall through to the standard banner. */
        return '<section class="case-study-hero" data-height="' +
            (r.height || 'default') + '">' + media(r) + '</section>';
    }

    function intro(r, project) {
        return '<section class="case-study-intro">' +
            '<div class="work-container">' +
            '<div class="case-study-intro-grid">' +
            '<div class="title-section">' +
            '<h1 class="heading-lg">' + project.title + '</h1>' +
            catTags(project.categories) +
            '</div>' +
            '<div class="case-study-body">' +
            '<div class="description">' + paras(r.text) + '</div>' +
            scopeList(r.scope) +
            '</div>' +
            '</div></div></section>';
    }

    /* The category labels under the title, the same outlined pills the
       project cards carry. WORK_CATEGORIES lives in js/main.js, which
       loads after this file but long before the fetch above resolves;
       the guard is there in case that order ever changes. Projects
       still coming from the sheet have no categories, and simply get
       no labels. */
    function catTags(cats) {
        if (!cats || !cats.length) return '';
        if (typeof WORK_CATEGORIES === 'undefined') return '';
        const pills = cats.map(function (slug) {
            const cat = WORK_CATEGORIES[slug];
            return cat ? '<span class="tag">' + cat.label + '</span>' : '';
        }).join('');
        return pills ? '<span class="cs-tags">' + pills + '</span>' : '';
    }

    /* One scope item per line. Omitted entirely when empty, and the CSS
       then lets the description run the full width on its own. */
    function scopeList(cell) {
        const items = paraList(cell);
        if (!items.length) return '';
        return '<aside class="case-study-scope">' +
            '<h2 class="case-study-scope__title">Scope:</h2><ul>' +
            items.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
            '</ul></aside>';
    }

    function text(r) {
        if (r.file) {
            return '<section class="sm-section cs-band">' +
                '<div class="case-study-solution">' +
                '<div class="content-img">' +
                '<h2 class="heading-lg">' + r.heading + '</h2>' + paras(r.text) +
                '</div>' +
                '<div class="image-box">' + media(r) + '</div>' +
                '</div></section>';
        }
        /* No image: heading above its paragraphs, not beside them, so the
           text-only bands read top down. One block, so there is no grid
           here with only prose to lay out. */
        return '<section class="section cs-band"><div class="container">' +
            '<div class="cs-prose">' +
            '<h2 class="heading-lg">' + r.heading + '</h2>' + paras(r.text) +
            '</div></div></section>';
    }

    function mediaRow(group) {
        if (group.length > 4) {
            console.warn('Row ' + group[0].row + ' of ' + group[0].project + ' has ' +
                group.length + ' items; only the first 4 are shown.');
        }
        const items = group.slice(0, 4);
        return '<section class="cs-row" data-n="' + items.length + '"' +
            (items[0].bg ? ' style="background-color: ' + items[0].bg + ';"' : '') + '>' +
            items.map(function (r) {
                /* data-height="natural" releases the item from the row's
                   default aspect ratio, so the whole image shows uncropped */
                return '<div class="cs-row__item"' +
                    (r.height ? ' data-height="' + r.height + '"' : '') +
                    (r.width ? ' style="--w: ' + r.width + '"' : '') + '>' +
                    media(r) + '</div>';
            }).join('') +
            '</section>';
    }

    /* consecutive media rows sharing a row number become one row */
    function build(project) {
        const html = [];
        let group = [];

        function flush() {
            if (group.length) { html.push(mediaRow(group)); group = []; }
        }

        project.rows.forEach(function (r) {
            const type = r.type.toLowerCase();

            if (type === 'media') {
                const same = group.length && r.row !== '' && group[0].row === r.row;
                if (!same) flush();
                group.push(r);
                if (r.row === '') flush();
                return;
            }
            flush();
            if (type === 'hero') html.push(hero(r));
            else if (type === 'intro') html.push(intro(r, project));
            else if (type === 'text') html.push(text(r));
            else console.warn('Unknown row type in the sheet:', r.type);
        });
        flush();
        return html.join('');
    }

    /* Clips play only while on screen - these files are large, and a
       page of them decoding at once is a lot of work for a phone. */
    function wireVideo() {
        const clips = mount.querySelectorAll('video[data-cs-play]');
        if (!clips.length) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clips.forEach(function (v) { v.removeAttribute('loop'); });
            return;
        }
        /* Data saver on, or a connection that will not cope. Autoplaying
           several megabytes over a slow link makes the whole page crawl,
           so the poster stays put and a tap starts it instead. Safari
           does not implement navigator.connection, so iphones fall
           through to the normal path below. */
        const net = navigator.connection || {};
        const slow = net.saveData === true ||
            /^(slow-2g|2g|3g)$/.test(net.effectiveType || '');

        if (slow) {
            clips.forEach(function (v) { v.setAttribute('controls', ''); });
            return;
        }

        /* On a phone the lookahead is the problem: a 200px margin starts
           the next clip downloading while the current one is still
           buffering, and the two split one connection. So no lookahead
           there, and only the clip most in view plays, which means a
           scroll never has more than one video competing for bandwidth.
           Desktop keeps the old behaviour, where a row of clips playing
           together is the whole point. */
        const phone = window.matchMedia('(max-width: 640px)').matches;
        const ratios = new Map();

        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
            });

            let best = null;
            let bestRatio = 0;
            if (phone) {
                ratios.forEach(function (ratio, el) {
                    if (ratio > bestRatio) { bestRatio = ratio; best = el; }
                });
            }

            ratios.forEach(function (ratio, el) {
                const wanted = phone ? (el === best && bestRatio > 0) : ratio > 0;
                if (wanted) {
                    const p = el.play();
                    if (p) p.catch(function () { /* autoplay refused */ });
                } else if (!el.paused) {
                    el.pause();
                }
            });
        }, {
            rootMargin: phone ? '0px' : '200px 0px',
            threshold: phone ? [0, 0.25, 0.5, 0.75] : 0,
        });

        clips.forEach(function (v) { io.observe(v); });
    }

    function message(title, body) {
        mount.innerHTML = '<section class="cs-missing">' +
            '<h1 class="heading-lg">' + title + '</h1>' + body + '</section>';
        ready();   // nothing else is coming, let the loader go
    }

    /* ---------------------------------------------------------------
       Sanity

       A project published in the Studio is turned into exactly the same
       row shape the sheet produces, so there is only ever one renderer.
       Anything not yet migrated keeps coming from the sheet.
       --------------------------------------------------------------- */
    const GROQ = '*[_type == "project"]{title, "slug": slug.current, role, ' +
        'categories, cardStill, cardHover, hero, intro, scope, blocks}';

    /* asset._ref is image-<hash>-<w>x<h>-<ext>, which maps straight onto a
       CDN url with no second request */
    function assetUrl(ref) {
        if (!ref) return '';
        const p = ref.split('-');
        return 'https://cdn.sanity.io/images/' + SANITY.projectId + '/' +
            SANITY.dataset + '/' + p[1] + '-' + p[2] + '.' + p[3];
    }

    /* One upload serves every size, so never hand back the original.
       Passing a height asks Sanity to crop, which respects the hotspot you
       set in the Studio. Leaving it off returns the whole image uncropped,
       which is what the rows want. */
    function sized(url, w, h) {
        if (!url) return '';
        return url + '?w=' + w + (h ? '&h=' + h + '&fit=crop' : '') +
            '&auto=format&q=80';
    }

    function pickMedia(m, w, h) {
        if (!m) return null;
        if (m.videoPath) {
            return {
                file: m.videoPath,
                alt: (m.image && m.image.alt) || '',
                poster: m.poster
                    ? sized(assetUrl(m.poster.asset && m.poster.asset._ref), w, h) : '',
            };
        }
        if (m.image && m.image.asset) {
            return {
                file: sized(assetUrl(m.image.asset._ref), w, h),
                alt: m.image.alt || '',
                poster: '',
            };
        }
        return null;
    }

    /* Prose fields are a single text area now, a blank line between
       paragraphs, which is how the sheet always worked. Earlier content
       was saved as an array of paragraphs, so both shapes are accepted
       and nothing has to be re-entered in a hurry. */
    function asText(v) {
        if (Array.isArray(v)) return v.join('\n\n');
        return v || '';
    }

    function sanityToRows(doc) {
        const rows = [];
        let rowNo = 0;

        /* The Height field on the hero. "natural" asks Sanity for the whole
           image and lets the page height follow it, which is what packaging
           and portrait shots want. The others crop to a banner, and the crop
           is done by Sanity so the hotspot is respected. The request height
           roughly matches the rendered one against a ~1200px measure, so the
           image is not cropped twice. */
        /* Crop heights against a 2000px width, so the ratios are:
             short    5.0 : 1   a thin cinematic strip
             default  2.2 : 1   a standard banner
             tall     1.1 : 1   nearly square, for portrait work
           The old spread ran 3.6 to 1.6, which was too narrow to tell
           the three apart. */
        const HERO_CROP = { natural: null, short: 400, default: 900, tall: 1800 };
        const heroSize = (doc.hero && doc.hero.height) || 'default';
        const hero = pickMedia(doc.hero, 2000, HERO_CROP[heroSize]);

        if (hero) {
            rows.push({
                type: 'hero',
                file: hero.file,
                alt: hero.alt,
                poster: hero.poster,
                height: heroSize,
            });
        }

        rows.push({
            type: 'intro',
            heading: doc.title,
            alt: doc.role || '',
            text: asText(doc.intro),
            scope: asText(doc.scope),
        });

        (doc.blocks || []).forEach(function (b) {
            if (b._type === 'mediaRow') {
                rowNo++;
                const items = (b.items || []).slice(0, 4);
                items.forEach(function (it) {
                    const m = pickMedia(it, 1400);
                    if (!m) return;
                    rows.push({
                        type: 'media',
                        file: m.file,
                        alt: m.alt,
                        poster: m.poster,
                        /* a single item stands alone, same as a blank row cell */
                        row: items.length > 1 ? String(rowNo) : '',
                        width: it.width ? String(it.width) : '',
                        height: it.height || '',
                        bg: b.bg || '',
                    });
                });
            }

            if (b._type === 'textBand') {
                const bi = b.image && b.image.asset
                    ? sized(assetUrl(b.image.asset._ref), 1200) : '';
                rows.push({
                    type: 'text',
                    heading: b.heading || '',
                    text: asText(b.paragraphs),
                    file: bi,
                    alt: (b.image && b.image.alt) || '',
                });
            }
        });

        return {
            slug: doc.slug, title: doc.title, role: doc.role,
            categories: doc.categories || [], rows: rows,
        };
    }

    /* ---- go ---- */
    /* /work/<slug> is the real url now. ?p=<slug> is still read as a
       fallback, so an old link keeps working anywhere the .htaccess
       redirect is not in play - a local file:// preview, say. */
    const fromPath = (location.pathname.match(/\/work\/([^\/.]+)/) || [])[1] || '';
    const slug = (fromPath ||
        new URLSearchParams(location.search).get('p') || '').toLowerCase();


    const loadSanity = fetch('https://' + SANITY.projectId + '.' + SANITY_HOST + '/v' +
        SANITY.apiVersion + '/data/query/' + SANITY.dataset +
        '?query=' + encodeURIComponent(GROQ))
        .then(function (r) {
            if (!r.ok) throw new Error('Sanity -> ' + r.status);
            return r.json();
        })
        .then(function (j) { return j.result || []; });

    /* og: tags key off property=, twitter: off name=, so which attribute to
       match on has to be passed in rather than guessed. Missing tag = no-op. */
    function setMeta(attr, key, value) {
        const el = document.querySelector('meta[' + attr + '="' + key + '"]');
        if (el) el.setAttribute('content', value);
    }

    loadSanity.then(function (docs) {
        const projects = {};
        docs.forEach(function (doc) {
            if (!doc.slug) return;
            projects[String(doc.slug).toLowerCase()] = sanityToRows(doc);
        });

        const project = projects[slug];

        if (!project) {
            message(
                slug ? 'No write-up for &ldquo;' + slug + '&rdquo;' : 'Pick a project',
                '<p>Projects so far:</p><ul class="cs-missing__list">' +
                Object.keys(projects).map(function (key) {
                    return '<li><a href="' + caseUrl(key) + '">' +
                        projects[key].title + '</a></li>';
                }).join('') +
                '</ul><p><a href="/">Back to the projects</a></p>'
            );
            return;
        }

        const pageTitle = project.title + ' | Case Study | Double Dash Creative';
        document.title = pageTitle;

        /* search snippet: the opening line of the intro, no extra column */
        const desc = document.querySelector('meta[name="description"]');
        const opener = project.rows.filter(function (r) {
            return r.type.toLowerCase() === 'intro';
        })[0];
        const snippet = opener ? (paraList(opener.text)[0] || '').slice(0, 160) : '';
        if (desc && snippet) desc.setAttribute('content', snippet);

        /* Point the share card and the canonical url at THIS project rather
           than the bare template. Most scrapers never see any of it, because
           they do not run JavaScript, but anything that does render gets the
           real values instead of the generic ones sitting in the markup. */
        setMeta('property', 'og:title', pageTitle);
        setMeta('property', 'og:url', location.href);
        setMeta('name', 'twitter:title', pageTitle);
        if (snippet) {
            setMeta('property', 'og:description', snippet);
            setMeta('name', 'twitter:description', snippet);
        }
        const canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.setAttribute('href', location.href);

        mount.innerHTML = build(project);
        wireVideo();

        /* main.js finished its pass on DOMContentLoaded, before any of
           this existed, so the new sections need observing now */

        heroPainted().then(ready);
    }).catch(function (err) {
        console.error('Could not load the case study content', err);

        message('Content did not load',
            '<p>The project data could not be read from Sanity.</p>' +
            '<p><a href="/">Back to the projects</a></p>');
    });
}());

;

/* ======================================================================
   js/main.js
   ====================================================================== */
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
    initNavTint();
    initNavHide();    // the bar slides away scrolling down, back on scrolling up
    initMotionToggle();
    // initSocial();  // Disabled - the function below is commented out, so
    //                // calling it threw a ReferenceError and killed every
    //                // init after this line.
    initOutro();
    initWorkTags();
    initWorkFilters();
    initParallax();
    initCtaSpark();
    initCtaSlide();
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

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const html = document.documentElement;

    // Armed on every device with motion on - phones included, so the hero
    // hold (and the gradient shrink in it) is the same length as desktop.
    const apply = () => {
        const on = !reduce.matches &&
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
    // With the held CTA (homepage), go orange only once the footer arrives,
    // so the page doesn't flash orange while the CTA box is growing.
    const target = outro.querySelector('[data-cta-pin]')
        ? (outro.querySelector('.site-footer') || outro)
        : outro;
    new IntersectionObserver(function (entries) {
        root.classList.toggle('outro-active', entries[0].isIntersecting);
    }, { rootMargin: '0px 0px -35% 0px' }).observe(target);
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

    // A page whose content arrives after load - the case studies, which
    // fetch their sheet - can hold the loader by setting window.PAGE_READY
    // to a promise before this runs. Otherwise it lifts on window load.
    const gate = window.PAGE_READY &&
        typeof window.PAGE_READY.then === 'function' ? window.PAGE_READY : null;

    if (gate) gate.then(hideWhenReady, hideWhenReady);
    else if (document.readyState === 'complete') hideWhenReady();
    else window.addEventListener('load', hideWhenReady);

    setTimeout(hide, MAX_MS);   // never trap anyone behind a slow fetch

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
   filter bar on the home page are both generated from this list, so
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
            /* label only - the icons said nothing the words did not */
            return '<span class="tag">' + WORK_CATEGORIES[slug].label + '</span>';
        }).join('');

        // the pills stand in for the old single category line
        const old = meta.querySelector('.work-card__cat');
        if (old) old.remove();
        meta.appendChild(wrap);
    });
}

/* Filter bar - only builds where <div data-work-filters> exists (the home page).
   One filter at a time: picking another replaces it, and tapping the
   live one clears back to All. */
function initWorkFilters() {
    const bar = document.querySelector('[data-work-filters]');
    if (!bar) return;

    const scatter = document.querySelector('.work-scatter');
    if (!scatter) return;

    const PER_ROW = 2;

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
            : WORK_CATEGORIES[active[0]].label;

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

        /* One at a time. `active` stays an array so render() and the
           visibility test below do not care, it just never holds more
           than a single slug. */
        if (slug === 'all' || active.indexOf(slug) !== -1) {
            active = [];                  // All, or tapping the live filter off
        } else {
            active = [slug];              // replaces whatever was set
        }
        render();
    });

    allBtn.setAttribute('aria-pressed', 'true');
    render();
}

/* ============================================
   CTA "Start a project" slides across from the
   left edge of the band to its right-aligned
   spot, once, as the band comes into view.
   The CSS only offsets the link once .is-armed is
   on, so with no JS it just sits in place.
   ============================================ */
function initCtaSlide() {
    const band = document.querySelector('.cta-band');
    if (!band || !window.IntersectionObserver) return;
    // the homepage's held CTA slides its link with the scroll instead
    // (js/cta-grow.js)
    if (band.closest('[data-cta-pin]')) return;
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    band.classList.add('is-armed');
    const io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        band.classList.add('is-in');
        io.disconnect();
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(band);
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

        // How far out of focus the gradient is: 0 while the hero is sharp,
        // 1 once it is fully blurred behind the work. Tracks the scroll
        // continuously rather than snapping at a threshold. The css reads
        // it for opacity, blur radius and scale all at once.
        const top = target.getBoundingClientRect().top;
        const START = vh * 1.2;   // distance at which the blur begins
        const END = vh * 0.3;     // distance at which it is fully blurred
        const amb = Math.min(1, Math.max(0, (START - top) / (START - END)));
        bg.style.setProperty('--amb', amb.toFixed(3));

        // Freeze the canvas the moment any blur lands on it. Under a blur a
        // still frame and a moving one are indistinguishable, and this way
        // the per-frame filtering is done on a static image rather than on
        // a canvas that is also redrawing itself.
        const hero = window.liquidHero && window.liquidHero.instances &&
            window.liquidHero.instances[0];
        if (hero && hero.setFrozen) hero.setFrozen(amb > 0.01);

        // (The nav used to get its black backdrop, .is-solid, here once the
        // divider passed mid-screen. The nav has no backdrop any more.)

        // The divider phrase fades and recedes as the projects come in: p
        // is 0 until their top has climbed to 75% of the way down the
        // screen, 1 once it reaches 30% down. The fade starts once p is
        // half done. The phrase is fixed mid-screen and the cards slide
        // over it. Applies under reduced motion too.
        if (divider) {
            const wr = target.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh * 0.75 - wr.top) / (vh * 0.45)));
            const fade = Math.min(1, Math.max(0, (p - 0.5) * 2));
            const root = document.documentElement.style;
            root.setProperty('--work-p', p.toFixed(3));
            root.setProperty('--work-fade', fade.toFixed(3));
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

    // the toggle in the navbar, which persists across pages
    if (document.documentElement.classList.contains('liquid-hero-reduced')) return;

    // Skip the squish rows - those cards stay row-aligned.
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
/*function initSocial() {
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
}*/

/* ============================================
   Navbar - fade the black backdrop in on scroll
   ============================================ */
function initNavbar() {
    // The nav has no backdrop any more: it stays transparent on every page,
    // so .is-solid (the black backdrop, and the white ink that went with it)
    // is never added. Its text keeps the page's own ink - cream on the dark
    // homepage, black on the light pages.
}

/* ============================================
   Hide the bar on the way down, bring it back on
   the way up
   ============================================ */
function initNavHide() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const root = document.documentElement;

    // Ignore scrolls smaller than this: trackpads and phone momentum
    // produce a lot of tiny direction flips, and reacting to those makes
    // the bar flicker.
    const THRESHOLD = 8;

    // Never hide near the top. Hiding immediately makes the bar feel
    // twitchy on the first flick of the wheel.
    const REVEAL_ABOVE = 140;

    let last = window.pageYOffset || 0;
    let ticking = false;

    function update() {
        ticking = false;
        const y = window.pageYOffset || 0;
        const delta = y - last;

        if (Math.abs(delta) < THRESHOLD) return;

        /* The takeover menu is part of the bar, so it stays put while
           that is open, and while the outro has the bar in its compact
           state at the very bottom of the page. */
        const hold = root.classList.contains('menu-open');

        navbar.classList.toggle('is-hidden', !hold && delta > 0 && y > REVEAL_ABOVE);
        last = y;
    }

    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
}

/* ============================================
   Motion toggle

   liquid-hero.js already drives this button, but only on a page that has
   a hero canvas: with no canvas it HIDES the button and returns. So on
   the projects page it would be dead. This takes over there.

   Same localStorage key and same <html> class as liquid-hero.js, which
   is what makes the setting carry from one page to the next.
   ============================================ */
function initMotionToggle() {
    const buttons = document.querySelectorAll('[data-liquid-hero-toggle]');
    if (!buttons.length) return;

    // the homepage has a canvas, so liquid-hero.js owns the button there
    if (document.querySelector('[data-liquid-hero]')) return;

    const KEY = 'liquid-hero:reduced';
    const root = document.documentElement;

    function stored() {
        try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
    }

    function apply(on) {
        root.classList.toggle('liquid-hero-reduced', on);
        buttons.forEach(function (b) {
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            const label = b.querySelector('.motion-toggle__label');
            if (label) label.textContent = on ? 'Enable Motion' : 'Reduce Motion';
        });
    }

    apply(stored());

    buttons.forEach(function (b) {
        b.addEventListener('click', function () {
            const on = !root.classList.contains('liquid-hero-reduced');
            try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
            apply(on);

            /* the parallax listeners are bound once at load, so turning it
               back on mid-page needs them wired up now */
            if (!on && typeof initCardParallax === 'function') initCardParallax();
        });
    });
}

/* ============================================
   Nav tint - the bar borrows a coloured band's colour
   ============================================ */
function initNavTint() {
    const navbar = document.querySelector('.navbar');
    const band = document.querySelector('[data-nav-tint]');
    if (!navbar || !band) return;

    let io = null;

    /* The root's top edge is pushed down by the bar's own height, so the
       band stops intersecting the moment its bottom edge passes the
       bottom of the bar - which is exactly when the black background
       arrives underneath it. */
    function watch() {
        if (io) io.disconnect();
        io = new IntersectionObserver(function (entries) {
            navbar.classList.toggle('is-tinted', entries[0].isIntersecting);
        }, { rootMargin: (-navbar.offsetHeight) + 'px 0px 0px 0px' });
        io.observe(band);
    }

    watch();
    // the bar changes height at breakpoints, so the margin is remeasured
    window.addEventListener('resize', watch);
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
        window.location.href = `mailto:hello@doubledashcreative.com?subject=${subject}&body=${body}`;
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
});

;

/* ======================================================================
   js/portfolio-video.js
   ====================================================================== */
try {
// Portfolio Video Hover/Touch Interactions
(function initPortfolioVideo() {
    const portfolioVideos = document.querySelectorAll('.portfolio-video');

    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    portfolioVideos.forEach(video => {
        // The hover target is whichever card the video sits in. Don't
        // require .portfolio-item-video - a video dropped into any card
        // should just work, rather than failing silently because the
        // marker class was left off the wrapping <a>.
        const portfolioItem = video.closest(
            '.portfolio-item-video, .work-card, .portfolio-item'
        ) || video.parentElement;

        if (!portfolioItem) return;

        // For touch devices (mobile/tablet): autoplay and loop
        if (isTouchDevice) {
            // Set loop attribute
            video.loop = true;

            // Use Intersection Observer to play when in viewport
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Play video when in viewport
                        video.play().catch(err => {
                            console.log('Autoplay prevented:', err);
                        });
                    } else {
                        // Pause when out of viewport to save resources
                        video.pause();
                    }
                });
            }, {
                threshold: 0.5 // Play when 50% visible
            });

            observer.observe(video);
        } else {
            // For desktop: play on hover, pause and reset on hover out
            portfolioItem.addEventListener('mouseenter', () => {
                video.loop = true;
                video.play().catch(err => {
                    console.log('Video play prevented:', err);
                });
            });

            portfolioItem.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
                // Restore the poster still (a paused video shows its first
                // frame, not the poster, so reload to bring the poster back)
                if (video.getAttribute('poster')) video.load();
            });
        }
    });
})();

} catch (e) { console.error("site.js: portfolio-video", e); }

/* ======================================================================
   js/sanity-cards.js
   ====================================================================== */
try {
/* ============================================
   PROJECT CARDS FROM SANITY

   Runs on any grid marked [data-sanity-cards]: the homepage and the
   projects page, which are the same even three-up layout. It is
   additive on purpose:

     - a project published in Sanity REPLACES the hand-written card with
       the same slug, so its images come from the CMS
     - a project in Sanity with no hand-written card is APPENDED, so new
       work appears with no markup written
     - anything not yet in Sanity keeps its hand-written card

   That means you migrate one project at a time and the page never drops
   anything in between. Once everything is in Sanity, the hand-written
   cards can be deleted and this keeps working unchanged.

   [data-featured-only] on a grid limits it to projects ticked "Show on
   the homepage" in the Studio. That is the only difference between the
   two pages.
   ============================================ */
/* Everything lives inside the closure below. js/projects.js declares its
   own SANITY_HOST and caseUrl at the top level, and the case study pages
   load both files: two top-level `const SANITY_HOST` declarations in one
   page is a syntax error that stops whichever script loads second, which
   is how the case study grid came up empty. */
(function () {
    /* Editing locally? Use the uncached API so a publish shows on the
       next refresh. In production use the CDN, which is faster and far
       cheaper but holds a 60 second cache - fine for visitors, maddening
       when you are iterating on copy. */
    const SANITY_HOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
        ? 'api.sanity.io'
        : 'apicdn.sanity.io';

    /* Clean case study urls are produced by .htaccess plus case.php, and
       a local dev server has neither. Anything that is not the live host
       gets the template with a query string instead, which the case
       study renderer still understands. That keeps Live Server, a phone
       on the LAN and a bare file:// preview all working. */
    function caseUrl(slug) {
        const live = /(^|\.)doubledashcreative\.com$/.test(location.hostname);
        return live ? '/work/' + slug : 'case-study.html?p=' + slug;
    }

    const SANITY = {
        projectId: '7z9npbl2',
        dataset: 'production',
        apiVersion: '2024-01-01',
    };

    const scatter = document.querySelector('[data-sanity-cards]');
    if (!scatter) return;

    /* Both grids are the same even three-up now, so no per-card sizing is
       written at all. The homepage differs only in which projects it
       shows: [data-featured-only] limits it to the ones ticked "Show on
       the homepage" in the Studio. */
    const FEATURED_ONLY = scatter.hasAttribute('data-featured-only');
    /* [data-random]: shuffle before the limit is applied, so a grid with
       data-limit shows a different handful on every visit. */
    const RANDOM = scatter.hasAttribute('data-random');
    /* [data-exclude-current] (the case studies): drop the project being
       viewed, so "more work" never offers the page you are already on.
       Same slug rule as js/projects.js: /work/<slug> is the real url,
       ?p=<slug> still works anywhere the rewrite is not in play. */
    const EXCLUDE_CURRENT = scatter.hasAttribute('data-exclude-current');

    function currentSlug() {
        const fromPath = (location.pathname.match(/\/work\/([^\/.]+)/) || [])[1] || '';
        return (fromPath ||
            new URLSearchParams(location.search).get('p') || '').toLowerCase();
    }
    const LIMIT = scatter.getAttribute('data-limit') ? parseInt(scatter.getAttribute('data-limit'), 10) : null;
    /* [data-descriptions] (the projects page) puts a short line under each
       title: the "Short description" field in the Studio, or the first
       sentence of the intro when that is blank. */
    const DESCRIPTIONS = scatter.hasAttribute('data-descriptions');

    function firstSentence(text) {
        const t = (text || '').trim().replace(/\s+/g, ' ');
        const m = t.match(/^.*?[.!?](?=\s|$)/);
        return m ? m[0] : t;
    }

    /* A phone cannot hover, so a hover video there can never play: it is
       megabytes fetched to sit behind a poster nobody will ever trigger.
       Touch devices get the still image and nothing else. */
    const CAN_HOVER = window.matchMedia('(hover: hover)').matches;

    /* A card is ~300px wide on a phone; 900 is three times the pixels it
       can show, and it is the texture the stack scales every frame. */
    const CARD_W = window.lite ? 640 : 900;

    /* [data-no-hover] (the projects page): cards are the still image only,
       so the hover image and video are never built or downloaded. */
    const NO_HOVER = scatter.hasAttribute('data-no-hover');

    /* asset._ref is image-<hash>-<w>x<h>-<ext>, which maps straight onto a
       CDN url with no second request */
    function assetUrl(ref) {
        if (!ref) return '';
        const p = ref.split('-');
        return 'https://cdn.sanity.io/images/' + SANITY.projectId + '/' +
            SANITY.dataset + '/' + p[1] + '-' + p[2] + '.' + p[3];
    }

    /* No fit=crop. The frame already crops with object-fit: cover and its
       aspect changes with the viewport, so cropping here as well zooms
       hard into the middle - badly so on a landscape upload. One crop
       only, done by the CSS, exactly as the hand-written cards do it. */
    function cardImg(ref) {
        const u = assetUrl(ref);
        return u ? u + '?w=' + CARD_W + '&auto=format&q=80' : '';
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : s;
        return d.innerHTML;
    }

    function buildCard(p) {
        const still = p.cardStill && p.cardStill.asset;
        if (!still) return null;

        const hover = NO_HOVER ? {} : (p.cardHover || {});
        const hoverImg = hover.image && hover.image.asset;
        const hoverVid = hover.videoPath;
        const poster = hover.poster && hover.poster.asset;

        let frame =
            '<img class="work-card__img" loading="lazy" decoding="async" src="' +
            cardImg(still._ref) + '" alt="' + esc(p.cardStill.alt || '') + '">';

        if (hoverVid && CAN_HOVER) {
            /* the poster falls back to the resting image, so the card never
               flashes a different picture before the video starts */
            frame = '<video class="work-card__img portfolio-video" muted playsinline' +
                ' preload="metadata" poster="' +
                cardImg(poster ? poster._ref : still._ref) + '">' +
                '<source src="/assets/videos/' + esc(hoverVid) + '" type="video/mp4">' +
                '</video>';
        } else if (hoverImg) {
            frame += '<img class="work-card__img work-card__img--hover" loading="lazy"' +
                ' decoding="async" src="' + cardImg(hoverImg._ref) +
                '" alt="' + esc((hover.image && hover.image.alt) || '') + '">';
        }

        const a = document.createElement('a');
        a.href = caseUrl(p.slug);
        a.className = 'work-card' + (hoverVid ? ' portfolio-item-video' : '');
        a.setAttribute('data-cats', (p.categories || []).join(' '));

        const desc = DESCRIPTIONS ? (p.summary || firstSentence(p.intro)) : '';

        a.innerHTML =
            '<span class="work-card__frame">' + frame + '</span>' +
            '<span class="work-card__meta">' +
            '<span class="work-card__title" data-title="' + esc(p.title) + '">' +
            esc(p.title) + '</span>' +
            (desc ? '<span class="work-card__desc">' + esc(desc) + '</span>' : '') +
            '</span>';
        return a;
    }

    /* portfolio-video.js is a self-running IIFE, so it cannot be re-run for
       cards that did not exist when it loaded. Wired here for the ones this
       file creates. */
    function wireHover(card) {
        const v = card.querySelector('video.portfolio-video');
        if (!v) return;

        card.addEventListener('mouseenter', function () {
            const play = v.play();
            if (play) play.catch(function () { /* autoplay refused */ });
        });
        card.addEventListener('mouseleave', function () {
            v.pause();
            if (v.getAttribute('poster')) v.load();
        });
        /* a 404 on a <video> source is otherwise completely silent: the
           poster just sits there and the card looks like it chose not to
           play. Say so in the console instead. */
        v.addEventListener('error', function () {
            const s = v.querySelector('source');
            console.error('Hover video failed to load:', s && s.src);
        });
    }

    /* [data-fit-titles]: one shared title size, the largest at which the
       widest title still fits its card on one line. Measured at 100px and
       scaled, since width is linear in font size. The clone keeps the
       title's ::after (the reserved italic copy), so a nowrap max-content
       box is already the wider of the upright and hover-italic forms. */
    function fitTitles() {
        const titles = scatter.querySelectorAll('.work-card__title');
        if (!titles.length) return;

        const avail = titles[0].parentElement.clientWidth;
        let widest = 0;

        titles.forEach(function (t) {
            const m = t.cloneNode(true);
            m.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;' +
                'white-space:nowrap;width:max-content;font-size:100px';
            scatter.appendChild(m);
            widest = Math.max(widest, m.getBoundingClientRect().width);
            m.remove();
        });

        if (widest && avail) {
            scatter.style.setProperty('--title-size',
                Math.floor(100 * avail / widest * 0.98) + 'px');
        }
    }

    if (scatter.hasAttribute('data-fit-titles')) {
        let pending = 0;
        const refit = function () {
            cancelAnimationFrame(pending);
            pending = requestAnimationFrame(fitTitles);
        };
        window.addEventListener('resize', refit);
        // any webfont finishing later changes the widths - measure again
        if (document.fonts && document.fonts.addEventListener) {
            document.fonts.addEventListener('loadingdone', refit);
        }
    }

    /* [data-reveal]: each card's picture starts under an orange block
       that swipes off as the card comes into view, the same move the
       homepage cards make (see .cards-reveal in css/styles.css). The
       class only goes on once the cards exist and motion is allowed, so
       a picture is never left stuck behind the block. */
    function armReveal() {
        if (!scatter.hasAttribute('data-reveal')) return;
        const html = document.documentElement;
        const reduce = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || html.classList.contains('liquid-hero-reduced') ||
            !window.IntersectionObserver) return;

        const frames = scatter.querySelectorAll('.work-card__frame');
        if (!frames.length) return;
        html.classList.add('cards-reveal');

        /* A beat between the cards in a row, so they come in one after
           another rather than all at once. It cycles every third card
           rather than running up the whole grid: cards further down the
           page enter on their own anyway, and a delay that kept growing
           would leave the last one waiting seconds. */
        const STAGGER = parseFloat(scatter.getAttribute('data-reveal-stagger'));
        const step = isNaN(STAGGER) ? 0.1 : STAGGER;
        frames.forEach(function (frame, i) {
            frame.style.transitionDelay = ((i % 3) * step).toFixed(2) + 's';
        });

        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-revealed');
                io.unobserve(e.target);   // once revealed, it stays revealed
            });
        }, { rootMargin: '0px 0px -12% 0px' });

        frames.forEach(function (frame) { io.observe(frame); });
    }

    const QUERY = '*[_type == "project" && defined(slug.current)] | order(order asc) {' +
        'title, "slug": slug.current, categories, order, featured, cardStill, cardHover' +
        // the intro is only fetched where it may be needed as the fallback
        (DESCRIPTIONS ? ', summary, intro' : '') + '}';

    fetch('https://' + SANITY.projectId + '.' + SANITY_HOST + '/v' + SANITY.apiVersion +
        '/data/query/' + SANITY.dataset + '?query=' + encodeURIComponent(QUERY))
        .then(function (r) {
            if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
            return r.json();
        })
        .then(function (j) {
            let projects = j.result || [];

            /* "Show on the homepage" in the Studio. Only the homepage sets
               the attribute, so the projects page always shows everything. */
            if (FEATURED_ONLY) {
                projects = projects.filter(function (p) { return p.featured; });
            }
            if (EXCLUDE_CURRENT) {
                const here = currentSlug();
                if (here) {
                    projects = projects.filter(function (p) {
                        return String(p.slug).toLowerCase() !== here;
                    });
                }
            }
            /* Shuffle first, so the limit below takes a random handful
               rather than always the same first few. Fisher-Yates. */
            if (RANDOM) {
                for (let i = projects.length - 1; i > 0; i--) {
                    const j2 = Math.floor(Math.random() * (i + 1));
                    [projects[i], projects[j2]] = [projects[j2], projects[i]];
                }
            }
            /* Limit number of projects if data-limit is set */
            if (LIMIT && projects.length > LIMIT) {
                projects = projects.slice(0, LIMIT);
            }
            if (!projects.length) return;

            let changed = 0;

            /* An empty grid means the page is fully CMS-driven, so the rows
               have to be built too. Both grid styles lay out through
               .work-row, so three to a row suits either. */
            if (!scatter.querySelector('.work-card')) {
                const PER_ROW = 2;
                let row = null;

                /* Count only the cards that actually build. Keying the row
                   break off the loop index instead would leave row null if
                   the first project failed to build, and every later card
                   would then crash on appendChild and take the grid with it. */
                projects.forEach(function (p) {
                    const card = buildCard(p);
                    if (!card) {
                        console.warn('Skipping project with no card image:', p.slug);
                        return;
                    }

                    if (changed % PER_ROW === 0) {
                        row = document.createElement('div');
                        row.className = 'work-row';
                        scatter.appendChild(row);
                    }
                    row.appendChild(card);
                    wireHover(card);
                    changed++;
                });
            } else projects.forEach(function (p) {
                const existing = scatter.querySelector(
                    'a.work-card[href="' + caseUrl(p.slug) + '"]'
                );

                const card = buildCard(p);
                if (!card) return;

                if (existing) {
                    existing.replaceWith(card);
                } else {
                    /* A new project with no hand-written card. The projects
                       page repacks everything into rows of three right after
                       this, so loose is fine there. The homepage keeps its
                       authored rows, so it goes into the last one. */
                    const lastRow = scatter.querySelector('.work-row:last-of-type');
                    (lastRow || scatter).appendChild(card);
                }
                wireHover(card);
                changed++;
            });

            if (!changed) return;

            armReveal();

            /* measuring before the webfont lands would size off the
               fallback serif's widths. fonts.ready alone is not enough for
               Adobe Fonts: a face only starts downloading once something
               uses it, so ready can resolve before Plantin has begun. Ask
               for the title's own face explicitly, then measure. */
            if (scatter.hasAttribute('data-fit-titles')) {
                fitTitles();   // first pass, whatever font is showing
                const first = scatter.querySelector('.work-card__title');
                const cs = first && getComputedStyle(first);
                const face = cs ? cs.fontWeight + ' 100px ' + cs.fontFamily : '';
                (face && document.fonts && document.fonts.load
                    ? document.fonts.load(face).catch(function () {})
                    : Promise.resolve()
                ).then(function () { return document.fonts.ready; })
                 .then(fitTitles);
            }

            /* main.js finished its pass on DOMContentLoaded, before any of
               this existed, so the tags and the filter bar are rebuilt. Both
               re-read the grid from scratch, so this is safe to repeat. */
            try {
                if (typeof initWorkTags === 'function') initWorkTags();
                if (typeof initWorkFilters === 'function') initWorkFilters();
            } catch (e) {
                console.error('a main.js init threw on the Sanity cards', e);
            }
        })
        .catch(function (err) {
            /* the hand-written cards are already on the page, so a failure
               here leaves the grid exactly as it was */
            console.warn('Sanity cards unavailable, using the markup as written', err);
        });
}());

} catch (e) { console.error("site.js: sanity-cards", e); }

/* ======================================================================
   js/topo-bg.js
   ====================================================================== */
try {
/* ============================================================
   topo-bg.js
   Topographic contour lines on the black page ground, behind
   the liquid gradient. Transparent canvas: only the lines are
   drawn, so the page colour (black, then orange at the outro)
   shows through between them.

   Lines are one colour (a soft grey) and drift
   slowly the same way the gradient does.

   Usage: <canvas class="topo-bg" data-topo-bg></canvas>
   ============================================================ */
(function (global) {
    'use strict';

    var CFG = {
        // one colour for every line: a soft grey
        color:     '#8E8E96',
        lines:     8,    // contour count over the full height range; higher = denser
        lineWidth: 1.0,   // CSS px
        alpha:     0.18,  // line strength, the same for every line (was 0.3)
        scale:     0.75,  // field zoom; higher = smaller, busier hills
        angle:     -5,   // degrees, same as the gradient
        speed:     0.05,  // how fast the hills reshape
        drift:     0.015, // sideways slide, in screen heights per second
                          // (0.015 = ~14px/s on a 900px screen); negative = other way
        parallax:  0.15,  // drift per screen of scroll
        pointer:     0.9,  // how hard the cursor pulls the lines (0 = off), same as the gradient
        pointerEase: 0.09, // cursor follow smoothing; lower = laggier/softer
        // film grain over the black ground, the same as the liquid gradient
        grain:      0.12,   // strength; 0 = off (the gradient uses 0.085)
        grainScale: 0.85,   // grain size (lower = coarser)
        chroma:     1.5,    // colour in the grain, like TV static: 0 = plain
                            // grey grain, 1 = strong red/green/blue specks
        maxDPR:    2
    };

    var VERT = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

    var FRAG = [
        '#extension GL_OES_standard_derivatives : enable',
        'precision highp float;',
        'uniform vec2 u_res;',
        'uniform float u_time,u_shift,u_scroll,u_dpr,u_lines,u_lineWidth,u_alpha,u_angle,u_scale;',
        'uniform vec3 u_col;',
        'uniform vec2 u_mouse;',
        'uniform float u_grain,u_grainScale,u_chroma;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
        'uniform float u_pointer;',

        /* Simplex noise - Ashima / Gustavson, public domain */
        'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
        'float snoise(vec2 v){',
        '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
        '  vec2 i=floor(v+dot(v,C.yy));',
        '  vec2 x0=v-i+dot(i,C.xx);',
        '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
        '  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;',
        '  i=mod289(i);',
        '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
        '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);',
        '  m=m*m; m=m*m;',
        '  vec3 x=2.0*fract(p*C.www)-1.0;',
        '  vec3 h=abs(x)-0.5;',
        '  vec3 ox=floor(x+0.5);',
        '  vec3 a0=x-ox;',
        '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
        '  vec3 g;',
        '  g.x=a0.x*x0.x+h.x*x0.y;',
        '  g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
        '  return 130.0*dot(m,g);',
        '}',
        /* Smooth terrain: one broad octave plus a whisper of a second.
           More fine octaves than this is what made the lines wobbly. */
        'float field(vec2 p){return (snoise(p)+0.12*snoise(p*1.9+vec2(3.1,7.4)))/1.12;}',

        'void main(){',
        '  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;',
        /* cursor, measured on the screen before the drift moves things */
        '  vec2 mrel=uv-u_mouse;',
        /* sideways drift, applied in screen space so it is truly horizontal */
        '  uv.x+=u_shift;',
        '  float a=radians(u_angle);',
        '  mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));',
        '  vec2 p=rot*uv*u_scale;',
        '  p.y+=u_scroll;',
        '  float t=u_time;',
        /* Cursor pull, the same as the gradient: a soft gaussian well that
           drags the lines toward the pointer and stirs them a little. */
        '  float infl=exp(-dot(mrel,mrel)*4.0)*u_pointer;',
        '  p+=mrel*infl*0.7;',
        '  t+=infl*0.6;',
        /* broad, slow warp, so the lines bend like the gradient does */
        '  vec2 q=vec2(snoise(p*0.6+t*0.10),snoise(p*0.6+vec2(5.2,1.3)-t*0.08));',
        '  float h=field(p+0.5*q+vec2(1.7,9.2))*0.5+0.5;',
        /* contour lines at even height steps, anti-aliased to a fixed width */
        '  float v=h*u_lines;',
        /* true change per pixel (gradient length). fwidth() adds x and y,
           which reads ~40% high on diagonals and made those lines thicker */
        '  float aa=length(vec2(dFdx(v),dFdy(v)));',
        '  float d=abs(fract(v+0.5)-0.5);',
        '  float hw=max(u_lineWidth*u_dpr*0.5,0.6);',
        /* edge softened over ~1.5px so curves read smooth, not stepped */
        '  float ln=1.0-smoothstep(aa*(hw-0.75),aa*(hw+0.75),d);',
        /* fade out where lines would crowd into a moire */
        '  ln*=1.0-smoothstep(0.25,0.5,aa);',
        /* every line the same strength */
        '  float al=ln*u_alpha;',
        /* Film / TV grain: locked to the screen and re-rolled every frame,
           as in liquid-hero.js. A shared brightness speck plus its own
           random red, green and blue (u_chroma), so the black is dusted
           with coloured static. The canvas is see-through, so the grain is
           drawn as light over the ground (premultiplied colour, its alpha
           the brightest channel); on near-black there is no room to darken
           anyway. The lines are laid over it. */
        '  vec2 gp=gl_FragCoord.xy*u_grainScale+fract(u_time)*91.7;',
        '  float lum=hash(gp)-0.5;',
        '  vec3 chr=vec3(hash(gp+vec2(17.3,4.1)),hash(gp+vec2(3.7,31.9)),hash(gp+vec2(53.1,11.9)))-0.5;',
        '  vec3 gn=max((vec3(lum)+chr*u_chroma)*u_grain,0.0);',
        '  float ga=max(gn.r,max(gn.g,gn.b));',
        '  gl_FragColor=vec4(u_col*al,al)+vec4(gn,ga)*(1.0-al);',
        '}'
    ].join('\n');

    function hexToRgb(h) {
        var n = parseInt(h.slice(1), 16);
        return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }

    function mount(canvas) {
        var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
        // no WebGL or no derivatives: leave the plain black ground
        if (!gl || !gl.getExtension('OES_standard_derivatives')) {
            canvas.style.display = 'none';
            return;
        }

        function compile(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('topo-bg:', gl.getShaderInfoLog(s));
            return s;
        }
        var prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        function U(n) { return gl.getUniformLocation(prog, n); }
        var uRes = U('u_res'), uTime = U('u_time'), uShift = U('u_shift'),
            uScroll = U('u_scroll'), uDpr = U('u_dpr'),
            uMouse = U('u_mouse'), uPointer = U('u_pointer');
        gl.uniform1f(U('u_lines'), CFG.lines);
        gl.uniform1f(U('u_lineWidth'), CFG.lineWidth);
        gl.uniform1f(U('u_alpha'), CFG.alpha);
        gl.uniform1f(U('u_grain'), CFG.grain);
        gl.uniform1f(U('u_grainScale'), CFG.grainScale);
        gl.uniform1f(U('u_chroma'), CFG.chroma);
        gl.uniform1f(U('u_angle'), CFG.angle);
        gl.uniform1f(U('u_scale'), CFG.scale);
        gl.uniform3fv(U('u_col'), hexToRgb(CFG.color));

        var w = 0, h = 0;
        function resize() {
            /* the lines are 1px wide, so keep enough resolution to hold them */
            var dpr = Math.min(global.devicePixelRatio || 1,
                global.lite ? Math.min(CFG.maxDPR, 1.5) : CFG.maxDPR);
            var nw = Math.round(canvas.clientWidth * dpr);
            var nh = Math.round(canvas.clientHeight * dpr);
            if (nw === w && nh === h) return;
            w = canvas.width = nw;
            h = canvas.height = nh;
            gl.viewport(0, 0, w, h);
            gl.uniform2f(uRes, w, h);
            gl.uniform1f(uDpr, dpr);
        }

        // same motion setting as the gradient: OS setting or the nav toggle
        var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
        function reduced() {
            return (mq && mq.matches) ||
                document.documentElement.classList.contains('liquid-hero-reduced');
        }

        // shift is the sideways slide, kept apart from the clock so its speed
        // can be set on its own (CFG.drift)
        var clock = 0, shift = 0, last = performance.now(), raf = null;

        // Pointer, as in liquid-hero.js: mx/my follow the cursor (eased),
        // amt fades the pull in while it moves and out once it stops.
        var mx = 0, my = 0, tmx = 0, tmy = 0, amt = 0, tAmt = 0, idle = null;
        function pointerTo(e) {
            if (reduced()) return;
            var r = canvas.getBoundingClientRect();
            if (!r.width || !r.height) return;
            tmx = ((e.clientX - r.left) / r.width - 0.5) * (r.width / r.height);
            tmy = 0.5 - (e.clientY - r.top) / r.height;
            tAmt = 1;
            if (idle) clearTimeout(idle);
            idle = setTimeout(function () { tAmt = 0; }, 500);
        }
        // on the window: the canvas sits behind the page and gets no events
        global.addEventListener('pointermove', pointerTo, { passive: true });
        global.addEventListener('pointerdown', pointerTo, { passive: true });
        document.addEventListener('pointerleave', function () { tAmt = 0; });

        function render() {
            resize();
            var red = reduced();
            var vh = canvas.clientHeight || 1;
            gl.uniform1f(uTime, red ? 12.0 : clock);
            gl.uniform1f(uShift, red ? 0 : shift);
            gl.uniform2f(uMouse, mx, my);
            gl.uniform1f(uPointer, red ? 0 : CFG.pointer * amt);
            gl.uniform1f(uScroll, red ? 0 : (global.pageYOffset || 0) / vh * CFG.parallax);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        function frame(now) {
            var dt = Math.min((now - last) / 1000, 0.05);
            clock += dt * CFG.speed;
            shift += dt * CFG.drift;
            mx += (tmx - mx) * CFG.pointerEase;
            my += (tmy - my) * CFG.pointerEase;
            amt += (tAmt - amt) * 0.05;
            last = now;
            render();
            raf = (!document.hidden && !reduced()) ? requestAnimationFrame(frame) : null;
        }
        function sync() {
            if (!document.hidden && !reduced()) {
                if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
            } else {
                if (raf) { cancelAnimationFrame(raf); raf = null; }
                render();
            }
        }

        document.addEventListener('visibilitychange', sync);
        if (mq && mq.addEventListener) mq.addEventListener('change', sync);
        new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        global.addEventListener('resize', function () { if (reduced()) render(); });
        render();
        sync();
    }

    function boot() {
        var nodes = document.querySelectorAll('[data-topo-bg]');
        for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window);

} catch (e) { console.error("site.js: topo-bg", e); }

/* ======================================================================
   js/liquid-hero.js
   ====================================================================== */
try {
/* ============================================================
   liquid-hero.js
   Domain-warped banded gradient background.
   Zero dependencies. ~6 KB unminified.

   Usage:
     <div class="hero"><canvas data-liquid-hero></canvas></div>
     <script src="/js/liquid-hero.js" defer></script>

   Or mount manually with options:
     liquidHero(document.querySelector('#myCanvas'), { order: 0.9 });
   ============================================================ */
(function (global) {
  'use strict';

  var DEFAULTS = {
    colors: ['#201D1E', '#313187', '#D84553', '#EC6142', '#F66531'],
    //         near-black  indigo     pink       coral      orange
    stops:  [0.15, 0.40, 0.60, 0.78, 0.95],

    order:      0.78,   // 0 = noise churn, 1 = clean parallel bands
    bands:      1.4,    // how many bands across the field
    detail:     0.05,   // weight of fine noise octaves; lower is smoother
    scale:      0.65,
    warp:       0.45,   // how far bands get pushed off straight
    contrast:   0.85,
    angle:      -11,    // degrees; negative = lower-left to upper-right
    speed:      0.3,
    grain:      0.085,
    grainScale: 0.85,

    pointer:     0.9,   // how hard the cursor pulls the gradient (0 = off)
    pointerEase: 0.09,  // cursor follow smoothing; lower = laggier/softer
    parallax:    0.35,  // gradient drift per screen of scroll (0 = off)

    maxDPR:     2,      // cap resolution; 2 is plenty
    fallback:   'linear-gradient(135deg,#201D1E,#313187 35%,#D84553 55%,#F66531)'
  };

  var VERT =
    'attribute vec2 a_pos;' +
    'void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec3 u_col[5];',
    'uniform float u_stop[5];',
    'uniform float u_order,u_bands,u_detail,u_scale,u_warp,u_contrast,u_angle,u_grain,u_grainScale;',
    'uniform vec2 u_mouse;',
    'uniform float u_pointer;',
    'uniform float u_scroll;',
    'const float TAU=6.28318530718;',

    /* Simplex noise - Ashima / Gustavson, public domain */
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    '  vec2 i=floor(v+dot(v,C.yy));',
    '  vec2 x0=v-i+dot(i,C.xx);',
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    '  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;',
    '  i=mod289(i);',
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);',
    '  m=m*m; m=m*m;',
    '  vec3 x=2.0*fract(p*C.www)-1.0;',
    '  vec3 h=abs(x)-0.5;',
    '  vec3 ox=floor(x+0.5);',
    '  vec3 a0=x-ox;',
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
    '  vec3 g;',
    '  g.x=a0.x*x0.x+h.x*x0.y;',
    '  g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    '  return 130.0*dot(m,g);',
    '}',

    /* fBm; u_detail attenuates the upper octaves */
    'float fbm(vec2 p){',
    '  float v=0.0,a=0.5,norm=0.0;',
    '  for(int i=0;i<5;i++){',
    '    float w=(i==0)?1.0:pow(u_detail,float(i));',
    '    v+=a*w*snoise(p); norm+=a*w; p*=2.02; a*=0.5;',
    '  }',
    '  return v/max(norm,0.0001);',
    '}',

    'vec3 ramp(float t){',
    '  vec3 c=u_col[0];',
    '  for(int i=0;i<4;i++){c=mix(c,u_col[i+1],smoothstep(u_stop[i],u_stop[i+1],t));}',
    '  return c;',
    '}',

    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',

    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;',
    '  float a=radians(u_angle);',
    '  mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));',
    '  vec2 p=rot*uv*u_scale;',
    /* Parallax: pan the field as the page scrolls past the hero. */
    '  p.y+=u_scroll;',
    '  float t=u_time;',
    /* Cursor pull: a soft gaussian well that drags the field toward the pointer. */
    '  vec2 mrel=uv-u_mouse;',
    '  float infl=exp(-dot(mrel,mrel)*4.0)*u_pointer;',
    '  p+=mrel*infl*0.7;',
    '  t+=infl*0.6;',
    '  vec2 q=vec2(fbm(p+t*0.15),fbm(p+vec2(5.2,1.3)-t*0.12));',
    '  vec2 warped=p+u_warp*vec2(',
    '    fbm(p+u_warp*q+vec2(1.7,9.2)+t*0.20),',
    '    fbm(p+u_warp*q+vec2(8.3,2.8)-t*0.18));',
    /* Ordered field: parallel bands displaced by the warp. */
    '  float ordered=0.5+0.5*sin(TAU*warped.y*u_bands);',
    '  float chaotic=fbm(warped)*0.5+0.5;',
    '  float f=mix(chaotic,ordered,u_order);',
    '  f=clamp((f-0.5)*u_contrast+0.5,0.0,1.0);',
    '  vec3 col=ramp(f);',
    /* Grain locked to the screen plane so it never flows with the warp. */
    '  float g=hash(gl_FragCoord.xy*u_grainScale+fract(u_time)*91.7);',
    '  col+=(g-0.5)*u_grain;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  var KEYS = ['order','bands','detail','scale','warp','contrast','angle','grain','grainScale'];

  function hexToRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function liquidHero(canvas, options) {
    if (!canvas) return null;

    var cfg = {};
    var k;
    for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) cfg[k] = DEFAULTS[k];
    if (options) for (k in options) if (options.hasOwnProperty(k)) cfg[k] = options[k];
    // Lite tier: a quarter fewer pixels than 2x. The gradient is smooth, so
    // the upscale is not visible; the grain gets a touch coarser.
    if (global.lite && !(options && options.maxDPR)) cfg.maxDPR = 1.25;

    var gl = canvas.getContext('webgl', { antialias: false, alpha: false })
          || canvas.getContext('experimental-webgl', { antialias: false, alpha: false });

    if (!gl) {
      // No WebGL: paint a static gradient on the parent and bail out quietly.
      (canvas.parentNode || canvas).style.background = cfg.fallback;
      canvas.style.display = 'none';
      return null;
    }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('liquid-hero:', gl.getShaderInfoLog(s));
      }
      return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    // fBm runs 5 octaves, but detail is 0.05, so octave 2 carries a few
    // percent of the signal and octaves 3-5 under a tenth of a percent.
    // On the lite tier stop at 2: 5 + 5 noise calls per fbm pair becomes
    // 2 + 2, on every fragment of a full-screen canvas.
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER,
        global.lite ? FRAG.replace('i<5', 'i<2') : FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Fullscreen triangle: cheaper than a quad, no seam down the middle.
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {
      res:  gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      col:  gl.getUniformLocation(prog, 'u_col[0]'),
      stop: gl.getUniformLocation(prog, 'u_stop[0]'),
      mouse:   gl.getUniformLocation(prog, 'u_mouse'),
      pointer: gl.getUniformLocation(prog, 'u_pointer'),
      scroll:  gl.getUniformLocation(prog, 'u_scroll')
    };
    KEYS.forEach(function (n) { U[n] = gl.getUniformLocation(prog, 'u_' + n); });

    // Colours and stops never change at runtime, so upload them once.
    var flat = [];
    cfg.colors.forEach(function (c) { flat = flat.concat(hexToRgb(c)); });
    gl.uniform3fv(U.col, new Float32Array(flat));
    gl.uniform1fv(U.stop, new Float32Array(cfg.stops));
    KEYS.forEach(function (n) { gl.uniform1f(U[n], cfg[n]); });

    var w = 0, h = 0;
    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, cfg.maxDPR);
      var nw = Math.round(canvas.clientWidth * dpr);
      var nh = Math.round(canvas.clientHeight * dpr);
      if (nw === w && nh === h) return;
      w = canvas.width = nw;
      h = canvas.height = nh;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.res, w, h);
    }

    var STORE_KEY = 'liquid-hero:reduced';
    var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    var mqReduced = !!(mq && mq.matches);
    var forced = false;
    try { forced = global.localStorage.getItem(STORE_KEY) === '1'; } catch (e) {}
    function isReduced() { return mqReduced || forced; }
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) { mqReduced = e.matches; sync(); });
    }

    var clock = 0, last = performance.now(), raf = null, visible = true, awake = true;
    // Paused by scroll position (see setFrozen). Separate from isReduced(),
    // which is the visitor's own persisted motion preference.
    var frozen = false;

    // Pointer state: mx/my follow the cursor (eased), amt fades the effect in/out.
    var mx = 0, my = 0, tmx = 0, tmy = 0, amt = 0, tAmt = 0;

    var idle = null;
    function pointerTo(e) {
      if (isReduced()) return;
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tmx = ((e.clientX - r.left) / r.width - 0.5) * (r.width / r.height);
      tmy = 0.5 - (e.clientY - r.top) / r.height;
      tAmt = 1;
      // Relax the effect once the cursor stops moving.
      if (idle) clearTimeout(idle);
      idle = setTimeout(function () { tAmt = 0; }, 500);
    }
    // Listen on the window, not the canvas: the canvas sits at z-index -1
    // behind the page content, so it never receives pointer events itself.
    global.addEventListener('pointermove', pointerTo, { passive: true });
    global.addEventListener('pointerdown', pointerTo, { passive: true });
    document.addEventListener('pointerleave', function () { tAmt = 0; });

    // Draw a single frame with the current state.
    function render() {
      var red = isReduced();
      resize();
      var vh = canvas.clientHeight || 1;
      var scroll = red ? 0 : (global.pageYOffset || 0) / vh * cfg.parallax;
      gl.uniform1f(U.time, red ? 12.0 : clock);
      gl.uniform1f(U.scroll, scroll);
      gl.uniform2f(U.mouse, mx, my);
      gl.uniform1f(U.pointer, red ? 0 : cfg.pointer * amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!isReduced()) clock += dt * cfg.speed;

      mx += (tmx - mx) * cfg.pointerEase;
      my += (tmy - my) * cfg.pointerEase;
      amt += (tAmt - amt) * 0.05;

      render();
      raf = (visible && awake && !frozen && !isReduced()) ? requestAnimationFrame(frame) : null;
    }

    function start() {
      if (raf || !visible || !awake || frozen || isReduced()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Settle to the right state: animate, or freeze on a static frame.
    function sync() {
      if (isReduced()) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        render();
      } else {
        start();
      }
    }

    start();
    render();

    // Stop drawing when the hero area is scrolled away or the tab is
    // hidden. The canvas itself is now position:fixed (always on
    // screen), so watch the hero wrapper instead.
    if (global.IntersectionObserver) {
      // a canvas inside [data-liquid-watch] (e.g. the CTA box) is paused
      // by its own section, not the hero's
      var watch = canvas.closest('.hero-pin, [data-liquid-watch]')
        || document.querySelector('.hero-pin, .liquid-hero')
        || canvas;
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) sync();
      }, { threshold: 0 }).observe(watch);
    }

    document.addEventListener('visibilitychange', function () {
      awake = !document.hidden;
      if (awake) sync();
    });

    function onResize() {
      resize();
      if (isReduced()) render();
    }
    global.addEventListener('resize', onResize);

    return {
      // the canvas this instance draws, so other scripts can find it
      canvas: canvas,
      // read a param's current value, e.g. hero.get('warp')
      get: function (name) { return cfg[name]; },
      // Live-tweak a numeric param, e.g. hero.set('order', 0.9).
      // speed and pointer are read every frame, so they need no uniform.
      set: function (name, value) {
        if (name === 'speed' || name === 'pointer') { cfg[name] = value; return; }
        if (KEYS.indexOf(name) === -1) return;
        cfg[name] = value;
        gl.useProgram(prog);
        gl.uniform1f(U[name], value);
        if (isReduced()) render();
      },
      // Pause the animation, leaving the last frame on screen. Used once
      // the gradient is blurred out of focus behind the work: at a 90px
      // radius a still frame and a moving one are indistinguishable, so
      // re-filtering every frame is pure waste.
      setFrozen: function (v) {
        frozen = !!v;
        if (frozen) {
          if (raf) { cancelAnimationFrame(raf); raf = null; }
          render();
        } else {
          start();
        }
      },
      // Freeze / unfreeze all motion (persisted per visitor).
      setReduced: function (v) {
        forced = !!v;
        try { global.localStorage.setItem(STORE_KEY, forced ? '1' : '0'); } catch (e) {}
        sync();
      },
      toggleReduced: function () {
        this.setReduced(!forced);
        return isReduced();
      },
      isReduced: isReduced,
      destroy: function () {
        visible = awake = false;
        if (raf) cancelAnimationFrame(raf);
        global.removeEventListener('resize', onResize);
      }
    };
  }

  global.liquidHero = liquidHero;

  // Auto-mount any <canvas data-liquid-hero>, and wire up any
  // <button data-liquid-hero-toggle> to freeze / unfreeze them.
  function boot() {
    var instances = [];
    var nodes = document.querySelectorAll('[data-liquid-hero]');
    for (var i = 0; i < nodes.length; i++) {
      var inst = liquidHero(nodes[i]);
      if (!inst) continue;
      instances.push(inst);
      // A canvas that starts .is-ambient has no sharp hero above it, so
      // there is nothing to animate for - freeze it on its first frame.
      if (nodes[i].classList.contains('is-ambient')) inst.setFrozen(true);
    }
    liquidHero.instances = instances;

    var toggles = document.querySelectorAll('[data-liquid-hero-toggle]');
    if (!instances.length) {
      // No animated background to control (e.g. no WebGL) - hide the button.
      for (var h = 0; h < toggles.length; h++) toggles[h].hidden = true;
      return;
    }
    function syncToggles(on) {
      for (var j = 0; j < toggles.length; j++) {
        toggles[j].setAttribute('aria-pressed', on ? 'true' : 'false');
        var label = toggles[j].querySelector('.motion-toggle__label');
        if (label) label.textContent = on ? 'Enable Motion' : 'Reduce Motion';
      }
      document.documentElement.classList.toggle('liquid-hero-reduced', on);
    }
    syncToggles(instances[0].isReduced());
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function () {
        var on = instances[0].toggleReduced();
        for (var j = 1; j < instances.length; j++) instances[j].setReduced(on);
        syncToggles(on);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);

} catch (e) { console.error("site.js: liquid-hero", e); }

/* ======================================================================
   js/hero-shrink.js
   ====================================================================== */
try {
/* ============================================
   HERO SHRINK - drives .hero-frame from
   the scroll position.

   1. Shrink: the full-screen gradient eases into a
      centred square over the hero's held screen
      (desktop pin) or 60% of a screen (touch, no
      pin). Width and height pull in by different
      amounts, so the shape changes on the way.
   2. Lift: once it is a square, --lift moves it up
      1px per 1px scrolled, so it leaves the screen
      with the hero content.
   ============================================ */
(function () {
    var frame = document.querySelector('[data-hero-frame]');
    if (!frame) return;

    var html = document.documentElement;
    var reduce = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    function clamp01(v) { return Math.min(1, Math.max(0, v)); }
    // ease in-out, so the square settles instead of stopping dead
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // square size, from --frame-square in css/hero-shrink.css
    var squareFrac = 0.6;
    function readSize() {
        var v = parseFloat(getComputedStyle(frame).getPropertyValue('--frame-square'));
        if (v > 0 && v <= 1) squareFrac = v;
    }

    function isReduced() {
        return reduce.matches || html.classList.contains('liquid-hero-reduced');
    }
    // scroll length of the shrink: the pinned hold, measured from the page
    // (pin height minus the sticky hero), so it matches the CSS exactly on
    // every device. The pin is armed on phones too (initHeroPin in main.js).
    var pinEl = document.querySelector('.hero-pin');
    var heroEl = document.querySelector('.liquid-hero');
    function shrinkLength() {
        var vh = window.innerHeight || 1;
        if (pinEl && heroEl && html.classList.contains('has-hero-pin')) {
            var hold = pinEl.offsetHeight - heroEl.offsetHeight;
            if (hold > 0) return hold;
        }
        return vh;
    }
    // 0 = full screen, 1 = fully shrunk to the square (always 0 when reduced)
    function progress() {
        if (isReduced()) return 0;
        return ease(clamp01((window.pageYOffset || 0) / shrinkLength()));
    }
    // width of the page itself, without a desktop scrollbar - the frame is
    // this wide, so measuring with innerWidth made the square ~15px
    // narrower than tall wherever the scrollbar takes up room
    function pageWidth() {
        return document.documentElement.clientWidth || window.innerWidth || 1;
    }
    // height of the hero (100svh when pinned) - the square and the logo
    // centre on this, not on the screen
    function heroH_() {
        return (heroEl && heroEl.offsetHeight) || window.innerHeight || 1;
    }
    // side of the finished square, in px
    function squareSide() {
        return Math.min(pageWidth(), heroH_()) * squareFrac;
    }
    // shared with js/logo-3d.js, so the logo shrinks in step with the square
    window.heroShrink = { progress: progress, squareSide: squareSide };

    var ticking = false;
    function update() {
        ticking = false;

        // .is-active keeps the gradient sharp (no old blur-out) in both modes
        frame.classList.add('is-active');

        var vw = pageWidth();
        var vh = window.innerHeight || 1;
        var y = window.pageYOffset || 0;

        // Reduced motion: no shrink. The gradient stays full screen and just
        // scrolls away with the hero like a normal section, so the page
        // below is the same black + topo lines as the full version.
        if (isReduced()) {
            ['--inset-x', '--inset-top', '--inset-bottom', '--shrink'].forEach(function (k) {
                frame.style.setProperty(k, '0');
            });
            frame.style.setProperty('--lift', Math.min(y, vh * 1.1).toFixed(1));
            if (phrase) phrase.style.transform = '';   // no stretch
            if (intro) intro.style.transform = '';     // no slide
            stretchCards(false);                       // no card stretch
            stackCards(false);                         // no card stack
            return;
        }
        stretchCards(true);
        stackCards(true);

        var len = shrinkLength();
        var t = progress();

        // Intro line (bottom-left) lingers at the bottom of the screen past
        // the hero, then slides off to the left just before the project
        // cards come in. Driven by where the first card's top edge is
        // (INTRO_START / INTRO_END below). Falls back to the projects
        // section while the cards are still loading.
        if (intro) {
            var next = document.querySelector('.page-home .work-card__frame') ||
                document.querySelector('.portfolio-section');
            var nextTop = next ? next.getBoundingClientRect().top : Infinity;
            var ip = ease(clamp01((INTRO_START * vh - nextTop) /
                                  ((INTRO_START - INTRO_END) * vh)));
            // The line is position:fixed while the hero is pinned (css), so
            // it stays at the bottom of the screen with no help from here -
            // this only slides it off to the left. Far enough to clear the
            // left edge completely; measured only while it is moving, since
            // offsetLeft forces a layout.
            intro.style.transform = ip > 0
                ? 'translate3d(' + (-(intro.offsetLeft + intro.offsetWidth + 40) * ip).toFixed(1) + 'px,0,0)'
                : '';
        }

        // "For Dreamers" stretch: tall while the gradient still covers it,
        // easing back to its true shape as the square reveals it, and
        // settled exactly when the square is.
        if (phrase) {
            var k = 1 - t;   // 1 = fully stretched, 0 = settled
            var sx = 1 + (STRETCH_X - 1) * k;
            var sy = 1 + (STRETCH_Y - 1) * k;
            phrase.style.transform = k > 0.0005
                ? 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')'
                : '';
        }

        // final square: centred across, and centred down on the HERO rather
        // than the screen. They are the same on desktop; on phones the hero
        // is 100svh while the screen grows when the address bar hides, and
        // centring on the hero keeps the square around the logo.
        var side = squareSide();
        var heroH = heroH_();
        var insetX = (vw - side) / 2 * t;
        var insetTop = (heroH - side) / 2 * t;
        var insetBottom = (vh - (heroH + side) / 2) * t;

        frame.style.setProperty('--shrink', t.toFixed(4));
        frame.style.setProperty('--inset-x', insetX.toFixed(1));
        frame.style.setProperty('--inset-top', insetTop.toFixed(1));
        frame.style.setProperty('--inset-bottom', insetBottom.toFixed(1));
        // capped a little past one screen: by then it is fully off the top
        frame.style.setProperty('--lift', Math.min(Math.max(0, y - len), vh * 1.1).toFixed(1));
    }

    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    // "For Dreamers & Daredevils." spans the screen width: measure it at
    // 100px, then scale the font so its widest line fills the screen
    // less a small gutter each side.
    var phrase = document.querySelector('.hero-divider__text');
    var GUTTER = 0.02;   // share of the screen width left empty each side
    // Stretch as it comes in (see update): the scale it starts at while
    // hidden, easing to 1 x 1 as the square finishes shrinking.
    var STRETCH_Y = 2.2; // tall; 1 = no vertical stretch
    var STRETCH_X = 0.9; // a touch narrower, so it reads as pulled, not just zoomed

    // "Building Creative Systems..." lingers, then slides out left just
    // before the project cards arrive (see update). Positions of the first
    // card's top edge, as a share of the screen height from the top:
    var intro = document.querySelector('.liquid-hero__intro');
    var INTRO_START = 1.25; // starts sliding (card still a quarter screen below)
    var INTRO_END = 0.9;    // fully gone (card just peeking in at the bottom)

    // Project cards (homepage only - this file only loads there) get the
    // stretch as they come in: fully stretched when a card's image
    // frame comes up over the bottom of the screen, settled once its
    // centre reaches CARD_SETTLE (just below the middle of the screen).
    //  - Only the frame (the container) stretches - wide, from its top edge.
    //    The title under it is left alone.
    //  - The image inside counter-scales so it is never distorted: it keeps
    //    its proportions and zooms just enough to fill the stretched frame,
    //    easing back to normal with it. (The frame's overflow:hidden crops it.)
    //  - Uses the `scale` property, leaving the hover zoom's `transform` alone.
    // wide and a little short to start, narrowing back to the true shape
    var CARD_STRETCH_X = 1.5;   // starts 50% wider; 1 = no sideways stretch
    var CARD_STRETCH_Y = 0.9;   // and 10% shorter; 1 = no vertical change
    // Lite tier: skip the stretch. It rescales every frame in view, and
    // counter-scales the picture inside it, which re-rasterises a 640px
    // image per card per frame. The orange cover and its swipe stay.
    var NO_STRETCH = !!window.lite;
    // where the card's centre is (share of the screen height from the top)
    // when the stretch is done and the cover swipes off. 0.5 = dead centre;
    // higher = sooner.
    var CARD_SETTLE = 0.6;
    // Orange cover + swipe reveal: while the frame stretches it is a plain
    // orange rectangle (css/hero-shrink.css, .card-reveal); once it has
    // settled in the middle of the screen it gets .is-revealed and the
    // cover swipes away. It resets only once the card is back below the
    // screen, so it replays next time without flickering near the middle.
    function stretchCards(on) {
        // the cover only exists while this runs - reduced motion (or this
        // script failing) leaves the projects plainly visible
        html.classList.toggle('card-reveal', !!on);
        // re-queried each time: sanity-cards.js builds the cards after load
        var frames = document.querySelectorAll('.page-home .work-card__frame');
        var vh = window.innerHeight || 1;
        for (var i = 0; i < frames.length; i++) {
            var frameEl = frames[i];
            var imgs = frameEl.querySelectorAll('.work-card__img');
            var k = 0;
            if (on) {
                var h = frameEl.offsetHeight;       // unscaled height
                // the top edge is the scale origin, so the scale never moves it
                var top = frameEl.getBoundingClientRect().top;
                var centre = top + h / 2;
                var start = vh + h / 2;             // top edge at the bottom of the screen
                var end = vh * CARD_SETTLE;         // centre this far down the screen
                k = 1 - ease(clamp01((start - centre) / (start - end)));
                if (k < 0.0005) frameEl.classList.add('is-revealed');
                else if (top > vh) frameEl.classList.remove('is-revealed');
            }
            if (k < 0.0005 || NO_STRETCH) {
                frameEl.style.scale = '';
                for (var j = 0; j < imgs.length; j++) imgs[j].style.scale = '';
                continue;
            }
            var sx = 1 + (CARD_STRETCH_X - 1) * k;
            var sy = 1 + (CARD_STRETCH_Y - 1) * k;
            // undo the stretch, then zoom evenly by the larger of the two so
            // the image still covers the frame
            var m = Math.max(sx, sy);
            frameEl.style.transformOrigin = '50% 0';
            frameEl.style.scale = sx.toFixed(4) + ' ' + sy.toFixed(4);
            for (var n = 0; n < imgs.length; n++) {
                imgs[n].style.scale = (m / sx).toFixed(4) + ' ' + (m / sy).toFixed(4);
            }
        }
    }
    // Card stack (css: .card-reveal ... position: sticky). Each card holds
    // centred on the screen; as the next card slides up over it, the held
    // card's title fades out and the card shrinks a touch, so the images
    // read as a deck stacking up. 0 while the next card is still below the
    // screen, full once it has locked on top.
    //
    // No blur and no dim here on purpose. A filter on a position:sticky
    // element cannot be composited as a cached layer: changing it every
    // scroll frame forces the card - image and all - to be re-rasterised
    // and re-blurred on every frame, which is what dropped frames on
    // phones. The hiding is done by the next card's frame instead, which
    // is opaque (.work-card__frame carries a background colour and a
    // cover image), so the only thing that has to be taken away is the
    // covered card's title: it sits below the frame, in the band where
    // the next card is transparent, and would otherwise show through.
    var STACK_SHRINK = 0.06;  // how much smaller a covered card gets (0 = none)
    // How much of the next card's approach the title fade is spread over.
    // It has to finish early: by the time the next card is ~40% of the way
    // up, its frame has physically covered the band the title sits in, so a
    // fade spread over the whole travel would only reach ~0.6 before being
    // hidden anyway and would not read as a fade at all. 0.45 has it gone
    // just before it would be covered. 1 = fade over the full travel.
    var TITLE_FADE_BY = 0.45;

    // Geometry is cached: offsetHeight forces a layout, so it is measured
    // on resize and when the cards change, never per scroll frame.
    var stackEls = [];      // the cards
    var stackMetas = [];    // their .work-card__meta - the bit that fades
    var stackTops = [];     // scratch for the read pass
    var stackTop = 0;       // sticky offset, shared by every card

    function measureStack() {
        stackEls = Array.prototype.slice.call(document.querySelectorAll(
            '.page-home .work-scatter--squish .work-card'));
        stackMetas = stackEls.map(function (c) {
            return c.querySelector('.work-card__meta');
        });
        stackTops.length = stackEls.length;
        if (!stackEls.length) return;

        // One offset for all of them, taken from the first card, written on
        // the grid and inherited by every card. Centring each card on its
        // own height staggered the frames whenever a title wrapped to two
        // lines, and the frames have to land on exactly the same y for the
        // stack to occlude cleanly.
        var vh = window.innerHeight || 1;
        stackTop = Math.max(16, (vh - stackEls[0].offsetHeight) / 2);
        var g = document.querySelector('.page-home .work-scatter--squish');
        if (g) g.style.setProperty('--stack-top', stackTop.toFixed(1) + 'px');
    }

    function stackCards(on) {
        if (!on) {
            for (var i = 0; i < stackEls.length; i++) {
                // filter and opacity are cleared as well as scale: a visitor
                // who turns motion off mid-scroll would otherwise keep
                // whatever an earlier build had written onto the card.
                stackEls[i].style.filter = '';
                stackEls[i].style.opacity = '';
                stackEls[i].style.scale = '';
                if (stackMetas[i]) stackMetas[i].style.opacity = '';
            }
            return;
        }

        var n = stackEls.length;
        if (!n) return;
        var vh = window.innerHeight || 1;
        var denom = Math.max(1, vh - stackTop);

        // Read pass: every getBoundingClientRect() up front, so none of the
        // writes below can force a reflow in between.
        for (var r = 0; r < n; r++) {
            stackTops[r] = stackEls[r].getBoundingClientRect().top;
        }

        // Write pass.
        for (var w = 0; w < n; w++) {
            var card = stackEls[w];
            var meta = stackMetas[w];
            // how far the NEXT card has come up over this one
            var p = (w + 1 < n) ? clamp01((vh - stackTops[w + 1]) / denom) : 0;
            if (p < 0.001) {
                if (card.style.scale) card.style.scale = '';
                if (meta && meta.style.opacity) meta.style.opacity = '';
            } else {
                card.style.scale = (1 - p * STACK_SHRINK).toFixed(4);
                if (meta) {
                    var tp = clamp01(p / TITLE_FADE_BY);
                    meta.style.opacity = (1 - tp).toFixed(3);
                }
            }
        }
    }

    function fitPhrase() {
        if (!phrase) return;
        phrase.style.fontSize = '100px';
        var w = phrase.offsetWidth;
        if (!w) return;
        var target = document.documentElement.clientWidth * (1 - GUTTER * 2);
        phrase.style.fontSize = (100 * target / w).toFixed(2) + 'px';
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
        readSize(); fitPhrase(); measureStack(); onScroll();
    });
    fitPhrase();
    // re-fit once the serif font has loaded, since it changes the width
    // the serif changes the title widths, which changes how many lines a
    // title takes, which changes the card height the stack is centred on
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { fitPhrase(); measureStack(); onScroll(); });
    }
    // the motion toggle flips a class on <html>
    new MutationObserver(onScroll).observe(html, { attributes: true, attributeFilter: ['class'] });
    // project cards arrive from Sanity after load - measure them and place
    // their stretch / cover straight away, rather than waiting for a scroll
    var grid = document.querySelector('.page-home .work-scatter');
    if (grid) {
        new MutationObserver(function () { measureStack(); onScroll(); })
            .observe(grid, { childList: true, subtree: true });
    }
    readSize();
    measureStack();
    update();
})();

} catch (e) { console.error("site.js: hero-shrink", e); }

/* ======================================================================
   js/montage.js
   ====================================================================== */
try {
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

    /* The square is ~175px on a phone and ~400px on a laptop, but every
       picture was requested at 900x900. Ask for what it is shown at, at
       up to 2x density (1.5x on the lite tier), rounded up to a hundred
       so the CDN caches a handful of sizes rather than one per window. */
    const SIDE = Math.max(300, Math.ceil(box.offsetWidth *
        Math.min(window.devicePixelRatio || 1, window.lite ? 1.5 : 2) / 100) * 100) || 900;

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
            '?w=' + SIDE + '&h=' + SIDE + '&fit=crop&auto=format&q=75';
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
    let firstFrame = null;   /* cards arrive from Sanity; found lazily */
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

        /* Fade out once the first project card has covered the square.
           The square is fixed, so its top is constant; the card's frame
           rises over it. 0 until the frame's top edge reaches the square's
           top edge (the frame is wider and taller, so from there the
           square is fully hidden), then 1 a tenth of a screen later. The
           fade therefore happens behind the card, never in view. */
        if (!firstFrame || !firstFrame.isConnected) {
            firstFrame = document.querySelector('.page-home .work-card__frame');
        }
        let out = 0;
        if (firstFrame) {
            const squareTop = box.getBoundingClientRect().top;
            const frameTop = firstFrame.getBoundingClientRect().top;
            out = Math.min(1, Math.max(0, (squareTop - frameTop) / (vh * 0.1)));
        }
        box.style.setProperty('--montage-out', out.toFixed(3));

        /* only run the cycle while it is actually on screen. On the About
           page the square sits in the skills layer, which js/cta-grow.js
           fades in; it is on screen once that has some opacity. */
        const host = box.closest('[data-grow-skills]');
        const shown = !host || host.style.opacity === '' ||
            parseFloat(host.style.opacity) > 0.01;
        if (p > 0.01 && out < 1 && shown && !document.hidden) start();
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

} catch (e) { console.error("site.js: montage", e); }

/* ======================================================================
   js/cta-grow.js
   ====================================================================== */
try {
/* ============================================
   CTA GROW - grows a liquid box from a small
   centred square (the size the hero square ends
   at) out to near full screen, while its stage
   is held. See css/cta-grow.css.

   Works on every [data-cta-pin] on the page (the
   About page has one at the top and one at the
   bottom). Inside a pin:
     [data-grow-text]  rises into focus as the box
                       fills out (the CTA heading
                       does this without the attribute)
     [data-grow-link]  glides in after it (the CTA's
                       "Start a project" link does too)
   Optional on the pin:
     data-grow-lead="0"  how many screens before the
                       stage locks the growth starts
                       (default 0.35; 0 suits a pin at
                       the very top of a page)
     data-grow-reverse   start expanded, text showing,
                       and shrink to the square on
                       scroll (About page top)
   ============================================ */
(function () {
    var pins = document.querySelectorAll('[data-cta-pin]');
    if (!pins.length) return;
    var html = document.documentElement;
    var reduce = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    // ---- tunables ----
    var START_SQUARE = 0.45;  // starting square, share of the screen's shorter side
                              // (same as --frame-square for the hero)
    var MARGIN_X = 0.05;      // final gap at the left and right, share of the width
    var MARGIN_Y = 0.08;      // final gap at the top and bottom, share of the height
    var MARGIN_MIN = 16;      // never closer to the edge than this, in px
    // Timing. The growth starts LEAD screens before the stage locks (so the
    // square is already opening as it arrives) and finishes GROW_PORTION of
    // the way through the hold, leaving the rest as a rest on the finished
    // box before the section lets go.
    var LEAD = 0.35;
    var GROW_PORTION = 0.7;
    var ZOOM = 0.15;          // the gradient starts this much zoomed in and
                              // settles to 1 as the box opens (like the hero)
    var TEXT_FROM = 0.45;     // text rises into focus between these
    var TEXT_TO = 0.85;       //   two amounts of growth
    var TEXT_RISE = 28;       // px it rises
    var TEXT_BLUR = 10;       // px of blur it comes out of
    var LINK_FROM = 0.65;     // the link glides in between these
    var LINK_TO = 1;
    var LINK_SLIDE = 80;      // px it slides in from the left
    var AFTER_FROM = 0.3;     // [data-grow-after] stretches in as the growth
    var AFTER_TO = 0;         //   falls between these. Ending at 0 lands it
                              //   exactly as the box finishes closing, so it
                              //   is not left sitting there mid-scroll
    var AFTER_SQUEEZE = 0.2;  // the horizontal scale it stretches out from
    var AFTER_SPAN = 0.92;    // the width it is fitted to, share of the stage
    var P2_GROW = 0.6;        // phase 2 (data-grow-split), as a share of it: the
    var P2_SOLID_FROM = 0.3;  //   promise slides off and the box grows together,
    var P2_SKILLS = 0.62;     //   done by P2_GROW; the blue starts at P2_SOLID_FROM
                              //   of the growth and the skills play from P2_SKILLS

    // ---- hover on the link: the gradient goes wild ----
    // Only two things change: it moves faster, and its colours cycle through
    // the hue wheel (hue-rotate + saturate on the canvas). The pattern itself
    // - density, warp, cursor pull - stays exactly as it is. On leave it
    // slows back down and the hue keeps turning until it lands back on the
    // brand palette.
    var WILD = {              // the gradient's settings at full hover
        speed: 2.4            // ~8x the normal drift (normal 0.3)
    };
    var HUE_SPEED = 120;      // degrees of hue per second while hovered
    var SATURATE = 0.3;       // extra saturation at full hover (0.3 = +30%)

    // ease out, so things glide to a stop rather than snapping
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function clamp01(v) { return Math.min(1, Math.max(0, v)); }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function isReduced() {
        return reduce.matches || html.classList.contains('liquid-hero-reduced');
    }

    function setup(pin) {
        var stage = pin.querySelector('.cta-stage');
        var frame = pin.querySelector('[data-cta-frame]');
        if (!stage || !frame) return null;
        var canvas = frame.querySelector('canvas');
        var texts = pin.querySelectorAll('[data-grow-text], .cta-band__heading');
        var link = pin.querySelector('[data-grow-link], .cta-band__link');
        var afters = pin.querySelectorAll('[data-grow-after]');
        var fittedW = 0;

        // one line across the stage: measured at 100px, then scaled, since
        // width is linear in font size. Only when the stage width changes.
        function fitAfters(w) {
            if (w === fittedW) return;
            fittedW = w;
            for (var i = 0; i < afters.length; i++) {
                var a = afters[i];
                a.style.fontSize = '100px';
                var nat = a.offsetWidth;   // transforms do not affect this
                if (nat) a.style.fontSize = (100 * w * AFTER_SPAN / nat).toFixed(2) + 'px';
            }
        }
        var leadAttr = parseFloat(pin.getAttribute('data-grow-lead'));
        var lead = isNaN(leadAttr) ? LEAD : leadAttr;
        // data-grow-portion: how much of the hold the growth uses. The rest
        // is a rest on the finished box - raise it to cut that tail short.
        var portionAttr = parseFloat(pin.getAttribute('data-grow-portion'));
        var portion = isNaN(portionAttr) ? GROW_PORTION : portionAttr;
        // data-grow-reverse: start expanded (text showing) and shrink to the
        // square as you scroll, like the homepage hero
        var reverse = pin.hasAttribute('data-grow-reverse');
        // data-grow-split: share of the hold used by the shrink and the
        // promise; the rest is phase 2 - the promise fades, the box grows
        // to full bleed and turns solid blue, then [data-grow-skills] plays
        var splitAttr = parseFloat(pin.getAttribute('data-grow-split'));
        var split = isNaN(splitAttr) ? 0 : splitAttr;
        var blue = pin.querySelector('.cta-blue');
        var solid = pin.querySelector('.cta-solid');
        var skills = pin.querySelector('[data-grow-skills]');
        var play = pin.querySelector('[data-grow-play]');

        function update() {
            var w = stage.clientWidth || 1;
            var h = stage.clientHeight || 1;
            var reduced = isReduced();

            // 0 = small square, 1 = grown to the margins
            var g = 1, q = 0;
            if (!reduced) {
                var hold = Math.max(1, pin.offsetHeight - h);
                var s = -pin.getBoundingClientRect().top + lead * h;
                var hold1 = split ? hold * split : hold;
                g = ease(clamp01(s / (hold1 * portion + lead * h)));
                if (reverse) g = 1 - g;
                if (split) q = clamp01((s - hold1) / Math.max(1, hold - hold1));
            }
            // phase 2: the promise slides off (fade, 0 to 1) while the box
            // grows from the square to full bleed (grow), going solid blue
            // one eased value drives both, so the slide and the growth move as one
            var grow = ease(clamp01(q / P2_GROW));
            var fade = grow;

            var side = Math.min(w, h) * START_SQUARE;
            var sx = (w - side) / 2, sy = (h - side) / 2;           // square
            var mx = Math.max(MARGIN_MIN, w * MARGIN_X);            // margins
            var my = Math.max(MARGIN_MIN, h * MARGIN_Y);
            var ix = sx + (mx - sx) * g, iy = sy + (my - sy) * g;
            if (q > 0) { ix = sx * (1 - grow); iy = sy * (1 - grow); }
            frame.style.setProperty('--ix', ix.toFixed(1));
            frame.style.setProperty('--it', iy.toFixed(1));
            frame.style.setProperty('--ib', iy.toFixed(1));
            if (blue) {
                blue.style.setProperty('--ix', ix.toFixed(1));
                blue.style.setProperty('--it', iy.toFixed(1));
                blue.style.setProperty('--ib', iy.toFixed(1));
            }

            // the gradient settles from a slight zoom as the box opens
            if (canvas) canvas.style.scale = reduced ? '' : (1 + ZOOM * (1 - (q > 0 ? grow : g))).toFixed(4);
            if (solid) {
                // the liquid gives way as the blue comes in, so it is gone
                // by the time the box is solid
                var sa = clamp01((grow - P2_SOLID_FROM) / (1 - P2_SOLID_FROM));
                solid.style.setProperty('--solid', sa.toFixed(3));
                if (canvas) canvas.style.opacity = reduced || !sa ? '' : (1 - sa).toFixed(3);
            }
            if (skills) {
                skills.style.opacity = reduced ? '' : clamp01((q - P2_SKILLS) / 0.06).toFixed(3);
                if (play && !reduced) {
                    if (q > P2_SKILLS + 0.02) play.classList.add('is-in');
                    else if (q < P2_SKILLS - 0.1) play.classList.remove('is-in');
                }
            }

            // text rises a touch and comes into focus as the box fills out
            var tp = easeOut(clamp01((g - TEXT_FROM) / (TEXT_TO - TEXT_FROM)));
            for (var i = 0; i < texts.length; i++) {
                var t = texts[i];
                if (reduced) { t.style.opacity = t.style.transform = t.style.filter = ''; continue; }
                t.style.opacity = tp.toFixed(3);
                t.style.transform = tp < 1
                    ? 'translate3d(0,' + ((1 - tp) * TEXT_RISE).toFixed(1) + 'px,0)' : '';
                t.style.filter = tp < 1
                    ? 'blur(' + ((1 - tp) * TEXT_BLUR).toFixed(2) + 'px)' : '';
            }
            // the link glides in from the left after it, and fades up
            if (link) {
                if (reduced) {
                    link.style.transform = '';
                    link.style.opacity = '';
                } else {
                    var lp = easeOut(clamp01((g - LINK_FROM) / (LINK_TO - LINK_FROM)));
                    link.style.transform = lp < 1
                        ? 'translate3d(' + (-(1 - lp) * LINK_SLIDE).toFixed(1) + 'px,0,0)'
                        : '';
                    link.style.opacity = lp.toFixed(3);
                }
            }

            // stretches in across the stage as the box closes, after the text,
            // then in phase 2 its first half slides off to the left and its
            // last half off to the right
            if (afters.length) {
                fitAfters(w);
                var ap = easeOut(clamp01((AFTER_FROM - g) / (AFTER_FROM - AFTER_TO)));
                for (var j = 0; j < afters.length; j++) {
                    var a = afters[j];
                    var halves = a.children;
                    if (reduced) {
                        a.style.opacity = a.style.transform = '';
                        for (var k = 0; k < halves.length; k++) halves[k].style.transform = '';
                        continue;
                    }
                    a.style.opacity = ap.toFixed(3);
                    a.style.transform = ap < 1
                        ? 'scaleX(' + (AFTER_SQUEEZE + (1 - AFTER_SQUEEZE) * ap).toFixed(4) + ')'
                        : '';
                    for (var k = 0; k < halves.length; k++) {
                        halves[k].style.transform = fade > 0
                            ? 'translate3d(' + ((k ? 1 : -1) * fade * w).toFixed(1) + 'px,0,0)' : '';
                    }
                }
            }
        }

        // ---- wild hover on the link ----
        var inst = null, calm = null;
        var hovering = false, amt = 0, hue = 0, wildRaf = null, lastT = 0;

        // liquid-hero.js boots after this file, so look the instance up lazily
        function findInst() {
            if (inst) return inst;
            var list = (window.liquidHero && window.liquidHero.instances) || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i].canvas === canvas) inst = list[i];
            }
            if (inst && !calm) {
                calm = {};
                for (var k in WILD) calm[k] = inst.get(k);
            }
            return inst;
        }

        function wildFrame(now) {
            var dt = Math.min((now - lastT) / 1000, 0.05);
            lastT = now;
            // ramp in quickly, out a little slower
            amt += ((hovering ? 1 : 0) - amt) * (1 - Math.exp(-dt * (hovering ? 6 : 3)));

            if (hovering) {
                hue += dt * HUE_SPEED * amt;
            } else if (hue !== 0) {
                // keep turning forward to the next full turn, slowing as it lands
                var target = Math.ceil(hue / 360) * 360;
                hue = Math.min(target, hue + Math.max((target - hue) * dt * 2.5, dt * 40));
                if (hue >= target) hue = 0;
            }

            for (var k in WILD) inst.set(k, calm[k] + (WILD[k] - calm[k]) * amt);

            if (!hovering && amt < 0.002 && hue === 0) {
                for (var c in calm) inst.set(c, calm[c]);
                canvas.style.filter = '';
                wildRaf = null;
                return;
            }
            canvas.style.filter = 'hue-rotate(' + (hue % 360).toFixed(1) + 'deg) ' +
                'saturate(' + (1 + SATURATE * amt).toFixed(3) + ')';
            wildRaf = requestAnimationFrame(wildFrame);
        }

        function setWild(on) {
            if (on && isReduced()) return;
            if (!findInst()) return;
            hovering = on;
            if (!wildRaf) { lastT = performance.now(); wildRaf = requestAnimationFrame(wildFrame); }
        }

        if (link && canvas) {
            link.addEventListener('mouseenter', function () { setWild(true); });
            link.addEventListener('mouseleave', function () { setWild(false); });
            link.addEventListener('focus', function () { setWild(true); });
            link.addEventListener('blur', function () { setWild(false); });
        }

        // a fit taken before the webfont lands would use the fallback's widths
        if (afters.length && document.fonts) {
            document.fonts.ready.then(function () { fittedW = 0; update(); });
        }

        return update;
    }

    var updaters = [];
    for (var p = 0; p < pins.length; p++) {
        var u = setup(pins[p]);
        if (u) updaters.push(u);
    }

    var ticking = false;
    function updateAll() {
        ticking = false;
        for (var i = 0; i < updaters.length; i++) updaters[i]();
    }
    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(updateAll); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    new MutationObserver(onScroll).observe(html, { attributes: true, attributeFilter: ['class'] });
    updateAll();
})();

} catch (e) { console.error("site.js: cta-grow", e); }

/* ======================================================================
   js/about-v2.js
   ====================================================================== */
try {
/* ============================================
   ABOUT v2 - the Selected Clients links
   point at each case study. Same address rule as
   js/sanity-cards.js: /work/<slug> on the live
   domain, case-study.html?p=<slug> everywhere else.
   ============================================ */
(function () {
    var live = /(^|\.)doubledashcreative\.com$/.test(location.hostname);
    var links = document.querySelectorAll('[data-case-slug]');
    for (var i = 0; i < links.length; i++) {
        var slug = links[i].getAttribute('data-case-slug');
        links[i].href = live ? '/work/' + slug : 'case-study.html?p=' + slug;
    }
})();

} catch (e) { console.error("site.js: about-v2", e); }

/* ======================================================================
   js/projects-v2.js
   ====================================================================== */
try {
/* ============================================
   PROJECTS v2 - see css/projects-v2.css.
   1. Sizes the opening statement to span the
      screen (desktop; phones let it wrap).
   2. Quiet fade-and-rise as each card enters.
   ============================================ */
(function () {
    if (!document.body.classList.contains('pj-v2')) return;

    // ---- 1. statement spans the screen ----
    var statement = document.querySelector('.pj-statement');
    var wide = window.matchMedia ? window.matchMedia('(min-width: 761px)') : { matches: true };

    // fills the page column (the same width as the grid below it)
    function fit() {
        if (!statement) return;
        if (!wide.matches) { statement.style.fontSize = ''; return; }
        var box = statement.parentElement;
        var cs = getComputedStyle(box);
        var target = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        statement.style.fontSize = '100px';
        var w = statement.scrollWidth;
        if (!w || !target) return;
        statement.style.fontSize = (100 * target / w).toFixed(2) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts) {
        if (document.fonts.ready) document.fonts.ready.then(fit);
        if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fit);
    }

    /* The cards reveal with the site's orange swipe now, which
       js/sanity-cards.js arms from data-reveal on the grid. This file
       only sizes the opening statement. */
})();

} catch (e) { console.error("site.js: projects-v2", e); }
