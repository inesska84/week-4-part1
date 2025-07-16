document.addEventListener('DOMContentLoaded', function() {
    // Elementy DOM
    const slideNumber = document.getElementById('slide-number');
    const slideHeader = document.getElementById('slide-header');
    const slideBody = document.getElementById('slide-body');
    const slideImage = document.getElementById('slide-image');
    const photoDescription = document.getElementById('photo-description');
    const narration = document.getElementById('narration');
    const playButton = document.getElementById('play-button');
    
    // Przykładowe dane prezentacji (w rzeczywistości będą pobierane z backendu)
    const sampleData = {
        slides: [
            {
                number: 1,
                header: "Problem Statement",
                body: "Many dog owners struggle to help their pets maintain a healthy weight, leading to various health issues and reduced quality of life for their beloved companions.",
                image: "Dog Health Infographic",
                photoDesc: "Photo Description: Infographic showing obesity statistics in dogs",
                narration: "Today, we're addressing a critical issue affecting millions of dogs worldwide - obesity and weight management challenges that impact their health and happiness."
            }
        ]
    };

    // Funkcja do pobrania danych prezentacji z URL
    function getPresentationDataFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        if (dataParam) {
            try {
                // Próbuj zdekodować i sparsować dane z URL
                const decodedData = decodeURIComponent(dataParam);
                const presentationData = JSON.parse(decodedData);
                return presentationData;
            } catch (error) {
                console.error('Błąd podczas parsowania danych z URL:', error);
                return null;
            }
        }
        
        // Jeśli nie ma danych w URL, zwróć przykładowe dane
        return sampleData;
    }

    // Funkcja do wyświetlania slajdu
    function displaySlide(slideData) {
        if (!slideData) return;
        
        // Aktualizuj elementy DOM z danymi slajdu
        slideNumber.textContent = `Slide ${slideData.number}`;
        slideHeader.textContent = slideData.header || '';
        slideBody.textContent = slideData.body || '';
        slideImage.textContent = slideData.image || '';
        photoDescription.textContent = slideData.photoDesc || '';
        narration.textContent = slideData.narration || '';
        
        // Dodaj klasę do animacji fade-in
        const elements = [slideNumber, slideHeader, slideBody, slideImage, photoDescription, narration];
        elements.forEach(el => {
            el.classList.remove('fade-in');
            setTimeout(() => el.classList.add('fade-in'), 10);
        });
    }

    // Pobierz dane prezentacji i wyświetl pierwszy slajd
    const presentationData = getPresentationDataFromURL();
    if (presentationData && presentationData.slides && presentationData.slides.length > 0) {
        displaySlide(presentationData.slides[0]);
    }

    // Obsługa przycisku odtwarzania
    playButton.addEventListener('click', function() {
        alert('Funkcja automatycznego odtwarzania prezentacji będzie dostępna wkrótce.');
    });
}); 