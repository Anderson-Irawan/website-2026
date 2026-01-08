// About Page Interactive Process Section
(function initAboutProcess() {
    const processItems = document.querySelectorAll('.process-item');
    let transitionTimeout = null;

    processItems.forEach(item => {
        // Add hover event listeners with smooth transitions
        item.addEventListener('mouseenter', () => {
            // Clear any pending transitions
            if (transitionTimeout) {
                clearTimeout(transitionTimeout);
            }

            // First, remove active class from all items
            processItems.forEach(i => i.classList.remove('active'));

            // Then add active class to hovered item with a slight delay for smoother transition
            transitionTimeout = setTimeout(() => {
                item.classList.add('active');
            }, 50);
        });

        // Optional: Keep expanded on click for mobile/touch devices
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');

            // Remove active from all
            processItems.forEach(i => i.classList.remove('active'));

            // Toggle active on clicked item with smooth delay
            if (!isActive) {
                setTimeout(() => {
                    item.classList.add('active');
                }, 100);
            }
        });
    });

    // Close all when mouse leaves the process list with smooth transition
    const processList = document.querySelector('.process-list');
    if (processList) {
        processList.addEventListener('mouseleave', () => {
            if (transitionTimeout) {
                clearTimeout(transitionTimeout);
            }

            transitionTimeout = setTimeout(() => {
                processItems.forEach(item => item.classList.remove('active'));
            }, 100);
        });
    }
})();
