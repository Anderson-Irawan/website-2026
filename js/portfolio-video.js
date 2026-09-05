// Portfolio Video Hover/Touch Interactions
(function initPortfolioVideo() {
    const portfolioVideos = document.querySelectorAll('.portfolio-video');

    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    portfolioVideos.forEach(video => {
        // The hover target is whichever card the video sits in. Don't
        // require .portfolio-item-video - a video dropped into any card
        // should just work, rather than failing silently because the
        // marker class was left off the wrapping <a>.
        const portfolioItem = video.closest(
            '.portfolio-item-video, .work-card, .portfolio-item'
        ) || video.parentElement;

        if (!portfolioItem) return;

        // For touch devices (mobile/tablet): autoplay and loop
        if (isTouchDevice) {
            // Set loop attribute
            video.loop = true;

            // Use Intersection Observer to play when in viewport
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Play video when in viewport
                        video.play().catch(err => {
                            console.log('Autoplay prevented:', err);
                        });
                    } else {
                        // Pause when out of viewport to save resources
                        video.pause();
                    }
                });
            }, {
                threshold: 0.5 // Play when 50% visible
            });

            observer.observe(video);
        } else {
            // For desktop: play on hover, pause and reset on hover out
            portfolioItem.addEventListener('mouseenter', () => {
                video.loop = true;
                video.play().catch(err => {
                    console.log('Video play prevented:', err);
                });
            });

            portfolioItem.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
                // Restore the poster still (a paused video shows its first
                // frame, not the poster, so reload to bring the poster back)
                if (video.getAttribute('poster')) video.load();
            });
        }
    });
})();
