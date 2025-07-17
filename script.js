// === KONFIGURACJA ===
// Oryginalny URL webhooka n8n
const ORIGINAL_N8N_WEBHOOK_URL = 'https://anna2084.app.n8n.cloud/webhook-test/1221a370-32ad-4fd0-92d2-1a930407c2aa';

// Automatyczne wykrycie środowiska (lokalne vs produkcja)
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// CORS proxy dla produkcji (rozwiązuje problemy z CORS w n8n)
const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);

// URL do użycia w zależności od środowiska
let N8N_WEBHOOK_URL = IS_LOCAL 
    ? 'http://localhost:3001'  // Lokalnie używaj lokalny proxy
    : ORIGINAL_N8N_WEBHOOK_URL; // Produkcyjnie spróbuj bezpośrednio n8n

// Flaga dla CORS fallback w produkcji
let USE_CORS_PROXY = false;

// === REFERENCJE DO ELEMENTÓW DOM ===
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const connectionStatus = document.getElementById('connection-status');

// === PRZECHOWYWANIE WIADOMOŚCI ===
let messages = [];
let conversationComplete = false; // Flaga do śledzenia zakończenia rozmowy

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Aplikacja chat AI została zainicjalizowana');
    
    updateConnectionStatus('🔌 Łączenie z serwerem...', 'connecting');
    
    // Sprawdzenie czy serwer jest dostępny
    checkServerConnection();
    
    // Ustawienie event listenerów
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
    
    sendButton.addEventListener('click', handleSendMessage);
    
    // Ustawienie fokusu na pole wprowadzania
    messageInput.focus();
    
    // Usunięcie wiadomości powitalnej po pierwszej interakcji
    clearWelcomeMessage();
    
    // Wyświetlenie statusu gotowości w zależności od środowiska
    const statusMessage = IS_LOCAL 
        ? '🔗 Gotowy (tryb lokalny: proxy localhost:3001)'
        : '🌐 Gotowy (tryb produkcyjny: n8n + fallback CORS proxy)';
    
    updateConnectionStatus(statusMessage, 'default');
    
    // Log diagnostyczny
    console.log('🏗️ Środowisko:', IS_LOCAL ? 'LOKALNE' : 'PRODUKCJA');
    console.log('🎯 Webhook URL:', N8N_WEBHOOK_URL);
    console.log('🔄 CORS Proxy URL:', CORS_PROXY_URL);
});

// === OBSŁUGA ZDARZEŃ ===

// Obsługa kliknięcia przycisku "Wyślij"
sendButton.addEventListener('click', function() {
    handleSendMessage();
});

// Obsługa naciśnięcia klawisza Enter w polu wprowadzania
messageInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
});

