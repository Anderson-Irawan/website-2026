/* ============================================
   ANDERSON & DESIGNS - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initSmoothScroll();
    initHeroPin();
    initHeroTagline();
    initHeroBgFade();
    initNavbar();
    initSocial();
    initScrollAnimations();
    initMobileMenu();
    initSlidingPortfolio();
    initCardParallax();
    // initContactForm(); // Disabled - using EmailJS in contact.html instead
});

/* ============================================
   Smooth (inertial) Scrolling - Lenis
   ============================================ */
function initSmoothScroll() {
    // Honour reduced-motion: leave native scrolling untouched.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
    script.onload = function() {
        if (typeof window.Lenis === 'undefined') return;

        var lenis = new window.Lenis({
            lerp: 0.1,            // lower = smoother / more drift
            wheelMultiplier: 1,
            smoothWheel: true
            // smoothTouch defaults off - phones keep their native scroll
        });
        window.lenis = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Route same-page anchor jumps through Lenis so they glide too.
        document.querySelectorAll('a[href^="#"]').forEach(function(a) {
            a.addEventListener('click', function(e) {
                var id = a.getAttribute('href');
                if (id.length < 2) return;
                var target = document.querySelector(id);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: -80 });
            });
        });
    };
    document.head.appendChild(script);
}

/* ============================================
   Hero Pin - delayed scroll before the content
   below the hero. Desktop + motion only.
   ============================================ */
function initHeroPin() {
    const pin = document.querySelector('.hero-pin');
    if (!pin || !window.matchMedia) return;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const html = document.documentElement;

    const apply = () => {
        const on = fine.matches && !reduce.matches &&
            !html.classList.contains('liquid-hero-reduced');
        if (on === html.classList.contains('has-hero-pin')) return;

        // Toggling the pin changes the page height by ~1 viewport, which
        // would shove the scroll position. Measure the delta and keep the
        // same content parked under the viewport.
        const before = pin.offsetHeight;
        html.classList.toggle('has-hero-pin', on);
        const delta = pin.offsetHeight - before;

        if (delta !== 0 && window.pageYOffset > 0) {
            const y = Math.max(0, window.pageYOffset + delta);
            if (window.lenis) window.lenis.scrollTo(y, { immediate: true });
            else window.scrollTo(0, y);
        }
    };

    apply();
    fine.addEventListener('change', apply);
    reduce.addEventListener('change', apply);
    // The reduce-motion toggle flips a class on <html>; react to it.
    new MutationObserver(apply).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });
}

/* ============================================
   Hero Tagline - parallax + fade behind the logo
   ============================================ */
