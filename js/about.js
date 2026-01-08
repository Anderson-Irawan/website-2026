// About Page Interactive Process Section
(function initAboutProcess() {
    const processItems = document.querySelectorAll('.process-item');
    let transitionTimeout = null;
    let isTransitioning = false;
    let touchDetected = false;

    processItems.forEach(item => {
        // Detect touch interaction to prevent mouseenter from firing on tap
        item.addEventListener('touchstart', () => {
            touchDetected = true;
        }, { passive: true });

        // Add hover event listeners with quick, simultaneous transitions
        item.addEventListener('mouseenter', () => {
            // Skip hover behavior if this was triggered by a touch
            if (touchDetected) {
                touchDetected = false;
                return;
            }

            // Check if any item is currently active
            const activeItem = document.querySelector('.process-item.active');

            // If hovering over the already active item, do nothing
            if (activeItem === item) {
                return;
            }

            // Close any active item and open new one simultaneously
            if (activeItem) {
                activeItem.classList.remove('active');
            }

            // Open the new item immediately (simultaneous transition)
            item.classList.add('active');
        });

        // Click/tap handler for all devices
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');

            if (isActive) {
                // Close if already active
                item.classList.remove('active');
            } else {
                // Close all others and open this one simultaneously
                const activeItem = document.querySelector('.process-item.active');
                if (activeItem) {
                    activeItem.classList.remove('active');
                }
                item.classList.add('active');
            }
        });
    });

    // Close all when mouse leaves the process list
    const processList = document.querySelector('.process-list');
    if (processList) {
        processList.addEventListener('mouseleave', () => {
            // Skip if touch was used (keep items open on mobile/tablet)
            if (touchDetected) {
                return;
            }
            // Close any active items
            processItems.forEach(item => item.classList.remove('active'));
        });
    }
})();