// === FUNKCJA WYDOBYWANIA ODPOWIEDZI AI Z ZŁOŻONEJ STRUKTURY N8N ===
function extractAIResponse(data) {
    console.log('🔍 Analizuję odpowiedź n8n:', data);
    console.log('🔍 Typ danych:', typeof data);
    console.log('🔍 Klucze:', Object.keys(data || {}));
    
    // WCZESNE RETURN - Przypadek 1: Standardowa struktura {reply: "text"}
    if (data && typeof data === 'object' && data.reply && typeof data.reply === 'string') {
        console.log('✅ Znaleziono data.reply:', data.reply);
        checkForConversationEnd(data.reply);
        return data.reply; // ZATRZYMAJ TUTAJ - nie sprawdzaj nic więcej!
    }
    
    // WCZESNE RETURN - Przypadek 2: Alternatywna struktura {message: "text"}
    if (data && typeof data === 'object' && data.message && typeof data.message === 'string') {
        console.log('✅ Znaleziono data.message:', data.message);
        checkForConversationEnd(data.message);
        return data.message; // ZATRZYMAJ TUTAJ
    }
    
    // Przypadek 3: Jeśli dane to string, może zawierać JSON - spróbuj sparsować
    if (typeof data === 'string') {
        // Sprawdź czy to JSON string
        if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(data);
                console.log('🔄 Sparsowano JSON ze stringa:', parsed);
                return extractAIResponse(parsed); // Rekurencyjnie analizuj sparsowany obiekt
            } catch (e) {
                console.log('⚠️ Nie udało się sparsować JSON, używam jako zwykły tekst');
                checkForConversationEnd(data);
                return data;
            }
        } else {
            console.log('✅ Odpowiedź jako zwykły tekst:', data);
            checkForConversationEnd(data);
            return data;
        }
    }
    
    // Przypadek 4: Złożona struktura n8n - przeszukaj rekurencyjnie (tylko jeśli NIE ma reply/message)
    if (typeof data === 'object' && data !== null) {
        console.log('🔍 Brak standardowych pól, szukam w zagnieżdżonych strukturach...');
        
        const extractFromNestedObject = (obj, depth = 0) => {
            if (depth > 5) return null; // Zapobieganie nieskończonej rekurencji
            
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    
                    // Jeśli wartość to string i wygląda na odpowiedź
                    if (typeof value === 'string' && value.length > 10) {
                        // Sprawdź czy to nie jest techniczny klucz
                        if (!key.includes('id') && !key.includes('code') && !key.includes('status')) {
                            console.log(`✅ Znaleziono tekst w zagnieżdżonym kluczu "${key}":`, value);
                            checkForConversationEnd(value);
                            return value;
                        }
                    }
                    
                    // Rekurencyjne przeszukiwanie obiektów
                    if (typeof value === 'object' && value !== null) {
                        const nestedResult = extractFromNestedObject(value, depth + 1);
                        if (nestedResult) return nestedResult;
                    }
                }
            }
            return null;
        };
        
        // Rekurencyjne wyszukiwanie
        const extracted = extractFromNestedObject(data);
        if (extracted) {
            console.log('✅ Znaleziono w zagnieżdżonej strukturze:', extracted);
            return extracted;
        }
        
        // OSTATECZNY FALLBACK - tylko jeśli nic innego nie zadziałało
        const firstKey = Object.keys(data)[0];
        if (firstKey && typeof firstKey === 'string' && firstKey.length > 20) {
            console.log('⚠️ FALLBACK: Używam pierwszego klucza jako odpowiedź:', firstKey);
            checkForConversationEnd(firstKey);
            return firstKey;
        }
    }
    
    console.log('❌ Nie udało się wydobyć odpowiedzi AI');
    return null;
}

// === FUNKCJA SPRAWDZANIA ZAKOŃCZENIA ROZMOWY ===
function checkForConversationEnd(text) {
    console.log('🔍 Sprawdzam tekst pod kątem zakończenia rozmowy:', text);
    
    // BARDZO PRECYZYJNE TRIGGERY - tylko faktyczne zakończenie po wszystkich 3 pytaniach
    const finalEndTriggers = [
        'Thanks! You\'ve completed all questions. We\'ll use your answers to generate the pitch',
        'Now I\'ll prepare your final output',
        'Here\'s the output:',
        'Here\'s the summary:',
        'I\'ve compiled everything into a structured format for you',
        'Thanks for sharing your ideas! I\'ve compiled everything',
        'Thanks for providing the information! I\'ll compile it into a structured format'
    ];
    
    // DODATOWE SPRAWDZENIE: czy tekst zawiera JSON z wszystkimi 3 kluczami
    const hasCompleteJson = text.includes('customer') && 
                           text.includes('problem') && 
                           text.includes('unique') &&
                           text.includes('json_result');
    
    // DŁUGOŚĆ SPRAWDZENIE: finalna odpowiedź powinna być długa (zawiera podsumowanie)
    const isLongResponse = text.length > 300;
    
    // SPRAWDZENIE SŁÓW KOŃCOWYCH: czy zawiera strukturę JSON
    const hasJsonStructure = text.includes('```json') || text.includes('json_result');
    
    const foundTrigger = finalEndTriggers.find(trigger => 
        text.includes(trigger)
    );
    
    if (foundTrigger && hasCompleteJson && isLongResponse && hasJsonStructure) {
        console.log('✅ ZNALEZIONO KOMPLETNY TRIGGER ZAKOŃCZENIA:');
        console.log('   - Trigger:', foundTrigger);
        console.log('   - Ma kompletny JSON:', hasCompleteJson);
        console.log('   - Jest długa odpowiedź:', isLongResponse);
        console.log('   - Ma strukturę JSON:', hasJsonStructure);
        conversationComplete = true;
        return true;
    }
    
    if (foundTrigger) {
        console.log('⚠️ Znaleziono trigger ale brak warunków dodatkowych:', foundTrigger);
    }
    
    console.log('❌ Nie znaleziono kompletnego triggera zakończenia');
    return false;
}

