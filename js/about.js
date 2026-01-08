// About Page Interactive Process Section
(function initAboutProcess() {
    const processItems = document.querySelectorAll('.process-item');

    processItems.forEach(item => {
        // Add hover event listeners
        item.addEventListener('mouseenter', () => {
            // Remove active class from all items
            processItems.forEach(i => i.classList.remove('active'));
            // Add active class to hovered item
            item.classList.add('active');
        });

        // Optional: Keep expanded on click for mobile/touch devices
        item.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            // Remove active from all
            processItems.forEach(i => i.classList.remove('active'));
            // Toggle active on clicked item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Close all when mouse leaves the process list
    const processList = document.querySelector('.process-list');
    if (processList) {
        processList.addEventListener('mouseleave', () => {
            processItems.forEach(item => item.classList.remove('active'));
        });
    }
})();
