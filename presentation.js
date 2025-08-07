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
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dataParam = urlParams.get('data');
            
            // Jeśli dane są przekazane w URL
            if (dataParam) {
                try {
                    const decodedData = decodeURIComponent(dataParam);
                    console.log('🔍 RAW dane z URL (dekodowane):', decodedData);
                    console.log('🔍 RAW dane z URL (pierwsze 500 znaków):', decodedData.substring(0, 500));
                    
                    const presentationData = JSON.parse(decodedData);
                    console.log('📊 Dane z URL (sparsowane):', presentationData);
                    
                    // Sprawdź czy dane zawierają slajdy
                    if (presentationData && presentationData.slides && Array.isArray(presentationData.slides)) {
                        return presentationData;
                    } else if (presentationData && presentationData.json_result) {
                        // Obsługa przypadku, gdy mamy dane z n8n w innym formacie
                        // Konwersja danych z formatu n8n do formatu prezentacji
                        console.log('🔄 Konwersja danych z n8n do formatu prezentacji');
                        return convertDataToPresentation(presentationData);
                    }
                } catch (error) {
                    console.error('❌ Błąd podczas parsowania danych z URL:', error);
                    throw new Error('Nieprawidłowy format danych w URL');
                }
            }
            
            // Jeśli jest parametr webhookUrl, spróbuj pobrać dane z n8n
            const webhookUrl = urlParams.get('webhookUrl');
            if (webhookUrl) {
                try {
                    // Określ, czy używamy proxy CORS
                    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    const apiUrl = isLocalhost ? 'http://localhost:3001' : webhookUrl;
                    
                    console.log('🌐 Pobieranie danych z:', apiUrl);
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            action: 'getPresentation',
                            message: urlParams.get('message') || 'generate_presentation'
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Błąd HTTP: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('📊 Dane z n8n:', data);
                    
                    // Sprawdź czy dane zawierają slajdy
                    if (data && data.slides && Array.isArray(data.slides)) {
                        return data;
                    } else if (data && data.json_result) {
                        // Obsługa przypadku, gdy mamy dane z n8n w innym formacie
                        return convertDataToPresentation(data);
                    } else {
                        throw new Error('Nieprawidłowy format danych z n8n');
                    }
                } catch (error) {
                    console.error('❌ Błąd podczas pobierania danych z n8n:', error);
                    throw error;
                }
            }
            
            // Jeśli nie udało się pobrać danych - ERROR
            console.error('❌ Brak danych do prezentacji');
            throw new Error('Brak danych do prezentacji');
        } catch (error) {
            console.error('❌ Błąd w getPresentationData:', error);
            
            // Pokaż użytkownikowi błąd zamiast przykładowych danych
            document.getElementById('slide-header').textContent = 'BŁĄD DANYCH';
            document.getElementById('slide-body').innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Błąd:</strong> ${error.message}<br/>
                    <strong>Sprawdź konsolę dla szczegółów</strong>
                </div>
            `;
            
            throw error;
        }
    }
    
    // Funkcja konwertująca dane z n8n do formatu prezentacji
    function convertDataToPresentation(data) {
        console.log('🔄 Konwersja danych:', data);
        
        // Sprawdź różne możliwe formaty danych
        let jsonResult = null;
        
        if (data.json_result) {
            jsonResult = data.json_result;
        } else if (data.output && data.output.json_result) {
            jsonResult = data.output.json_result;
        } else {
            // Szukaj głębiej w strukturze
            for (const key in data) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    if (data[key].json_result) {
                        jsonResult = data[key].json_result;
                        break;
                    } else if (data[key].output && data[key].output.json_result) {
                        jsonResult = data[key].output.json_result;
                        break;
                    }
                }
            }
        }
        
        // Jeśli nie znaleziono danych - ERROR
        if (!jsonResult) {
            console.error('❌ Nie znaleziono danych w formacie json_result. Otrzymane dane:', data);
            throw new Error('Brak prawidłowych danych z n8n');
        }
        
        // Konwersja danych do formatu prezentacji
        const presentationData = {
            slides: [
                {
                    number: 1,
                    header: "Problem Statement",
                    body: `Many ${jsonResult.customer || 'users'} struggle with ${jsonResult.problem || 'various issues'}.`,
                    image: "Problem Visualization",
                    photo_desc: `Photo showing ${jsonResult.problem || 'problem'} visualization`,
                    narration: `We've identified a critical problem affecting ${jsonResult.customer || 'users'} related to ${jsonResult.problem || 'various issues'}.`
                },
                {
                    number: 2,
                    header: "Our Solution",
                    body: `We provide a solution that is uniquely ${jsonResult.unique || 'effective'} for ${jsonResult.customer || 'users'}.`,
                    image: "Solution Diagram",
                    photo_desc: "Diagram illustrating our solution approach",
                    narration: `Our approach offers a ${jsonResult.unique || 'unique'} solution to the ${jsonResult.problem || 'problem'}.`
                },
                {
                    number: 3,
                    header: "Benefits & Value Proposition",
                    body: `By being ${jsonResult.unique || 'different'}, we deliver exceptional value to ${jsonResult.customer || 'users'} struggling with ${jsonResult.problem || 'problems'}.`,
                    image: "Benefits Chart",
                    photo_desc: "Chart showing key benefits of our solution",
                    narration: "The unique advantages of our approach translate into measurable benefits for our customers."
                }
            ]
        };
        
        console.log('📊 Wygenerowane dane prezentacji:', presentationData);
        return presentationData;
    }
    
    // Funkcja zwracająca przykładowe dane
    function getExampleData() {
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
            
            // Wyświetl komunikat o błędzie
            slidesContainer.innerHTML = `
                <div class="p-8 text-center">
                    <div class="text-red-600 text-xl mb-4">❌ Wystąpił błąd podczas ładowania prezentacji</div>
                    <p class="text-gray-700 mb-4">${error.message}</p>
                    <a href="index.html" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg">
                        Powrót do strony głównej
                    </a>
                </div>
            `;
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