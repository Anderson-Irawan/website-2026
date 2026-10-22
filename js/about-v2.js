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
