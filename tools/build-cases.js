/* ============================================
   BUILD THE CASE STUDY PAGES

     node tools/build-cases.js

   Writes one small html file per project into work/, plus a fresh
   sitemap.xml. Each generated file is case-study.html with its head
   swapped for that project's own title, description and share image.

   The BODY is deliberately left empty: projects.js still fetches the
   content from Sanity when the page loads, exactly as it does today.
   So editing a project in the Studio is live immediately, with nothing
   to rebuild. Run this only when you ADD a project, rename one, or
   change the cover image the share card uses.

   Nothing here touches the live site. It writes files; uploading them
   is still a separate, deliberate step.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://doubledashcreative.com';
const OUT_DIR = path.join(ROOT, 'work');

const SANITY = {
    projectId: '7z9npbl2',
    dataset: 'production',
    apiVersion: '2024-01-01',
};

/* the uncached api, so a publish made a minute ago is picked up */
const QUERY = '*[_type == "project" && defined(slug.current)] | order(order asc) {' +
    'title, "slug": slug.current, intro, _updatedAt, cardStill, hero}';

/* ---------- helpers ---------- */

/* asset._ref is image-<hash>-<w>x<h>-<ext>, which maps straight onto a
   cdn url with no second request */
function assetUrl(ref) {
    if (!ref) return '';
    const p = ref.split('-');
    return 'https://cdn.sanity.io/images/' + SANITY.projectId + '/' +
        SANITY.dataset + '/' + p[1] + '-' + p[2] + '.' + p[3];
}

/* a share card wants one fixed shape, so this one DOES crop, unlike the
   grid cards which are cropped by their css frame instead */
function cardUrl(ref) {
    const u = assetUrl(ref);
    return u ? u + '?w=1200&h=630&fit=crop&fm=jpg&q=80' : '';
}

/* intro started life as an array of paragraphs and became a single text
   area, so both shapes still turn up */
function asText(v) {
    if (Array.isArray(v)) return v.join('\n\n');
    return typeof v === 'string' ? v : '';
}

/* html attribute values, and & inside a url, both need escaping or the
   parser eats them */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* one clean sentence for the search snippet and the share card */
function snippet(intro) {
    const first = asText(intro).split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
    if (first.length <= 160) return first;
    const cut = first.slice(0, 160);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[,;:]$/, '') + '...';
}

/* A generated page sits one directory down, so every relative path in
   the template would resolve against /work/ and 404. Root-relative is
   the only thing that survives the move. */
function absolutise(html) {
    return html.replace(
        /\b(href|src)="(css\/|js\/|assets\/|index\.html|projects\.html|about\.html|contact\.html)/g,
        '$1="/$2'
    );
}

/* ---------- the head swap ---------- */

