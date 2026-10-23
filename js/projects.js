/* ============================================
   CASE STUDIES

   The content lives in a Google Sheet. Edit the sheet, refresh the site
   - there is nothing to re-upload. Setup is in content/SHEET-SETUP.md.

   Pages are  /work/<project>, listed on the home page

   THE COLUMNS
     project   which case study the row belongs to
     type      intro | hero | media | text
     file      image path like furari/bag.jpg, or a video filename
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

   Video: point `file` at a .mp4/.webm/.mov. Just the filename, they all
   live in assets/videos. Muted, looping, and only starts once it scrolls
   into view, so a page of clips does not all download at once.
   ============================================ */

/* Sanity. A project published in the Studio overrides the sheet's version
   of the same slug, so you can migrate one project at a time. These are
   public identifiers, not secrets: reads from a public dataset need no
   token, and none should ever appear in this file. */
const SANITY = {
    projectId: '7z9npbl2',
    dataset: 'production',
    apiVersion: '2024-01-01',   // pinned on purpose, not a floating version
};

/* Paste your published-CSV link here. Empty = use the local file.
   File > Share > Publish to web > Comma-separated values (.csv) */
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSrdv6YAEKeOIZoAZhfAtO8Gjmh5l32fDEx-QDb1QHP0YRMM-nGQW_WKENFOQqsQvjkodoygqeDVKp-/pub?output=csv';

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
    const LOCAL = '/content/projects.csv';
    const ASSETS = '/assets/portfolio/';
    const VIDEOS = '/assets/videos/';
    const VIDEO = /\.(mp4|webm|mov)$/i;

    const mount = document.querySelector('[data-case-study]');
    if (!mount) return;

    /* Hold the loading screen until the sheet has arrived, the page is
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

    /* ---- CSV: quoted commas, escaped quotes, multi-line cells ---- */
    function parseCSV(text) {
        const rows = [];
        let row = [], field = '', quoted = false, i = 0;

        text = text.replace(/\r\n?/g, '\n');
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        while (i < text.length) {
            const c = text[i];
            if (quoted) {
                if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                    quoted = false; i++; continue;
                }
                field += c; i++; continue;
            }
            if (c === '"') { quoted = true; i++; continue; }
            if (c === ',') { row.push(field); field = ''; i++; continue; }
            if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
            field += c; i++;
        }
        if (field.length || row.length) { row.push(field); rows.push(row); }
        return rows;
    }

    function toRecords(table) {
        if (!table.length) return [];
        const head = table[0].map(function (h) { return h.trim().toLowerCase(); });

        return table.slice(1).map(function (cells) {
            const rec = {};
            head.forEach(function (key, n) { rec[key] = (cells[n] || '').trim(); });
            return rec;
        }).filter(function (r) {
            /* drop blank rows, and rows you have commented out with # */
            return r.project && r.project.charAt(0) !== '#' && r.type;
        });
    }

    function toProjects(records) {
        const out = {};
        records.forEach(function (r) {
            const slug = r.project.toLowerCase();
            if (!out[slug]) out[slug] = { slug: slug, title: r.project, rows: [] };

            /* the intro row doubles as the project's header */
            if (r.type.toLowerCase() === 'intro') {
                if (r.heading) out[slug].title = r.heading;
                out[slug].role = r.alt;
            }
            out[slug].rows.push(r);
        });
        return out;
    }

    /* ---- rendering ---- */
    /* images live under assets/portfolio in their project folder, videos
       all sit together in assets/videos, so the sheet only needs the
       filename for a video. Anything already absolute is left alone,
       which is how Sanity's CDN URLs pass through untouched. */
    const src = function (p) {
        if (/^https?:\/\//i.test(p)) return p;
        return (VIDEO.test(p) ? VIDEOS : ASSETS) + p;
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
            '<h2 class="case-study-scope__title">Scope</h2><ul>' +
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
        return '<section class="section cs-band"><div class="container">' +
            '<div class="case-study-solution">' +
            '<div class="content"><h2 class="heading-lg">' + r.heading + '</h2></div>' +
            '<div class="content">' + paras(r.text) + '</div>' +
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


    function grab(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (res) {
            if (!res.ok) throw new Error(url + ' -> ' + res.status);
            return res.text();
        });
    }

    /* the sheet is the source of truth; the local file is what shows if
       it is unreachable, or if no sheet has been set up yet */
    const loadSheet = SHEET_URL
        ? grab(SHEET_URL).catch(function (err) {
            console.warn('Sheet unreachable, using ' + LOCAL, err);
            return grab(LOCAL);
        })
        : grab(LOCAL);

    /* Sanity is optional: if it is unreachable the sheet still renders */
    const loadSanity = SANITY.projectId
        ? fetch('https://' + SANITY.projectId + '.' + SANITY_HOST + '/v' +
            SANITY.apiVersion + '/data/query/' + SANITY.dataset +
            '?query=' + encodeURIComponent(GROQ))
            .then(function (r) { return r.ok ? r.json() : { result: [] }; })
            .then(function (j) { return j.result || []; })
            .catch(function (err) {
                console.warn('Sanity unreachable, sheet only', err);
                return [];
            })
        : Promise.resolve([]);

    /* og: tags key off property=, twitter: off name=, so which attribute to
       match on has to be passed in rather than guessed. Missing tag = no-op. */
    function setMeta(attr, key, value) {
        const el = document.querySelector('meta[' + attr + '="' + key + '"]');
        if (el) el.setAttribute('content', value);
    }

    Promise.all([loadSheet, loadSanity]).then(function (both) {
        const projects = toProjects(toRecords(parseCSV(both[0])));

        /* a project published in Sanity replaces the sheet's version */
        both[1].forEach(function (doc) {
            if (!doc.slug) return;
            projects[String(doc.slug).toLowerCase()] = sanityToRows(doc);
        });

        const project = projects[slug];

        if (!project) {
            message(
                slug ? 'No write-up for &ldquo;' + slug + '&rdquo;' : 'Pick a project',
                '<p>In the sheet so far:</p><ul class="cs-missing__list">' +
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

        if (!SHEET_URL && location.protocol === 'file:') {
            message('Open this through a server',
                '<p>A page opened straight off the disk is not allowed to read ' +
                '<code>' + LOCAL + '</code>. Publish your sheet and paste the link ' +
                'into <code>SHEET_URL</code> at the top of <code>js/projects.js</code> ' +
                'and this goes away - a sheet loads fine from anywhere.</p>');
            return;
        }
        message('Content did not load',
            '<p>Neither the sheet nor <code>' + LOCAL + '</code> could be read.</p>' +
            '<p><a href="/">Back to the projects</a></p>');
    });
}());