// === GŁÓWNA FUNKCJA WYSYŁANIA WIADOMOŚCI ===
async function handleSendMessage() {
    const messageText = messageInput.value.trim();
    
    // Sprawdzenie czy wiadomość nie jest pusta
    if (!messageText) {
        return;
    }
    
    try {
        // Wyświetlenie wiadomości użytkownika
        displayUserMessage(messageText);
        
        // Wyczyszczenie pola wprowadzania
        messageInput.value = '';
        
        // Ustawienie stanu ładowania
        setLoadingState(true);
        updateConnectionStatus('📤 Wysyłanie wiadomości...', 'sending');
        
        // Funkcja wysyłania z fallback dla CORS
        const sendMessage = async (url, useCorsProxy = false) => {
            const actualUrl = useCorsProxy ? CORS_PROXY_URL : url;
            console.log(`📡 Próbuję wysłać do: ${actualUrl}`);
            console.log(`🔧 CORS Proxy: ${useCorsProxy ? 'TAK' : 'NIE'}`);
            
            const response = await fetch(actualUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageText
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        };
        
        // Główna logika wysyłania z fallback
        let response;
        try {
            // Pierwsze podejście: użyj aktualnego URL
            response = await sendMessage(N8N_WEBHOOK_URL, USE_CORS_PROXY);
        } catch (error) {
            console.log('⚠️ Błąd pierwszego podejścia:', error.message);
            
            // Jeśli jesteśmy w produkcji i nie używamy jeszcze CORS proxy, spróbuj z nim
            if (!IS_LOCAL && !USE_CORS_PROXY) {
                console.log('🔄 Próbuję z CORS proxy...');
                USE_CORS_PROXY = true;
                try {
                    response = await sendMessage(N8N_WEBHOOK_URL, USE_CORS_PROXY);
                } catch (proxyError) {
                    throw new Error(`Błąd z CORS proxy: ${proxyError.message}`);
                }
            } else {
                throw error;
            }
        }
        
        // Przetwarzanie odpowiedzi
        const data = await response.json();
        console.log('📥 Otrzymano odpowiedź:', data);
        
        // Wydobycie odpowiedzi AI z potencjalnie złożonej struktury
        const aiResponse = extractAIResponse(data);
        
        if (aiResponse) {
            // SPRAWDŹ CZY TO FINALNA ODPOWIEDŹ Z JSON
            const isFinalizingResponse = aiResponse.includes('Thanks for your answers!') || 
                                       aiResponse.includes('Thanks! You\'ve completed all questions') ||
                                       aiResponse.includes('json_result');
            
            let displayMessage = aiResponse;
            
            // Jeśli to finalna odpowiedź, pokazuj tylko krótką wiadomość
            if (isFinalizingResponse) {
                displayMessage = "Thanks for your answers! 🎉\n\nPrzygotowuję prezentację na podstawie Twojego pomysłu...";
            }
            
            // Wyświetlenie odpowiedzi AI (krótka lub pełna)
            displayAIMessage(displayMessage);
            
            console.log('�� SPRAWDZANIE PEŁNEJ ODPOWIEDZI AI:', aiResponse);
            
            // BARDZO PROSTSZE SPRAWDZENIE - szukaj konkretnej frazy TYLKO po zakończeniu wszystkich 3 pytań
            const simpleTriggers = [
                'Thanks! You\'ve completed all questions. We\'ll use your answers to generate the pitch',
                'Now I\'ll prepare your final output',
                'I\'ve compiled everything into a structured format for you',
                'Thanks for sharing your ideas! I\'ve compiled everything',
                'Thanks for providing the information! I\'ll compile it into a structured format'
            ];
            
            // DODATOWE WARUNKI BEZPIECZEŃSTWA
            const hasJsonResult = aiResponse.includes('json_result');
            const hasAllThreeKeys = aiResponse.includes('customer') && 
                                   aiResponse.includes('problem') && 
                                   aiResponse.includes('unique');
            const isVeryLongResponse = aiResponse.length > 400; // Jeszcze dłuższa odpowiedź
            
            const foundSimpleTrigger = simpleTriggers.find(trigger => 
                aiResponse.includes(trigger)
            );
            
            // TYLKO jeśli wszystkie warunki są spełnione
            if (foundSimpleTrigger && hasJsonResult && hasAllThreeKeys && isVeryLongResponse) {
                console.log('🚀 ZNALEZIONO PROSTĘ FRAZĘ - PRZEKIEROWANIE!', foundSimpleTrigger);
                setTimeout(() => {
                    const redirectUrl = 'loading.html?message=' + encodeURIComponent(messageText) + 
                                      '&webhookUrl=' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);
                    console.log('🔗 Przekierowuję do:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 2000); // Daj użytkownikowi więcej czasu przeczytać krótką wiadomość
                return;
            }
            
            // NATYCHMIASTOWE SPRAWDZENIE ZAKOŃCZENIA
            if (checkForConversationEnd(aiResponse) || conversationComplete) {
                console.log('🚀 PRZEKIEROWANIE DO LOADING - ROZMOWA ZAKOŃCZONA!');
                setTimeout(() => {
                    const redirectUrl = 'loading.html?message=' + encodeURIComponent(messageText) + 
                                      '&webhookUrl=' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);
                    console.log('🔗 Przekierowuję do:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 1000); // Daj użytkownikowi czas przeczytać odpowiedź
                return; // Zatrzymaj dalsze przetwarzanie
            }
            
            // Sprawdź czy odpowiedź zawiera informację o zakończeniu rozmowy (stary kod)
            const endTriggers = [
                'podsumowanie',
                'summary',
                'json_result',
                'JSON object',
                'We\'ll use your answers',
                'generate the pitch',
                'completed all questions',
                'Here\'s the output',
                'Here\'s the summary',
                'Thanks! You\'ve completed',
                'Thank you for your response! Your solution is unique',
                'Here\'s a summary of your answers',
                'Now, here\'s the JSON object'
            ];
            
            const containsEndTrigger = endTriggers.some(trigger => 
                aiResponse.toLowerCase().includes(trigger.toLowerCase())
            );
            
            const hasUniqueAndThirdQuestion = aiResponse.toLowerCase().includes('unique') && 
                                            (aiResponse.toLowerCase().includes('solution') || 
                                             aiResponse.toLowerCase().includes('customer'));
            
            const hasJsonAndCustomer = aiResponse.toLowerCase().includes('json') && 
                                     aiResponse.toLowerCase().includes('customer') && 
                                     aiResponse.toLowerCase().includes('problem');
            
            const hasThankYouAnswers = aiResponse.toLowerCase().includes('thank you') && 
                                     aiResponse.toLowerCase().includes('answers');
            
            if (containsEndTrigger || hasUniqueAndThirdQuestion || hasJsonAndCustomer || hasThankYouAnswers) {
                console.log('🎯 WYKRYTO ZAKOŃCZENIE ROZMOWY - PRZEKIEROWANIE DO LOADING');
                setTimeout(() => {
                    window.location.href = 'loading.html?message=' + encodeURIComponent(messageText) + '&webhookUrl=' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);
                }, 2000);
            }
        } else {
            displaySystemMessage('Nie udało się odczytać odpowiedzi.');
        }
        
        // Resetowanie stanu ładowania
        setLoadingState(false);
        updateConnectionStatus('✅ Gotowy do wysyłania', 'default');
        
    } catch (error) {
        console.error('❌ Błąd:', error);
        displaySystemMessage(`Wystąpił błąd: ${error.message}`);
        setLoadingState(false);
        updateConnectionStatus('❌ Błąd połączenia', 'error');
    }
}

// === FUNKCJE WYŚWIETLANIA WIADOMOŚCI ===

function displayUserMessage(message) {
    const messageElement = createMessageElement(message, 'user');
    addMessageToContainer(messageElement);
    
    // Dodanie do tablicy wiadomości
    messages.push({ type: 'user', content: message, timestamp: new Date() });
}

function displayAIMessage(message) {
    const messageElement = createMessageElement(message, 'ai');
    addMessageToContainer(messageElement);
    
    // Dodanie do tablicy wiadomości
    messages.push({ type: 'ai', content: message, timestamp: new Date() });
}

function displaySystemMessage(message) {
    const messageElement = createMessageElement(message, 'system');
    addMessageToContainer(messageElement);
}

function createMessageElement(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-container flex ' + (type === 'user' ? 'justify-end' : 'justify-start');
    
    let messageContent = '';
    
    if (type === 'user') {
        messageContent = `
            <div class="message user-message bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[80%]">
                ${content}
            </div>
        `;
    } else if (type === 'ai') {
        messageContent = `
            <div class="message ai-message bg-gray-100 text-gray-800 px-4 py-2 rounded-lg max-w-[80%]">
                ${content}
            </div>
        `;
    } else if (type === 'system') {
        messageContent = `
            <div class="message system-message bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg max-w-[80%] mx-auto">
                ${content}
            </div>
        `;
    }
    
    messageDiv.innerHTML = messageContent;
    return messageDiv;
}

function addMessageToContainer(messageElement) {
    // Usuń wiadomość powitalną, jeśli istnieje
    clearWelcomeMessage();
    
    // Dodaj nową wiadomość
    messagesContainer.appendChild(messageElement);
    
    // Przewiń do najnowszej wiadomości
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setLoadingState(isLoading) {
    // Wyłącz przycisk podczas ładowania
    sendButton.disabled = isLoading;
    
    // Dodaj/usuń klasę wskazującą na ładowanie
    if (isLoading) {
        sendButton.classList.add('opacity-70');
        sendButton.innerHTML = '<span class="loading-dots">Wysyłanie</span>';
    } else {
        sendButton.classList.remove('opacity-70');
        sendButton.innerHTML = 'Wyślij';
    }
}

function updateConnectionStatus(message, type = 'default') {
    connectionStatus.textContent = message;
    
    // Resetuj klasy
    connectionStatus.className = 'text-sm mt-1';
    
    // Dodaj odpowiednią klasę w zależności od typu
    switch (type) {
        case 'error':
            connectionStatus.classList.add('text-red-600');
            break;
        case 'success':
            connectionStatus.classList.add('text-green-600');
            break;
        case 'sending':
            connectionStatus.classList.add('text-blue-600');
            break;
        default:
            connectionStatus.classList.add('text-gray-500');
    }
}

function clearWelcomeMessage() {
    // Usuń wiadomość powitalną, jeśli istnieje
    const welcomeMessage = messagesContainer.querySelector('.text-center.text-gray-500');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
}

// === DODATKOWE USPRAWNIENIA UX (OPCJONALNE) ===

// Automatyczne dostosowanie wysokości pola tekstowego (jeśli potrzebne w przyszłości)
messageInput.addEventListener('input', function() {
    // Można tutaj dodać logikę rozszerzania pola tekstowego dla dłuższych wiadomości
});

// Obsługa focus i blur dla lepszego UX
messageInput.addEventListener('focus', function() {
    this.parentElement.classList.add('ring-2', 'ring-blue-500');
});

messageInput.addEventListener('blur', function() {
    this.parentElement.classList.remove('ring-2', 'ring-blue-500');
});

// === FUNKCJE DEBUGOWANIA ===
console.log('Chat AI Interface załadowany pomyślnie');
console.log('Proxy URL:', N8N_WEBHOOK_URL);
console.log('Target webhook:', ORIGINAL_N8N_WEBHOOK_URL); 