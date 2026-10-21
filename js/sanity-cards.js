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