function buildPage(template, p) {
    const url = SITE + '/work/' + p.slug;
    const title = p.title + ' | Case Study | Double Dash Creative';
    const desc = snippet(p.intro) ||
        p.title + ', a Double Dash Creative case study.';

    const still = (p.cardStill && p.cardStill.asset && p.cardStill.asset._ref) ||
        (p.hero && p.hero.asset && p.hero.asset._ref) || '';
    const img = cardUrl(still);

    let html = absolutise(template);

    /* the template's comment describes the generic fallback card, which is
       not what this file carries */
    html = html.replace(
        /    <!-- Link previews\.[\s\S]*?-->\n/,
        '    <!-- Share card for this project, written by tools/build-cases.js.\n' +
        '         Scrapers never run the page js, so these have to be static. -->\n'
    );

    html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');

    html = html.replace(
        /    <meta name="description"[\s\S]*?>/,
        '    <meta name="description" content="' + esc(desc) + '">'
    );

    /* the template carries the generic card; this project gets its own */
    const pairs = [
        ['property', 'og:url', url],
        ['property', 'og:title', title],
        ['property', 'og:description', desc],
        ['property', 'og:image', img],
        ['property', 'og:image:alt', p.title + ' by Double Dash Creative'],
        ['name', 'twitter:title', title],
        ['name', 'twitter:description', desc],
        ['name', 'twitter:image', img],
    ];
    pairs.forEach(function (pair) {
        const re = new RegExp('(<meta ' + pair[0] + '="' + pair[1] + '" content=")[^"]*(">)');
        html = html.replace(re, '$1' + esc(pair[2]) + '$2');
    });

    html = html.replace(
        /(<link rel="canonical" href=")[^"]*(">)/,
        '$1' + esc(url) + '$2'
    );

    /* a build stamp, so it is obvious where the file came from when you
       open one six months from now and wonder why editing it does nothing */
    return html.replace(
        /<head>/,
        '<head>\n    <!-- Generated by tools/build-cases.js on ' +
        new Date().toISOString().slice(0, 10) +
        '. Do not hand-edit: re-run the script instead.\n' +
        '         The body is filled from Sanity at page load, so content\n' +
        '         edits in the Studio go live without regenerating this. -->'
    );
}

/* ---------- sitemap ---------- */

function buildSitemap(projects) {
    const pages = [
        ['/', fileDate('index.html')],
        ['/projects', fileDate('projects.html')],
        ['/about', fileDate('about.html')],
        ['/contact', fileDate('contact.html')],
    ];

    const entry = function (loc, mod) {
        return '  <url>\n    <loc>' + SITE + loc + '</loc>\n' +
            '    <lastmod>' + mod + '</lastmod>\n  </url>';
    };

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!--\n' +
        '  Generated by tools/build-cases.js. Re-run it after adding a\n' +
        '  project in Sanity, then upload this file and the new work/ page.\n' +
        '-->\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n' +
        pages.map(function (p) { return entry(p[0], p[1]); }).join('\n') +
        '\n\n  <!-- Case studies. Content streams from Sanity; lastmod is that\n' +
        '       project\'s _updatedAt in the Studio. -->\n' +
        projects.map(function (p) {
            return entry('/work/' + p.slug, String(p._updatedAt).slice(0, 10));
        }).join('\n') +
        '\n\n</urlset>\n';
}

function fileDate(name) {
    try {
        return fs.statSync(path.join(ROOT, name)).mtime.toISOString().slice(0, 10);
    } catch (e) {
        return new Date().toISOString().slice(0, 10);
    }
}

/* ---------- run ---------- */

async function main() {
    const endpoint = 'https://' + SANITY.projectId + '.api.sanity.io/v' +
        SANITY.apiVersion + '/data/query/' + SANITY.dataset +
        '?query=' + encodeURIComponent(QUERY);

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Sanity returned ' + res.status + ' ' + res.statusText);

    const projects = (await res.json()).result || [];
    if (!projects.length) throw new Error('Sanity returned no projects, refusing to wipe work/');

    const template = fs.readFileSync(path.join(ROOT, 'case-study.html'), 'utf8');
    if (!/og:title/.test(template)) {
        throw new Error('case-study.html has no og tags to swap, has the template changed?');
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    /* Clear out pages for projects that no longer exist, so a deleted or
       renamed slug does not leave an orphan page on the server. */
    const keep = new Set(projects.map(function (p) { return p.slug + '.html'; }));
    fs.readdirSync(OUT_DIR).forEach(function (f) {
        if (f.endsWith('.html') && !keep.has(f)) {
            fs.unlinkSync(path.join(OUT_DIR, f));
            console.log('  removed  work/' + f + '  (no longer in Sanity)');
        }
    });

    projects.forEach(function (p) {
        const out = path.join(OUT_DIR, p.slug + '.html');
        fs.writeFileSync(out, buildPage(template, p), 'utf8');
        console.log('  wrote    work/' + p.slug + '.html  ' + p.title);
    });

    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(projects), 'utf8');
    console.log('  wrote    sitemap.xml  (' + (projects.length + 4) + ' urls)');

    console.log('\n  Upload work/, sitemap.xml, and anything else you changed.');
}

main().catch(function (err) {
    console.error('\n  Build failed:', err.message);
    process.exit(1);
});
