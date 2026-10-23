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
