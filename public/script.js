document.addEventListener('DOMContentLoaded', () => {
    // --- Dark Mode Toggle Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });

    // --- AI Responder Logic ---
    const reviewInput = document.getElementById('review-input');
    const generateButton = document.getElementById('generate-button');
    const resultContainer = document.getElementById('result-container');
    const draftOutput = document.getElementById('draft-output');
    const loadingSpinner = document.getElementById('loading-spinner');

    generateButton.addEventListener('click', async () => {
        const reviewText = reviewInput.value;
        if (!reviewText.trim()) {
            alert('Будь ласка, спочатку вставте відгук.');
            return;
        }

        resultContainer.style.display = 'block';
        draftOutput.style.display = 'none';
        loadingSpinner.style.display = 'block';
        generateButton.disabled = true;

        try {
            const response = await fetch('/api/responder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewText: reviewText }),
            });
            if (!response.ok) {
                throw new Error('Сервіс AI не відповів. Спробуйте ще раз.');
            }
            const data = await response.json();
            draftOutput.value = data.draftReply;
        } catch (error) {
            draftOutput.value = `Виникла помилка: ${error.message}`;
        } finally {
            loadingSpinner.style.display = 'none';
            draftOutput.style.display = 'block';
            generateButton.disabled = false;
        }
    });
});
