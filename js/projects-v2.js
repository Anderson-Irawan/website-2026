/* ============================================
   PROJECTS v2 - see css/projects-v2.css.
   1. Sizes the opening statement to span the
      screen (desktop; phones let it wrap).
   2. Quiet fade-and-rise as each card enters.
   ============================================ */
(function () {
    if (!document.body.classList.contains('pj-v2')) return;
    var html = document.documentElement;

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

    // ---- 2. quiet reveal ----
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if ((reduce && reduce.matches) || html.classList.contains('liquid-hero-reduced') ||
        !window.IntersectionObserver) return;

    html.classList.add('pj-reveal');
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-in');
            io.unobserve(e.target);   // once in, it stays in
        });
    }, { rootMargin: '0px 0px -12% 0px' });

    function watchCards() {
        var cards = document.querySelectorAll('.pj-v2 .work-card:not(.is-in)');
        for (var i = 0; i < cards.length; i++) io.observe(cards[i]);
    }
    // the cards are built from Sanity after load
    var grid = document.querySelector('[data-sanity-cards]');
    if (grid) new MutationObserver(watchCards).observe(grid, { childList: true, subtree: true });
    watchCards();
})();
