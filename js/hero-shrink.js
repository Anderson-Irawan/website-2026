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
            // far enough to clear the left edge completely
            var away = intro.offsetLeft + intro.offsetWidth + 40;
            // Cancel out the hero scrolling up, so the line stays put at the
            // bottom of the screen and only moves sideways. (Desktop: zero
            // while the hero is pinned; phones: the hero moves from the start.)
            var heroTop = intro.offsetParent
                ? intro.offsetParent.getBoundingClientRect().top : 0;
            var dy = Math.max(0, -heroTop);
            intro.style.transform = (ip > 0 || dy > 0)
                ? 'translate3d(' + (-away * ip).toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)'
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
            if (k < 0.0005) {
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
    // card blurs, dims, shrinks a touch and fades out - 0 while the next card is still
    // below the screen, full once the next card has locked on top.
    var STACK_BLUR = 14;      // px of blur on a fully covered card
    var STACK_DIM = 0.45;     // how much darker it gets (0 = none, 1 = black)
    var STACK_SHRINK = 0.06;  // how much smaller it gets (0.06 = 6%)
    function stackCards(on) {
        var cards = document.querySelectorAll('.page-home .work-scatter--squish .work-card');
        var vh = window.innerHeight || 1;
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (!on) {
                card.style.removeProperty('--stack-top');
                card.style.filter = '';
                card.style.scale = '';
                card.style.opacity = '';
                continue;
            }
            // centre the card on the screen (never above a small top gap)
            var top = Math.max(16, (vh - card.offsetHeight) / 2);
            card.style.setProperty('--stack-top', top.toFixed(1) + 'px');

            var next = cards[i + 1];
            var p = 0;
            if (next) {
                var nextTop = next.getBoundingClientRect().top;
                var nextStick = Math.max(16, (vh - next.offsetHeight) / 2);
                p = clamp01((vh - nextTop) / Math.max(1, vh - nextStick));
            }
            if (p < 0.001) {
                card.style.filter = '';
                card.style.scale = '';
                card.style.opacity = '';
            } else {
                card.style.filter = 'blur(' + (p * STACK_BLUR).toFixed(2) + 'px) ' +
                    'brightness(' + (1 - p * STACK_DIM).toFixed(3) + ')';
                card.style.scale = (1 - p * STACK_SHRINK).toFixed(4);
                // fades all the way out, so a covered card's title never
                // shows through behind the new one
                card.style.opacity = (1 - p).toFixed(3);
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
    window.addEventListener('resize', function () { readSize(); fitPhrase(); onScroll(); });
    fitPhrase();
    // re-fit once the serif font has loaded, since it changes the width
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPhrase);
    // the motion toggle flips a class on <html>
    new MutationObserver(onScroll).observe(html, { attributes: true, attributeFilter: ['class'] });
    // project cards arrive from Sanity after load - place their stretch /
    // cover straight away, rather than waiting for the next scroll
    var grid = document.querySelector('.page-home .work-scatter');
    if (grid) new MutationObserver(onScroll).observe(grid, { childList: true, subtree: true });
    readSize();
    update();
})();
