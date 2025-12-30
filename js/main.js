/* ============================================
   ANDERSON & DESIGNS - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lottie Logo Animation
    initLottieLogo();

    // Initialize all modules
    initNavbar();
    initScrollAnimations();
    initMobileMenu();
    initSlidingPortfolio();
    // initContactForm(); // Disabled - using EmailJS in contact.html instead
});

/* ============================================
   Lottie Logo Animation
   ============================================ */
function initLottieLogo() {
    const logoContainer = document.getElementById('lottie-logo');

    if (!logoContainer) return;

    const animation = lottie.loadAnimation({
        container: logoContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/animations/logo-ae.json',
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: false,
            hideOnTransparent: true,
            className: 'lottie-svg-class'
        }
    });

    // Force resize after load
    animation.addEventListener('DOMLoaded', function() {
        const svgElement = logoContainer.querySelector('svg');
        if (svgElement) {
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.maxWidth = '100%';
            svgElement.style.maxHeight = '100%';
        }
    });
}

/* ============================================
   Navbar Scroll Effect
   ============================================ */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    
    if (!navbar) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class when scrolling down
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
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
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
        }
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

    let lastScrollY = window.scrollY;
    let scrollDirection = 'down';

    // Track scroll direction
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
        lastScrollY = currentScrollY;
    });

    const observerOptions = {
        root: null,
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const item = entry.target;

            // Slide in when scrolling DOWN and entering view
            if (scrollDirection === 'down' && entry.isIntersecting && entry.intersectionRatio > 0.5) {
                item.classList.add('slide-in');
            }
            // Slide out when scrolling UP and leaving view
            else if (scrollDirection === 'up' && !entry.isIntersecting) {
                item.classList.remove('slide-in');
            }
        });
    }, observerOptions);

    items.forEach(item => {
        observer.observe(item);
    });
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
    const heroElements = document.querySelectorAll('.hero .fade-in');
    heroElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, index * 150);
    });
});
