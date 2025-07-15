// === KONFIGURACJA ===
// Oryginalny URL webhooka n8n
const ORIGINAL_N8N_WEBHOOK_URL = 'https://anna2084.app.n8n.cloud/webhook/b4a90a57-3ee9-4caa-ac80-73cc38dbbbce';

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

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Przypadek 1: Standardowa struktura {reply: "text"}
    if (data && typeof data === 'object' && data.reply) {
        console.log('✅ Znaleziono data.reply:', data.reply);
        return data.reply;
    }
    
    // Przypadek 2: Alternatywna struktura {message: "text"}
    if (data && typeof data === 'object' && data.message) {
        console.log('✅ Znaleziono data.message:', data.message);
        return data.message;
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
                return data;
            }
        } else {
            console.log('✅ Odpowiedź jako zwykły tekst:', data);
            return data;
        }
    }
    
    // Przypadek 4: Złożona struktura n8n - przeszukaj rekurencyjnie
    const extractFromNestedObject = (obj, depth = 0) => {
        if (depth > 5) return null; // Zapobieganie nieskończonej rekurencji
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                // Jeśli wartość to string i wygląda na odpowiedź
                if (typeof value === 'string' && value.length > 10) {
                    // Sprawdź czy to nie jest techniczny klucz
                    if (!key.includes('id') && !key.includes('code') && !key.includes('status')) {
                        console.log(`✅ Znaleziono tekst w kluczu "${key}":`, value);
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
    
    // Sprawdź czy to obiekt z zagnieżdżonymi danymi
    if (typeof data === 'object' && data !== null) {
        // Rekurencyjne wyszukiwanie
        const extracted = extractFromNestedObject(data);
        if (extracted) return extracted;
        
        // Jako ostatnia opcja - sprawdź czy pierwszy klucz może być odpowiedzią
        const firstKey = Object.keys(data)[0];
        if (firstKey && typeof firstKey === 'string' && firstKey.length > 20) {
            console.log('⚠️ Używam pierwszego klucza jako odpowiedź:', firstKey);
            return firstKey;
        }
    }
    
    console.log('❌ Nie udało się wydobyć odpowiedzi AI');
    return null;
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
            // Jeśli błąd CORS w produkcji, spróbuj z CORS proxy
            if (!IS_LOCAL && !USE_CORS_PROXY && (
                error.message.includes('CORS') || 
                error.message.includes('fetch') ||
                error.name === 'TypeError'
            )) {
                console.log('🔄 Błąd CORS - przełączam na CORS proxy...');
                USE_CORS_PROXY = true;
                N8N_WEBHOOK_URL = CORS_PROXY_URL;
                updateConnectionStatus('🔄 Przełączam na CORS proxy...', 'sending');
                
                response = await sendMessage(CORS_PROXY_URL, true);
            } else {
                throw error; // Inne błędy przerzuć dalej
            }
        }
        
        // Parsowanie odpowiedzi JSON
        let data;
        const responseText = await response.text();
        
        if (responseText.trim()) {
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                data = { reply: responseText }; // Użyj raw text jako odpowiedź
            }
        } else {
            // Pusta odpowiedź z n8n
            data = { reply: "✅ Wiadomość została odebrana przez n8n (pusta odpowiedź)" };
        }
        
        // Wyświetlenie odpowiedzi AI
        const aiResponse = extractAIResponse(data);
        
        // Komunikat o sukcesie w zależności od metody
        const successStatus = IS_LOCAL 
            ? '✅ Połączenie aktywne (proxy lokalny)'
            : USE_CORS_PROXY 
                ? '✅ Połączenie aktywne (CORS proxy)' 
                : '✅ Połączenie aktywne (bezpośrednie)';
        
        if (aiResponse) {
            displayAIMessage(aiResponse);
            updateConnectionStatus(successStatus, 'success');
        } else {
            displayAIMessage("✅ n8n webhook zareagował poprawnie!");
            updateConnectionStatus(successStatus, 'success');
        }
        
    } catch (error) {
        // Obsługa błędów
        console.error('Błąd podczas wysyłania wiadomości:', error);
        console.error('🔧 Środowisko:', IS_LOCAL ? 'LOKALNE' : 'PRODUKCJA');
        console.error('🎯 URL:', N8N_WEBHOOK_URL);
        
        let errorMessage = 'Wystąpił błąd podczas komunikacji z AI.';
        let statusMessage = '❌ Błąd połączenia';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (IS_LOCAL) {
                errorMessage = 'Błąd połączenia z proxy. Sprawdź czy serwer proxy jest uruchomiony (node cors-proxy.js).';
                statusMessage = '❌ Błąd proxy - uruchom serwer';
            } else {
                errorMessage = 'Błąd połączenia z n8n webhook. Sprawdź URL webhooka i połączenie internetowe.';
                statusMessage = '❌ Błąd połączenia z n8n';
            }
        } else if (error.message.includes('HTTP')) {
            errorMessage = `Błąd serwera: ${error.message}`;
            statusMessage = IS_LOCAL ? '❌ Błąd proxy' : '❌ Błąd n8n webhook';
        } else if (error.message.includes('CORS')) {
            if (IS_LOCAL) {
                errorMessage = 'Błąd CORS - uruchom serwer proxy lokalnie (node cors-proxy.js).';
                statusMessage = '❌ CORS - brak proxy';
            } else {
                errorMessage = 'Błąd CORS - webhook może nie być dostępny z przeglądarki.';
                statusMessage = '❌ CORS - błąd webhooka';
            }
        }
        
        displaySystemMessage(`❌ ${errorMessage}`);
        updateConnectionStatus(statusMessage, 'error');
        
    } finally {
        // Przywrócenie normalnego stanu
        setLoadingState(false);
        
        // Przywrócenie fokusu na pole wprowadzania
        messageInput.focus();
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
    messageDiv.classList.add('message-fade-in');
    
    let avatarIcon, bgColor, textAlign, nameLabel;
    
    switch (type) {
        case 'user':
            avatarIcon = '👤';
            bgColor = 'bg-blue-500';
            textAlign = 'justify-end';
            nameLabel = 'Ty';
            break;
        case 'ai':
            avatarIcon = '🤖';
            bgColor = 'bg-gray-500';
            textAlign = 'justify-start';
            nameLabel = 'AI';
            break;
        case 'system':
            avatarIcon = 'ℹ️';
            bgColor = 'bg-yellow-500';
            textAlign = 'justify-center';
            nameLabel = 'System';
            break;
    }
    
    messageDiv.innerHTML = `
        <div class="flex ${textAlign}">
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${type === 'user' ? 'bg-blue-600 text-white' : type === 'ai' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}">
                <div class="flex items-center mb-1">
                    <span class="text-sm mr-2">${avatarIcon}</span>
                    <span class="text-xs font-medium opacity-75">${nameLabel}</span>
                </div>
                <div class="text-sm">${content}</div>
            </div>
        </div>
    `;
    
    return messageDiv;
}

