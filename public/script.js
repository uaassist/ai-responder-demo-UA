document.addEventListener('DOMContentLoaded', () => {
    const reviewInput = document.getElementById('review-input');
    const generateButton = document.getElementById('generate-button');
    const resultContainer = document.getElementById('result-container');
    const draftOutput = document.getElementById('draft-output');
    const loadingSpinner = document.getElementById('loading-spinner');

    generateButton.addEventListener('click', async () => {
        const reviewText = reviewInput.value;
        if (!reviewText.trim()) {
            alert('Будь ласка, спочатку вставте відгук.'); // Please paste a review first.
            return;
        }

        // Show loading state
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
                throw new Error('Сервіс AI не відповів. Спробуйте ще раз.'); // The AI service failed to respond.
            }

            const data = await response.json();
            draftOutput.value = data.draftReply;

        } catch (error) {
            draftOutput.value = `Виникла помилка: ${error.message}`; // An error occurred
        } finally {
            // Hide loading state and show result
            loadingSpinner.style.display = 'none';
            draftOutput.style.display = 'block';
            generateButton.disabled = false;
        }
    });
});