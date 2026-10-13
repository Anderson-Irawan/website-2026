<?php
/* ============================================
   /work/<slug>

   .htaccess routes every /work/<slug> here. This takes case-study.html,
   swaps its head for that project's own title, description and share
   card, and sends it. The body still fills itself from Sanity in the
   browser via js/projects.js, so editing a project in the Studio is live
   immediately, and so is ADDING one: a new slug simply starts working.

   Nothing to generate, nothing to upload.
   ============================================ */

require __DIR__ . '/lib/sanity.php';

const SITE = 'https://doubledashcreative.com';

function send_404()
{
    http_response_code(404);
    $page = @file_get_contents(__DIR__ . '/404.html');
    exit($page === false ? 'Not found.' : $page);
}

/* The slug arrives from the url and ends up inside an array lookup and
   the page's html, so it is validated against a whitelist rather than
   escaped afterwards. Anything with a dot or a slash never gets this far. */
$slug = isset($_GET['slug']) ? strtolower($_GET['slug']) : '';
if (!preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $slug)) {
    send_404();
}

$projects = sanity_projects();
$project  = ($projects !== null && isset($projects[$slug])) ? $projects[$slug] : null;

/* A missing project is a 404, but only when the list can be trusted.
   If Sanity is unreachable AND there is no cache, sanity_projects()
   returns null, and we cannot tell a bad slug from a bad day. Serving
   the page with generic tags lets js/projects.js have its own go at
   loading the content, which beats a 404 on a page that does exist. */
if ($project === null && $projects !== null) {
    send_404();
}

$template = @file_get_contents(__DIR__ . '/case-study.html');
if ($template === false) {
    http_response_code(500);
    exit('Case study template is missing.');
}

echo render_case($template, $slug, $project);


/* ---------------------------------------------------------------- */

function render_case($html, $slug, $p)
{
    $url = SITE . '/work/' . $slug;

    $name  = ($p && !empty($p['title'])) ? $p['title'] : '';
    $title = $name !== ''
        ? $name . ' | Case Study | Double Dash Creative'
        : 'Case Study | Double Dash Creative';

    $desc = $p ? sanity_snippet(isset($p['intro']) ? $p['intro'] : '') : '';
    if ($desc === '') {
        $desc = $name !== ''
            ? $name . ', a Double Dash Creative case study.'
            : 'A Double Dash Creative case study.';
    }

    $ref = '';
    if ($p) {
        if (!empty($p['cardStill']['asset']['_ref'])) {
            $ref = $p['cardStill']['asset']['_ref'];
        } elseif (!empty($p['hero']['asset']['_ref'])) {
            $ref = $p['hero']['asset']['_ref'];
        }
    }
    $img = sanity_card_url($ref);

    /* The page is served at /work/<slug>, one level down from the
       template's own location, so every relative path in it would
       resolve against /work/ and 404. Root-relative survives the move. */
    $html = preg_replace(
        '~\b(href|src)="(css/|js/|assets/|index\.html|projects\.html|about\.html|contact\.html)~',
        '$1="/$2',
        $html
    );

    $html = swap($html, '~<title>.*?</title>~s', '<title>' . e($title) . '</title>');

    $html = swap(
        $html,
        '~[ \t]*<meta name="description"[^>]*>~s',
        '    <meta name="description" content="' . e($desc) . '">'
    );

    $meta = array(
        array('property', 'og:url',         $url),
        array('property', 'og:title',       $title),
        array('property', 'og:description', $desc),
        array('property', 'og:image',       $img),
        array('property', 'og:image:alt',   ($name !== '' ? $name : 'Double Dash Creative') . ' by Double Dash Creative'),
        array('name',     'twitter:title',       $title),
        array('name',     'twitter:description', $desc),
        array('name',     'twitter:image',       $img),
    );

    foreach ($meta as $m) {
        $html = wrap_swap(
            $html,
            '~(<meta ' . $m[0] . '="' . preg_quote($m[1], '~') . '" content=")[^"]*(">)~',
            e($m[2])
        );
    }

    $html = wrap_swap($html, '~(<link rel="canonical" href=")[^"]*(">)~', e($url));

    return $html;
}

/* preg_replace treats $1 and backslashes in its REPLACEMENT as syntax,
   and page copy contains both. Both helpers below go through a callback
   so the new value is inserted literally, whatever is in it. */
function swap($html, $pattern, $replacement)
{
    return preg_replace_callback(
        $pattern,
        function () use ($replacement) {
            return $replacement;
        },
        $html,
        1
    );
}

function wrap_swap($html, $pattern, $value)
{
    return preg_replace_callback(
        $pattern,
        function ($m) use ($value) {
            return $m[1] . $value . $m[2];
        },
        $html,
        1
    );
}
