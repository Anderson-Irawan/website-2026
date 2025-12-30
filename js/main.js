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
        window.location.href = `mailto:hello@andersondesigns.com?subject=${subject}&body=${body}`;
    });
}

/* ============================================
   Sliding Portfolio Animation
   ============================================ */
function initSlidingPortfolio() {
    const slides = document.querySelectorAll('.portfolio-slide');

    if (slides.length === 0) return;

    // Set first slide as active initially
    slides[0].classList.add('slide-active');

    const observerOptions = {
        root: null,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '0px'
    };

    let lastScrollY = window.scrollY;
    let isScrollingDown = true;

    // Track scroll direction
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        isScrollingDown = currentScrollY > lastScrollY;
        lastScrollY = currentScrollY;
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const slide = entry.target;

            // When scrolling down - slide in when visible
            if (isScrollingDown && entry.intersectionRatio > 0.5) {
                slide.classList.add('slide-active');
            }
            // When scrolling up - slide out when leaving
            else if (!isScrollingDown && entry.intersectionRatio < 0.5) {
                slide.classList.remove('slide-active');
            }
        });
    }, observerOptions);

    slides.forEach(slide => {
        observer.observe(slide);
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