function addMessageToContainer(messageElement) {
    messagesContainer.appendChild(messageElement);
    
    // Automatyczne przewinięcie do końca
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// === FUNKCJE POMOCNICZE ===

function setLoadingState(isLoading) {
    sendButton.disabled = isLoading;
    messageInput.disabled = isLoading;
    
    if (isLoading) {
        sendButton.textContent = 'Wysyłanie...';
        sendButton.classList.add('opacity-50');
    } else {
        sendButton.textContent = 'Wyślij';
        sendButton.classList.remove('opacity-50');
    }
}

function updateConnectionStatus(message, type = 'default') {
    connectionStatus.textContent = message;
    
    // Usunięcie poprzednich klas statusu
    connectionStatus.classList.remove('text-gray-500', 'text-green-600', 'text-red-600', 'text-yellow-600', 'text-blue-600');
    
    // Dodanie odpowiedniej klasy w zależności od typu
    switch (type) {
        case 'success':
            connectionStatus.classList.add('text-green-600');
            break;
        case 'error':
            connectionStatus.classList.add('text-red-600');
            break;
        case 'warning':
            connectionStatus.classList.add('text-yellow-600');
            break;
        case 'sending':
            connectionStatus.classList.add('text-blue-600');
            break;
        default:
            connectionStatus.classList.add('text-gray-500');
    }
}

function clearWelcomeMessage() {
    // Usunięcie wiadomości powitalnej po pierwszej interakcji
    const welcomeMessage = messagesContainer.querySelector('.text-center');
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