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
/* Editing locally? Use the uncached API so a publish shows on the next
   refresh. In production use the CDN, which is faster and far cheaper
   but holds a 60 second cache - fine for visitors, maddening when you
   are iterating on copy. */
const SANITY_HOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'api.sanity.io'
    : 'apicdn.sanity.io';

/* Clean case study urls are produced by .htaccess plus case.php, and a
   local dev server has neither. Anything that is not the live host gets
   the template with a query string instead, which the case study
   renderer still understands. That keeps Live Server, a phone on the
   LAN and a bare file:// preview all working. */
function caseUrl(slug) {
    const live = /(^|\.)doubledashcreative\.com$/.test(location.hostname);
    return live ? '/work/' + slug : 'case-study.html?p=' + slug;
}

(function () {
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
    const LIMIT = scatter.getAttribute('data-limit') ? parseInt(scatter.getAttribute('data-limit'), 10) : null;

    /* A phone cannot hover, so a hover video there can never play: it is
       megabytes fetched to sit behind a poster nobody will ever trigger.
       Touch devices get the still image and nothing else. */
    const CAN_HOVER = window.matchMedia('(hover: hover)').matches;

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
        return u ? u + '?w=900&auto=format&q=80' : '';
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : s;
        return d.innerHTML;
    }

    function buildCard(p) {
        const still = p.cardStill && p.cardStill.asset;
        if (!still) return null;

        const hover = p.cardHover || {};
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

        a.innerHTML =
            '<span class="work-card__frame">' + frame + '</span>' +
            '<span class="work-card__meta">' +
            '<span class="work-card__title" data-title="' + esc(p.title) + '">' +
            esc(p.title) + '</span></span>';
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

    /* [data-contrast-titles]: each title takes a colour that reads against
       the part of its own image it overlaps. The brand orange is kept
       whenever it clears 3:1 (WCAG AA for large text); otherwise the title
       switches to whichever of cream or black contrasts more. */
    function hexRgb(hex) {
        const n = parseInt(hex.trim().replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function luminance(rgb) {
        const c = rgb.map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    function contrast(a, b) {
        const la = luminance(a), lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    /* A separate small, CORS-enabled copy of the card image: reading pixels
       from the displayed one would taint the canvas, and refetching it with
       crossOrigin set would download the full-size image twice. */
    const samples = new WeakMap();

    function sampleFor(card) {
        if (samples.has(card)) return samples.get(card);

        const img = card.querySelector('img.work-card__img:not(.work-card__img--hover)');
        const vid = card.querySelector('video.work-card__img');
        let url = img ? (img.currentSrc || img.src) : vid && vid.getAttribute('poster');

        const p = new Promise(function (resolve) {
            if (!url) return resolve(null);
            if (url.indexOf('cdn.sanity.io') !== -1) url = url.replace(/([?&])w=\d+/, '$1w=160');
            const s = new Image();
            s.crossOrigin = 'anonymous';
            s.onload = function () { resolve(s); };
            s.onerror = function () { resolve(null); };
            s.src = url;
        });
        samples.set(card, p);
        return p;
    }

    /* Average colour of the image under the title. The overlap is the
       intersection of the title and frame boxes, mapped back through
       object-fit: cover (scale to fill, centred) into image pixels. */
    function overlapColour(im, frame, title) {
        const fr = frame.getBoundingClientRect();
        const tr = title.getBoundingClientRect();
        const x0 = Math.max(fr.left, tr.left), x1 = Math.min(fr.right, tr.right);
        const y0 = Math.max(fr.top, tr.top), y1 = Math.min(fr.bottom, tr.bottom);
        if (x1 <= x0 || y1 <= y0) return null;

        const w = im.naturalWidth, h = im.naturalHeight;
        const s = Math.max(fr.width / w, fr.height / h);
        const ox = (fr.width - w * s) / 2, oy = (fr.height - h * s) / 2;
        const sw = (x1 - x0) / s, sh = (y1 - y0) / s;

        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(sw));
        cv.height = Math.max(1, Math.round(sh));
        const ctx = cv.getContext('2d');
        ctx.drawImage(im, (x0 - fr.left - ox) / s, (y0 - fr.top - oy) / s, sw, sh,
            0, 0, cv.width, cv.height);

        let d;
        try { d = ctx.getImageData(0, 0, cv.width, cv.height).data; }
        catch (e) { return null; } // no CORS on this image: keep the default

        let r = 0, g = 0, b = 0;
        const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        return [r / n, g / n, b / n];
    }

    function contrastTitles() {
        const root = getComputedStyle(document.documentElement);
        const orange = root.getPropertyValue('--color-orange');
        const fallbacks = ['--color-cream', '--color-black'].map(function (v) {
            return root.getPropertyValue(v);
        });

        scatter.querySelectorAll('.work-card').forEach(function (card) {
            const title = card.querySelector('.work-card__title');
            const frame = card.querySelector('.work-card__frame');
            if (!title || !frame) return;

            sampleFor(card).then(function (im) {
                if (!im) return;
                const bg = overlapColour(im, frame, title);
                if (!bg) return;

                let pick = orange;
                if (contrast(hexRgb(orange), bg) < 3) {
                    pick = fallbacks.reduce(function (best, c) {
                        return contrast(hexRgb(c), bg) > contrast(hexRgb(best), bg) ? c : best;
                    });
                }
                title.style.color = pick.trim();
            });
        });
    }

    const FIT_TITLES = scatter.hasAttribute('data-fit-titles');
    const CONTRAST_TITLES = scatter.hasAttribute('data-contrast-titles');

    /* contrast runs after fitting: the overlap it samples depends on the
       title's final size */
    function layoutTitles() {
        if (FIT_TITLES) fitTitles();
        if (CONTRAST_TITLES) contrastTitles();
    }

    if (FIT_TITLES || CONTRAST_TITLES) {
        let pending = 0;
        window.addEventListener('resize', function () {
            cancelAnimationFrame(pending);
            pending = requestAnimationFrame(layoutTitles);
        });
    }

    const QUERY = '*[_type == "project" && defined(slug.current)] | order(order asc) {' +
        'title, "slug": slug.current, categories, order, featured, cardStill, cardHover}';

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

            /* measuring before the webfont lands would size off the
               fallback serif's widths */
            if (FIT_TITLES || CONTRAST_TITLES) {
                document.fonts.ready.then(layoutTitles);
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
