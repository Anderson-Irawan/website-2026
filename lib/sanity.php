<?php
/* ============================================
   SANITY FETCH + CACHE

   One request fetches the metadata for every project, and both case.php
   and sitemap.php read it from here.

   Cached to disk for a few minutes so a busy page does not hit the API
   on every view, and so a Sanity outage does not take the case studies
   with it: if a refresh fails, an expired cache is served rather than
   nothing. Content inside each case study is still fetched by
   js/projects.js in the browser, exactly as before. This file only
   supplies what has to exist before the page is sent: the title, the
   description and the share card.

   Read-only against a public dataset, so there is no token in here and
   there must never be one.
   ============================================ */

const SANITY_PROJECT = '7z9npbl2';
const SANITY_DATASET = 'production';
const SANITY_API     = '2024-01-01';

const SANITY_CACHE_FILE = __DIR__ . '/../cache/projects.json';
const SANITY_CACHE_TTL  = 300;   /* seconds */

/* escape for an html attribute. ENT_QUOTES also catches the & in a
   query string, which an unescaped og:image url is full of. */
function e($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function sanity_query_url()
{
    $q = '*[_type == "project" && defined(slug.current)] | order(order asc) {'
       . 'title, "slug": slug.current, intro, _updatedAt, cardStill, hero}';

    /* apicdn, not api: this is already cached on disk below, so the
       extra 60 seconds of edge cache costs nothing and is far cheaper */
    return 'https://' . SANITY_PROJECT . '.apicdn.sanity.io/v' . SANITY_API
         . '/data/query/' . SANITY_DATASET . '?query=' . rawurlencode($q);
}

/* Short timeouts on purpose. If Sanity is having a bad minute the page
   should fall back to cache quickly, not hold the connection open while
   a visitor stares at a blank tab. */
function sanity_http($url)
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_FOLLOWLOCATION => true,
        ));
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($body !== false && $code === 200) ? $body : null;
    }

    /* some hosts disable curl but leave this on */
    $ctx = stream_context_create(array('http' => array('timeout' => 6)));
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? null : $body;
}

function sanity_read_cache()
{
    if (!is_file(SANITY_CACHE_FILE)) {
        return null;
    }
    $raw = @file_get_contents(SANITY_CACHE_FILE);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) && count($data) ? $data : null;
}

/* Returns slug => project, or NULL when Sanity is unreachable and there
   is no cache to fall back on. The null is meaningful: callers use it to
   tell "this project does not exist" apart from "I cannot say right now",
   which decides whether a 404 is honest. */
function sanity_projects()
{
    $dir = dirname(SANITY_CACHE_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }

    $fresh = is_file(SANITY_CACHE_FILE)
        && (time() - filemtime(SANITY_CACHE_FILE)) < SANITY_CACHE_TTL;

    if ($fresh) {
        $cached = sanity_read_cache();
        if ($cached !== null) {
            return $cached;
        }
    }

    $body = sanity_http(sanity_query_url());
    if ($body !== null) {
        $json = json_decode($body, true);
        if (isset($json['result']) && is_array($json['result']) && count($json['result'])) {
            $bySlug = array();
            foreach ($json['result'] as $p) {
                if (!empty($p['slug'])) {
                    $bySlug[strtolower($p['slug'])] = $p;
                }
            }
            /* If the cache directory is not writable this quietly does
               nothing and every request goes to Sanity. Slower, but the
               site still works, which is the right way round. */
            @file_put_contents(SANITY_CACHE_FILE, json_encode($bySlug), LOCK_EX);
            return $bySlug;
        }
    }

    /* the refresh failed, so a stale answer beats no answer */
    return sanity_read_cache();
}

/* asset._ref is image-<hash>-<w>x<h>-<ext>, which maps straight onto a
   cdn url with no second request */
function sanity_asset_url($ref)
{
    if (!$ref) {
        return '';
    }
    $p = explode('-', $ref);
    if (count($p) < 4) {
        return '';
    }
    return 'https://cdn.sanity.io/images/' . SANITY_PROJECT . '/' . SANITY_DATASET
         . '/' . $p[1] . '-' . $p[2] . '.' . $p[3];
}

/* a share card wants one fixed shape, so this one DOES crop, unlike the
   grid cards which are cropped by their css frame instead */
function sanity_card_url($ref)
{
    $u = sanity_asset_url($ref);
    return $u ? $u . '?w=1200&h=630&fit=crop&fm=jpg&q=80' : '';
}

/* one clean sentence for the search snippet and the share card */
function sanity_snippet($intro)
{
    if (is_array($intro)) {
        $intro = implode("\n\n", $intro);
    }
    if (!is_string($intro) || trim($intro) === '') {
        return '';
    }

    $parts = preg_split('/\n\s*\n/', trim($intro));
    $first = preg_replace('/\s+/', ' ', trim($parts[0]));

    if (mb_strlen($first, 'UTF-8') <= 160) {
        return $first;
    }

    $cut = mb_substr($first, 0, 160, 'UTF-8');
    $sp  = mb_strrpos($cut, ' ', 0, 'UTF-8');
    if ($sp !== false && $sp > 100) {
        $cut = mb_substr($cut, 0, $sp, 'UTF-8');
    }
    return rtrim($cut, " ,;:") . '...';
}
