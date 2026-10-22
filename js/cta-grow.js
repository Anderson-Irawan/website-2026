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

        function update() {
            var w = stage.clientWidth || 1;
            var h = stage.clientHeight || 1;
            var reduced = isReduced();

            // 0 = small square, 1 = grown to the margins
            var g = 1;
            if (!reduced) {
                var hold = Math.max(1, pin.offsetHeight - h);
                var s = -pin.getBoundingClientRect().top + lead * h;
                g = ease(clamp01(s / (hold * portion + lead * h)));
                if (reverse) g = 1 - g;
            }

            var side = Math.min(w, h) * START_SQUARE;
            var sx = (w - side) / 2, sy = (h - side) / 2;           // square
            var mx = Math.max(MARGIN_MIN, w * MARGIN_X);            // margins
            var my = Math.max(MARGIN_MIN, h * MARGIN_Y);
            frame.style.setProperty('--ix', (sx + (mx - sx) * g).toFixed(1));
            frame.style.setProperty('--it', (sy + (my - sy) * g).toFixed(1));
            frame.style.setProperty('--ib', (sy + (my - sy) * g).toFixed(1));

            // the gradient settles from a slight zoom as the box opens
            if (canvas) canvas.style.scale = reduced ? '' : (1 + ZOOM * (1 - g)).toFixed(4);

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

            // stretches in across the stage as the box closes, after the text
            if (afters.length) {
                fitAfters(w);
                var ap = easeOut(clamp01((AFTER_FROM - g) / (AFTER_FROM - AFTER_TO)));
                for (var j = 0; j < afters.length; j++) {
                    var a = afters[j];
                    if (reduced) { a.style.opacity = a.style.transform = ''; continue; }
                    a.style.opacity = ap.toFixed(3);
                    a.style.transform = ap < 1
                        ? 'scaleX(' + (AFTER_SQUEEZE + (1 - AFTER_SQUEEZE) * ap).toFixed(4) + ')'
                        : '';
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
