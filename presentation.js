document.addEventListener('DOMContentLoaded', function() {
    // Elementy DOM
    const slidesContainer = document.getElementById('slides-container');
    const slideIndicator = document.getElementById('slide-indicator');
    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    
    // Stan prezentacji
    let currentSlideIndex = 0;
    let slides = [];
    
    // Funkcja do pobrania danych prezentacji z URL lub z n8n
    async function getPresentationData() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        // Jeśli dane są przekazane w URL
        if (dataParam) {
            try {
                const decodedData = decodeURIComponent(dataParam);
                const presentationData = JSON.parse(decodedData);
                return presentationData;
            } catch (error) {
                console.error('Błąd podczas parsowania danych z URL:', error);
            }
        }
        
        // Jeśli jest parametr webhookUrl, spróbuj pobrać dane z n8n
        const webhookUrl = urlParams.get('webhookUrl');
        if (webhookUrl) {
            try {
                // Określ, czy używamy proxy CORS
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const apiUrl = isLocalhost ? 'http://localhost:3001' : webhookUrl;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'getPresentation' })
                });
                
                if (!response.ok) {
                    throw new Error('Błąd pobierania danych z n8n');
                }
                
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Błąd podczas pobierania danych z n8n:', error);
            }
        }
        
        // Jeśli nie udało się pobrać danych, zwróć przykładowe dane
        return {
            slides: [
                {
                    number: 1,
                    header: "Problem Statement",
                    body: "Many dog owners struggle to help their pets maintain a healthy weight, leading to various health issues and reduced quality of life for their beloved companions.",
                    image: "Dog Health Infographic",
                    photo_desc: "Photo Description: Infographic showing obesity statistics in dogs",
                    narration: "Today, we're addressing a critical issue affecting millions of dogs worldwide - obesity and weight management challenges that impact their health and happiness."
                },
                {
                    number: 2,
                    header: "Solution Overview",
                    body: "Our innovative app connects dog owners with veterinary nutritionists and provides personalized meal plans and exercise routines tailored to each dog's specific needs.",
                    image: "App Interface Screenshot",
                    photo_desc: "Screenshot showing the app's meal planning interface",
                    narration: "Our solution brings professional guidance directly to pet owners through an easy-to-use mobile application."
                },
                {
                    number: 3,
                    header: "Market Opportunity",
                    body: "With over 85 million dog owners in the US alone and pet obesity rates rising to 60%, the market for effective weight management solutions is substantial and growing.",
                    image: "Market Growth Chart",
                    photo_desc: "Chart showing growth in pet health app market",
                    narration: "The pet health market represents a $20 billion opportunity with consistent year-over-year growth."
                }
            ]
        };
    }

    // Funkcja do tworzenia elementu slajdu
    function createSlideElement(slideData) {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slide p-8 hidden';
        
        slideDiv.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <div class="text-gray-600">Slide ${slideData.number}</div>
            </div>
            
            <h2 class="text-2xl font-bold mb-6">${slideData.header || ''}</h2>
            
            <p class="text-gray-700 mb-8">
                ${slideData.body || ''}
            </p>
            
            <div class="mb-8">
                <div class="mb-2">Image</div>
                <div class="bg-gray-100 h-48 flex items-center justify-center rounded-md">
                    ${slideData.image || ''}
                </div>
                <div class="text-sm text-gray-500 mt-2">
                    ${slideData.photo_desc || ''}
                </div>
            </div>
            
            <div class="mt-8 text-blue-600">
                <div class="font-bold">Narration</div>
                <p>
                    ${slideData.narration || ''}
                </p>
            </div>
        `;
        
        return slideDiv;
    }

    // Funkcja do wyświetlania slajdu
    function showSlide(index) {
        // Ukryj wszystkie slajdy
        document.querySelectorAll('.slide').forEach(slide => {
            slide.classList.add('hidden');
            slide.classList.remove('active');
        });
        
        // Pokaż wybrany slajd
        const slideToShow = document.querySelectorAll('.slide')[index];
        if (slideToShow) {
            slideToShow.classList.remove('hidden');
            slideToShow.classList.add('active');
            
            // Aktualizuj wskaźnik slajdu
            slideIndicator.textContent = `Slajd ${index + 1} z ${slides.length}`;
            
            // Aktualizuj stan przycisków
            prevButton.disabled = index === 0;
            nextButton.disabled = index === slides.length - 1;
            
            // Aktualizuj aktualny indeks
            currentSlideIndex = index;
        }
    }

    // Inicjalizacja prezentacji
    async function initPresentation() {
        try {
            // Pobierz dane prezentacji
            const presentationData = await getPresentationData();
            
            // Zapisz slajdy
            slides = presentationData.slides || [];
            
            // Wyczyść kontener slajdów
            slidesContainer.innerHTML = '';
            
            // Stwórz elementy slajdów
            slides.forEach(slideData => {
                const slideElement = createSlideElement(slideData);
                slidesContainer.appendChild(slideElement);
            });
            
            // Pokaż pierwszy slajd
            if (slides.length > 0) {
                showSlide(0);
            } else {
                slideIndicator.textContent = 'Brak slajdów';
                prevButton.disabled = true;
                nextButton.disabled = true;
            }
        } catch (error) {
            console.error('Błąd podczas inicjalizacji prezentacji:', error);
            slideIndicator.textContent = 'Błąd ładowania prezentacji';
        }
    }

    // Obsługa przycisków nawigacji
    prevButton.addEventListener('click', function() {
        if (currentSlideIndex > 0) {
            showSlide(currentSlideIndex - 1);
        }
    });
    
    nextButton.addEventListener('click', function() {
        if (currentSlideIndex < slides.length - 1) {
            showSlide(currentSlideIndex + 1);
        }
    });
    
    // Obsługa nawigacji klawiszami
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            if (currentSlideIndex > 0) {
                showSlide(currentSlideIndex - 1);
            }
        } else if (event.key === 'ArrowRight') {
            if (currentSlideIndex < slides.length - 1) {
                showSlide(currentSlideIndex + 1);
            }
        }
    });

    // Inicjalizuj prezentację
    initPresentation();
}); 