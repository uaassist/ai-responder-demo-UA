document.addEventListener('DOMContentLoaded', () => {
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

        // Add loading state to the button
        generateButton.disabled = true;
        generateButton.innerHTML = `Обробка запиту<span class="loading-dot">.</span><span class="loading-dot">.</span><span class="loading-dot">.</span>`; 

        resultContainer.style.display = 'block';
        draftOutput.style.display = 'none';
        loadingSpinner.style.display = 'block';
        
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
            // Restore the button to its original state
            generateButton.disabled = false;
            generateButton.innerHTML = '✨ Створити відповідь з AI';
            
            loadingSpinner.style.display = 'none';
            draftOutput.style.display = 'block';
        }
    });
});