function initHeroTagline() {
    const tag = document.querySelector('[data-hero-tagline]');
    if (!tag) return;

    // Leave it static for reduced-motion visitors.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Drift rate: a fraction of the scroll, close to (a little under) the
    // gradient background's own parallax so the text feels stuck to it.
    const PARALLAX = 0.22;
    const FADE = 1.15;      // fully faded by ~0.87 of a viewport scrolled
    const REST_OPACITY = 0.9;

    const onScroll = () => {
        const vh = window.innerHeight || 1;
        const p = (window.pageYOffset || 0) / vh;
        tag.style.transform =
            'translate3d(0,' + (-p * PARALLAX * vh).toFixed(1) + 'px,0)';
        tag.style.opacity =
            (REST_OPACITY * Math.max(0, 1 - p * FADE)).toFixed(3);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}

/* ============================================
   Hero background fade - the fixed liquid gradient
   fades out to black as the page scrolls toward the
   "For Dreamers & Daredevils" divider
   ============================================ */
function initHeroBgFade() {
    const bg = document.querySelector('.liquid-hero__bg');
    const target = document.querySelector('.portfolio-section');
    if (!bg || !target) return;

    // The nav's black backdrop pops in (its own 0.4s ease) once the
    // "For Dreamers" divider crosses the middle of the viewport.
    // initNavbar bows out on this page - see there.
    const navbar = document.querySelector('.navbar');
    const divider = document.querySelector('.hero-divider');

    let ticking = false;
    function update() {
        ticking = false;
        const vh = window.innerHeight || 1;
        const top = target.getBoundingClientRect().top;
        // Full liquid until the portfolio is ~1.5 screens away; fully
        // black by the time its top edge is ~2/3 down the viewport.
        const START = vh * 1.5;   // top distance where the fade begins
        const END = vh * 0.65;    // top distance where it's fully black
        const p = Math.max(0, Math.min(1, (top - END) / (START - END)));
        bg.style.opacity = p.toFixed(3);

        if (navbar && divider) {
            const dr = divider.getBoundingClientRect();
            const mid = dr.top + dr.height / 2;
            navbar.classList.toggle('is-solid', mid < vh * 0.5);
        }
    }
    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
}

/* ============================================
   Portfolio cards - the whole card drifts at its
   own gentle rate as it passes the viewport
   ============================================ */
function initCardParallax() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Skip the squish rows - their cards need to stay row-aligned.
    const cards = Array.from(document.querySelectorAll('.work-card'))
        .filter(function (c) { return !c.closest('.work-scatter--squish'); });
    if (!cards.length) return;

    // gentle, varied per-card rates ("sprinkled") - px shift per px the
    // card sits away from the viewport centre. Higher = more lag.
    const RATES = [0.07, 0.15, 0.1, 0.16, 0.08, 0.12, 0.115, 0.17, 0.09, 0.14];
    const CAP = 140; // px, so a card near the edge never flies off
    // No parallax once the grid collapses to a single stacked column
    // (matches the .work-scatter 760px breakpoint in styles.css).
    const stackedMQ = window.matchMedia
        ? window.matchMedia('(max-width: 760px)') : null;
    let ticking = false;

    function update() {
        ticking = false;
        if (stackedMQ && stackedMQ.matches) {
            cards.forEach((card) => card.style.removeProperty('--py'));
            return;
        }
        const mid = (window.innerHeight || 1) / 2;
        cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            if (r.bottom < -160 || r.top > mid * 2 + 160) return;
            const offset = (r.top + r.height / 2) - mid;   // -above / +below
            let y = -offset * RATES[i % RATES.length];      // lag toward centre
            y = Math.max(-CAP, Math.min(CAP, y));
            card.style.setProperty('--py', y.toFixed(1) + 'px');
        });
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
}

/* ============================================
   Social links - clone the footer set into a fixed
   side rail (desktop) and the burger menu (mobile)
   ============================================ */
function initSocial() {
    const lines = '<span class="side-rail__line"></span>';

    // Left rail: copyright
    const left = document.createElement('div');
    left.className = 'side-rail side-rail--left';
    left.innerHTML = lines +
        '<div class="side-rail__body">' +
        '<span class="side-rail__label">Double Dash Creative © 2026</span>' +
        '</div>' + lines;
    document.body.appendChild(left);

    const source = document.querySelector('.footer-social');
    if (!source) return;
    const markup = source.innerHTML;

    // Right rail: social icons
    const right = document.createElement('div');
    right.className = 'side-rail side-rail--right';
    right.setAttribute('aria-label', 'Social links');
    right.innerHTML = lines +
        '<div class="side-rail__body side-rail__social">' + markup + '</div>' +
        lines;
    document.body.appendChild(right);

    // Copy into the burger menu (mobile)
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const li = document.createElement('li');
        li.className = 'nav-social';
        li.innerHTML = markup;
        navLinks.appendChild(li);
    }
}

