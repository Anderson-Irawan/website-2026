(function initLogoSphere() {
    const sphere = document.getElementById('logoSphere');
    if (!sphere) return;

    // Configuration
    const NUM_LOGOS = 30;      // Number of logos to display
    const RADIUS = 180;         // Sphere radius in pixels
    const MULTIPLIER = 8;       // Spiral tightness

    // Color classes for placeholder logos
    const colors = ['hot', 'electric', 'pink', 'red'];

    // Your logo images - REPLACE THESE PATHS with your actual logo files
    const logoImages = [
        // Add your logo paths here when ready:
        // 'assets/logos/logo1.svg',
        // 'assets/logos/logo2.png',
        // etc.

        'assets/logos/bci.svg',
        'assets/logos/andy-logo.svg',
    ];

    // Generate logo items positioned on a sphere
    for (let i = 1; i <= NUM_LOGOS; i++) {
        // Spherical coordinate calculations
        const phi = (i / NUM_LOGOS) * Math.PI;
        const theta = (i / NUM_LOGOS) * Math.PI * 2 * MULTIPLIER;

        // Convert spherical to Cartesian coordinates
        const x = RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = RADIUS * Math.sin(phi) * Math.sin(theta);
        const z = RADIUS * Math.cos(phi);

        // Create logo item
        const logoItem = document.createElement('div');
        logoItem.className = 'sphere-logo-item';
        logoItem.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;

        // Create inner content container
        const logoContent = document.createElement('div');
        logoContent.className = 'sphere-logo-content';

        // Check if we have actual logo images
        if (logoImages.length > 0) {
            const img = document.createElement('img');
            img.src = logoImages[i % logoImages.length];
            img.alt = `Logo ${i}`;
            img.loading = 'lazy';
            logoContent.appendChild(img);
        } else {
            // Use placeholder
            const placeholder = document.createElement('div');
            placeholder.className = `sphere-logo-placeholder ${colors[i % colors.length]}`;
            placeholder.textContent = i;
            logoContent.appendChild(placeholder);
        }

        logoItem.appendChild(logoContent);
        sphere.appendChild(logoItem);
    }

    // Pause rotation on hover for easy inspection
    sphere.addEventListener('mouseenter', () => {
        sphere.style.animationPlayState = 'paused';
        document.querySelectorAll('.sphere-logo-content').forEach(el => {
            el.style.animationPlayState = 'paused';
        });
    });

    sphere.addEventListener('mouseleave', () => {
        sphere.style.animationPlayState = 'running';
        document.querySelectorAll('.sphere-logo-content').forEach(el => {
            el.style.animationPlayState = 'running';
        });
    });
})();