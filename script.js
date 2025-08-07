// === KONFIGURACJA ===
// Oryginalny URL webhooka n8n
const ORIGINAL_N8N_WEBHOOK_URL = 'https://anna2084.app.n8n.cloud/webhook/1221a370-32ad-4fd0-92d2-1a930407c2aa';

// Automatyczne wykrycie środowiska (lokalne vs produkcja)
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// URL endpoints dla różnych środowisk
const LOCAL_CORS_PROXY_URL = 'http://localhost:3001';
const SIMPLE_CORS_PROXY_URL = 'https://corsproxy.io/?' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);

// URL do użycia w zależności od środowiska
let N8N_WEBHOOK_URL = IS_LOCAL 
    ? LOCAL_CORS_PROXY_URL      // Lokalnie używaj lokalny proxy
    : SIMPLE_CORS_PROXY_URL;    // Na Vercel używaj corsproxy.io

// === REFERENCJE DO ELEMENTÓW DOM ===
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const connectionStatus = document.getElementById('connection-status');

// === PRZECHOWYWANIE WIADOMOŚCI ===
let messages = [];

// === FUNKCJA WYDOBYWANIA ODPOWIEDZI AI Z ZŁOŻONEJ STRUKTURY N8N ===
function extractAIResponse(data) {
    console.log('🔍 Analizuję odpowiedź n8n:', data);
    console.log('🔍 Typ danych:', typeof data);
    console.log('🔍 Klucze:', Object.keys(data || {}));
    
    // WCZESNE RETURN - Przypadek 1: Standardowa struktura {reply: "text"}
    if (data && typeof data === 'object' && data.reply && typeof data.reply === 'string') {
        console.log('✅ Znaleziono data.reply:', data.reply);
        return data.reply; // ZATRZYMAJ TUTAJ - nie sprawdzaj nic więcej!
    }
    
    // WCZESNE RETURN - Przypadek 2: Alternatywna struktura {message: "text"}
    if (data && typeof data === 'object' && data.message && typeof data.message === 'string') {
        console.log('✅ Znaleziono data.message:', data.message);
        return data.message; // ZATRZYMAJ TUTAJ
    }
    
    // WCZESNE RETURN - Przypadek 3: Bezpośredni string
    if (typeof data === 'string' && data.trim()) {
        console.log('✅ Znaleziono bezpośredni string:', data);
        return data.trim(); // ZATRZYMAJ TUTAJ
    }
    
    // Przypadek 4: Zagnieżdżona struktura - przeszukaj głębiej
    if (data && typeof data === 'object') {
        console.log('🔍 Przeszukuję zagnieżdżoną strukturę...');
        
        // Przeszukaj wszystkie wartości w obiekcie
        for (const [key, value] of Object.entries(data)) {
            console.log(`🔍 Sprawdzam klucz: ${key}`, value);
            
            // Jeśli wartość to string i zawiera tekst
            if (typeof value === 'string' && value.trim()) {
                console.log('✅ Znaleziono tekst w kluczu:', key, '→', value);
                return value.trim();
            }
            
            // Jeśli wartość to obiekt, sprawdź czy ma właściwość 'output'
            if (value && typeof value === 'object' && value.output && typeof value.output === 'string') {
                console.log('✅ Znaleziono value.output:', value.output);
                return value.output;
            }
            
            // Jeśli wartość to obiekt, rekurencyjnie sprawdź
            if (value && typeof value === 'object') {
                const nestedResult = extractAIResponse(value);
                if (nestedResult) {
                    console.log('✅ Znaleziono w zagnieżdżonej strukturze:', nestedResult);
                    return nestedResult;
                }
            }
        }
    }
    
    console.log('❌ Nie znaleziono odpowiedzi AI w strukturze');
    return null;
}

// === FUNKCJA DODAWANIA PRZYCISKU GENEROWANIA PREZENTACJI ===
function addPresentationButton() {
    // Sprawdź czy przycisk już istnieje
    if (document.getElementById('presentationButton')) {
        console.log('🔄 Przycisk prezentacji już istnieje, pokazuję sekcję');
        const presentationSection = document.getElementById('presentation-section');
        if (presentationSection) {
            presentationSection.style.display = 'block';
        }
        return;
    }
    
    console.log('🎯 Dodaję przycisk generowania prezentacji');
    
    // Utwórz kontener dla przycisku i instrukcji
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'space-y-3';
    
    // Dodaj instrukcję
    const instruction = document.createElement('p');
    instruction.className = 'text-sm text-gray-600 mb-3';
    instruction.innerHTML = '💡 <strong>Uwaga:</strong> Naciśnij przycisk poniżej dopiero po zakończeniu całej rozmowy z AI (po odpowiedzi na wszystkie 3 pytania)';
    
    // Utwórz przycisk
    const button = document.createElement('button');
    button.id = 'presentationButton';
    button.innerHTML = '🎨 Generuj prezentację';
    button.className = 'w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold';
    
    button.onclick = function() {
        console.log('🚀 Użytkownik kliknął przycisk generowania prezentacji');
        const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : 'Zakończenie rozmowy';
        const redirectUrl = 'loading.html?message=' + encodeURIComponent(lastUserMessage) + 
                          '&webhookUrl=' + encodeURIComponent(ORIGINAL_N8N_WEBHOOK_URL);
        console.log('🔗 Przekierowuję do:', redirectUrl);
        window.location.href = redirectUrl;
    };
    
    // Dodaj elementy do kontenera
    buttonContainer.appendChild(instruction);
    buttonContainer.appendChild(button);
    
    // Znajdź sekcję prezentacji i dodaj przycisk
    const presentationSection = document.getElementById('presentation-section');
    if (presentationSection) {
        const centerDiv = presentationSection.querySelector('.text-center');
        if (centerDiv) {
            centerDiv.appendChild(buttonContainer);
            presentationSection.style.display = 'block';
            console.log('✅ Przycisk prezentacji dodany poniżej panelu wprowadzania');
        }
    } else {
        console.error('❌ Nie znaleziono sekcji prezentacji');
    }
}

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Aplikacja chat AI została zainicjalizowana');
    
    updateConnectionStatus('✅ Aplikacja gotowa', 'connected');
    
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
    console.log('🏗️ Środowisko:', IS_LOCAL ? 'LOKALNE' : 'VERCEL');
    console.log('🎯 Webhook URL:', N8N_WEBHOOK_URL);
});

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
        
        // Wysyłanie do odpowiedniego endpointu
        console.log(`📡 Wysyłam do: ${N8N_WEBHOOK_URL}`);
        console.log(`🌍 Środowisko: ${IS_LOCAL ? 'LOKALNE' : 'VERCEL'}`);
        
        const response = await fetch(N8N_WEBHOOK_URL, {
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
        
        // Przetwarzanie odpowiedzi
        const data = await response.json();
        console.log('📥 Otrzymano odpowiedź:', data);
        
        // Wydobycie odpowiedzi AI z potencjalnie złożonej struktury
        const aiResponse = extractAIResponse(data);
        
        if (aiResponse) {
            // Wyświetlenie odpowiedzi AI
            displayAIMessage(aiResponse);
            
            console.log('🔍 Odpowiedź AI została wyświetlona:', aiResponse);
            
            // Dodaj przycisk do generowania prezentacji po każdej odpowiedzi AI
            setTimeout(() => {
                addPresentationButton();
            }, 500);
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