// About Page Interactive Process Section
(function initAboutProcess() {
    const processItems = document.querySelectorAll('.process-item');
    let transitionTimeout = null;
    let isTransitioning = false;

    processItems.forEach(item => {
        // Add hover event listeners with sequential book-page-like transitions
        item.addEventListener('mouseenter', () => {
            // Clear any pending transitions
            if (transitionTimeout) {
                clearTimeout(transitionTimeout);
            }

            // Check if any item is currently active
            const activeItem = document.querySelector('.process-item.active');

            // If hovering over the already active item, do nothing
            if (activeItem === item) {
                return;
            }

            // If there's an active item, close it first, then open the new one
            if (activeItem) {
                isTransitioning = true;
                activeItem.classList.remove('active');

                // Wait for close transition to complete before opening new item
                transitionTimeout = setTimeout(() => {
                    item.classList.add('active');
                    isTransitioning = false;
                }, 650); // Slightly longer than transition duration (0.6s)
            } else {
                // No active item, open immediately
                item.classList.add('active');
            }
        });

        // Optional: Keep expanded on click for mobile/touch devices
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');

            if (isActive) {
                // Close if already active
                item.classList.remove('active');
            } else {
                // Close all others first
                const activeItem = document.querySelector('.process-item.active');
                if (activeItem) {
                    activeItem.classList.remove('active');
                    setTimeout(() => {
                        item.classList.add('active');
                    }, 650);
                } else {
                    item.classList.add('active');
                }
            }
        });
    });

    // Close all when mouse leaves the process list
    const processList = document.querySelector('.process-list');
    if (processList) {
        processList.addEventListener('mouseleave', () => {
            if (transitionTimeout) {
                clearTimeout(transitionTimeout);
            }

            // Close any active items
            processItems.forEach(item => item.classList.remove('active'));
            isTransitioning = false;
        });
    }
})();
