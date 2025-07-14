// === KONFIGURACJA ===
// WAŻNE: Zastąp poniższy placeholder rzeczywistym URL-em Twojego webhooka n8n
// Oryginalny URL webhooka n8n
const ORIGINAL_N8N_WEBHOOK_URL = 'https://anna2084.app.n8n.cloud/webhook-test/b4a90a57-3ee9-4caa-ac80-73cc38dbbbce';

// URL lokalnego proxy CORS (rozwiązuje problemy z CORS)
const N8N_WEBHOOK_URL = 'http://localhost:3001';

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
    
    // Wyświetlenie statusu gotowości
    updateConnectionStatus('🔗 Gotowy (proxy: localhost:3001)', 'default');
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
        
        // Wysłanie żądania HTTP POST do webhooka n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText
            })
        });
        
        // Sprawdzenie czy odpowiedź jest poprawna
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        if (data.reply) {
            displayAIMessage(data.reply);
            updateConnectionStatus('✅ Połączenie aktywne', 'success');
        } else if (data.message) {
            displayAIMessage(data.message);
            updateConnectionStatus('✅ Połączenie aktywne', 'success');
        } else {
            displayAIMessage("✅ n8n webhook zareagował poprawnie!");
            updateConnectionStatus('✅ Połączenie aktywne', 'success');
        }
        
    } catch (error) {
        // Obsługa błędów
        console.error('Błąd podczas wysyłania wiadomości:', error);
        
        let errorMessage = 'Wystąpił błąd podczas komunikacji z AI.';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Błąd połączenia z proxy. Sprawdź czy serwer proxy jest uruchomiony (node cors-proxy.js).';
        } else if (error.message.includes('HTTP')) {
            errorMessage = `Błąd serwera: ${error.message}`;
        }
        
        displaySystemMessage(`❌ ${errorMessage}`);
        updateConnectionStatus('❌ Błąd proxy - uruchom serwer', 'error');
        
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