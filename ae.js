// Initialize Lottie animation
        var animation = lottie.loadAnimation({
            container: document.getElementById('lottie-logo'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: 'logo-ae.json', // Path to your JSON file
            rendererSettings: {
                preserveAspectRatio: 'xMidYMid meet',
                progressiveLoad: false,
                hideOnTransparent: true,
                className: 'lottie-svg-class'
            }
        });
        
        // Force resize after load
        animation.addEventListener('DOMLoaded', function() {
            var svgElement = document.querySelector('#lottie-logo svg');
            if (svgElement) {
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.style.maxWidth = '100%';
                svgElement.style.maxHeight = '100%';
            }
        });

        // Scroll-triggered animations
        function handleScrollAnimations() {
            const animatedElements = document.querySelectorAll('.animate-on-scroll');
            
            animatedElements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('animated');
                }
            });
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
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

        // Add click animation to buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Initialize scroll animations
        window.addEventListener('scroll', handleScrollAnimations);
        window.addEventListener('load', handleScrollAnimations);

        // Trigger initial check for elements already in view
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(handleScrollAnimations, 100);
        });



// Mobile navigation toggle
    const mobileToggle = document.getElementById('mobileNavToggle');
    const mobileSidenav = document.getElementById('mobileSidenav');
    
    function closeMobileNav() {
        mobileToggle.classList.remove('active');
        mobileSidenav.classList.remove('active');
    }
    
    mobileToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        mobileSidenav.classList.toggle('active');
    });
    
    // Close mobile nav when clicking a link
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });
    
    // Close mobile nav when scrolling
    window.addEventListener('scroll', function() {
        if (mobileSidenav.classList.contains('active')) {
            closeMobileNav();
        }
    });