/* ============================================
   ABOUT v2 - the Selected Clients links
   point at each case study. Same address rule as
   js/sanity-cards.js: /work/<slug> on the live
   domain, case-study.html?p=<slug> everywhere else.
   ============================================ */
(function () {
    var live = /(^|\.)doubledashcreative\.com$/.test(location.hostname);
    var links = document.querySelectorAll('[data-case-slug]');
    for (var i = 0; i < links.length; i++) {
        var slug = links[i].getAttribute('data-case-slug');
        links[i].href = live ? '/work/' + slug : 'case-study.html?p=' + slug;
    }
})();

/* The Instagram section only appears once a real Behold feed id is in
   about.html. Left on the placeholder, the widget draws Behold's own
   "Error / Not Found" card, which no visitor should ever see. This runs
   before the widget script loads, so nothing flashes up first. */
(function () {
    var section = document.querySelector('.abm-gram');
    if (!section) return;
    var widget = section.querySelector('behold-widget');
    var id = widget && widget.getAttribute('feed-id');
    if (!id || id.indexOf('PASTE_BEHOLD_FEED_ID') !== -1) section.hidden = true;
})();