/* ============================================
   Navbar - fade the black backdrop in on scroll
   ============================================ */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Homepage: the backdrop is driven by initHeroBgFade so it tracks
    // the background fade to black exactly.
    if (document.querySelector('.liquid-hero__bg')) return;

    // Most pages: black fades in after ~0.4 of a viewport.
    const heroPin = document.querySelector('.hero-pin');
    const TRIGGER = 0.4;

    const onScroll = () => {
        const base = window.innerHeight * TRIGGER;
        const threshold = heroPin
            ? Math.max(base, heroPin.offsetHeight - window.innerHeight)
            : base;
        navbar.classList.toggle('is-solid', window.pageYOffset > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ============================================
   Scroll Animations (Intersection Observer)
   ============================================ */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length === 0) return;
    
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay based on element position
                const delay = index * 100;
                
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                
                // Unobserve after animation
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

/* ============================================
   Mobile Menu Toggle
   ============================================ */
function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuToggle || !navLinks) return;

    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        menuToggle.classList.toggle('active', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        // lock the page behind the full-screen overlay
        document.documentElement.classList.toggle('menu-open', open);
        if (window.lenis) open ? window.lenis.stop() : window.lenis.start();
    }

    menuToggle.addEventListener('click', () => {
        setMenu(!navLinks.classList.contains('active'));
    });

    // Close on link tap
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });
}

/* ============================================
   Contact Form Handler
   ============================================ */
function initContactForm() {
    const form = document.querySelector('#contact-form');
    
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Gather form data
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Build mailto link
        const subject = encodeURIComponent(`Project Inquiry: ${data['project-type']} from ${data['company']}`);
        const body = encodeURIComponent(
            `Name: ${data['name']}\n` +
            `Company: ${data['company']}\n` +
            `Email: ${data['email']}\n` +
            `Project Type: ${data['project-type']}\n` +
            `Budget: ${data['budget'] || 'Not specified'}\n` +
            `Timeframe: ${data['timeframe']}\n\n` +
            `Project Description:\n${data['description']}`
        );
        
        // Open mailto link
        window.location.href = `mailto:irawanandersonputra@gmail.com?subject=${subject}&body=${body}`;
    });
}

/* ============================================
   Sliding Portfolio Animation
   ============================================ */
function initSlidingPortfolio() {
    const items = document.querySelectorAll('.portfolio-item-sliding');

    if (items.length === 0) return;

    function updateSlideProgress() {
        items.forEach(item => {
            const overlay = item.querySelector('.portfolio-image-overlay');
            const imageContainer = item.querySelector('.portfolio-images');
            const direction = item.getAttribute('data-slide-direction');

            if (!overlay || !imageContainer) return;

            // Get image container position relative to viewport
            const rect = imageContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate scroll progress (0 to 1)
            // Start: when image is 20% into viewport
            // End: when top of image reaches center of viewport
            const startPoint = windowHeight / 2;
            const endPoint = windowHeight / 6;

            let progress = 0;

            // Only start calculating when the image container's bottom enters viewport
            if (rect.bottom > 0 && rect.top <= startPoint) {
                if (rect.top >= endPoint) {
                    // Image is between bottom of screen and center
                    progress = (startPoint - rect.top) / (startPoint - endPoint);
                    progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
                } else {
                    // Image has passed center point
                    progress = 1;
                }
            }

            // Apply transform based on direction and progress
            let translateValue;
            if (direction === 'left') {
                translateValue = -100 + (progress * 100); // Start at -100%, end at 0%
            } else {
                translateValue = 100 - (progress * 100); // Start at 100%, end at 0%
            }

            overlay.style.transform = `translateX(${translateValue}%)`;
        });
    }

    // Update on scroll
    window.addEventListener('scroll', updateSlideProgress);

    // Initial update
    updateSlideProgress();
}

/* ============================================
   Smooth Scroll for Anchor Links
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/* ============================================
   Portfolio Item Hover Effects
   ============================================ */
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.zIndex = '10';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.zIndex = '1';
    });
});

/* ============================================
   Page Load Animation Trigger
   ============================================ */
window.addEventListener('load', function() {
    document.body.classList.add('loaded');

    // Trigger fade-in animations for above-the-fold content
    const heroElements = document.querySelectorAll('.liquid-hero .fade-in');
    heroElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, index * 150);
    });
});
