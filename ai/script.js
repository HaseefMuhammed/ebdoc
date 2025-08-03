class AIDoctorAssistant {
    constructor() {
        this.apiKey = 'AIzaSyBeSTqgcHDH9OFWrymvGqRRFOTIV_5uQ8c';
        this.conversationHistory = [];
        this.isTyping = false;
        this.isSpeaking = false;
        this.isVoiceMode = false;
        this.isListening = false;
        this.recognition = null;
        
        this.initializeApp();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.addWelcomeMessage();
    }

    initializeApp() {
        // Initialize speech synthesis
        this.synth = window.speechSynthesis;
        this.setupSpeechSynthesis();
        
        // Enhanced doctor personality for voice mode
        this.systemPrompt = `You are a friendly, caring AI doctor assistant and companion. You should:
        1. Be conversational and warm, like talking to a close friend who happens to be a doctor
        2. Use natural phrases like "Oh, I see...", "Hmm, let me think about this...", "That sounds tough, I'm here to help..."
        3. Ask follow-up questions in a caring, non-clinical way
        4. Provide comfort and reassurance while giving practical advice
        5. Keep responses shorter and more conversational for voice interactions
        6. Use empathetic language and show genuine concern
        7. Suggest simple remedies and self-care tips when appropriate
        8. Always recommend seeing a real doctor for serious symptoms, but in a gentle way
        9. Remember you're not just a medical tool, but a supportive friend
        
        Remember: Be warm, supportive, and conversational. You're providing friendly guidance, not medical diagnosis.`;
    }

    setupSpeechSynthesis() {
        // Set up speech synthesis voice
        this.voice = null;
        if (this.synth.getVoices().length === 0) {
            this.synth.addEventListener('voiceschanged', () => {
                const voices = this.synth.getVoices();
                this.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
            });
        } else {
            const voices = this.synth.getVoices();
            this.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        }
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                $('#micButton').addClass('listening');
                $('#voiceInputDisplay').addClass('listening').text('Listening...');
                $('#voiceStatus').text('Speak now, I\'m listening...');
                $('#voiceEqualizer').addClass('active');
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                $('#voiceInputDisplay').text(finalTranscript || interimTranscript || 'Listening...');
                
                if (finalTranscript) {
                    this.processVoiceInput(finalTranscript);
                }
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                $('#micButton').removeClass('listening');
                $('#voiceInputDisplay').removeClass('listening');
                $('#voiceEqualizer').removeClass('active');
                
                if (!this.isTyping) {
                    $('#voiceStatus').text('Tap to speak with your AI friend');
                    $('#voiceInputDisplay').text('Click the microphone to start talking...');
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                $('#micButton').removeClass('listening');
                $('#voiceInputDisplay').removeClass('listening').text('Sorry, I couldn\'t hear you clearly. Try again!');
                $('#voiceStatus').text('Tap to speak with your AI friend');
                $('#voiceEqualizer').removeClass('active');
            };
        }
    }

    setupEventListeners() {
        // Send message button
        $('#sendBtn').on('click', () => this.sendMessage());
        
        // Enter key to send message
        $('#messageInput').on('keypress', (e) => {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Voice mode toggle
        $('#voiceModeToggle').on('click', () => this.toggleVoiceMode());
        
        // Microphone button
        $('#micButton').on('click', () => this.toggleListening());

        // API key modal
        // Stop speaking when clicking anywhere
        $(document).on('click', () => {
            if (this.isSpeaking) {
                this.stopSpeaking();
            }
        });
    }

    toggleVoiceMode() {
        this.isVoiceMode = !this.isVoiceMode;
        
        if (this.isVoiceMode) {
            $('#voiceModeToggle').addClass('active');
            $('#voiceControls').addClass('active');
            $('.chat-container').addClass('voice-mode glassmorphism neon-glow');
            $('#messageInput').attr('placeholder', 'Voice mode active - use microphone or type here...');
            
            // Add friendly voice mode message
            if (this.conversationHistory.length === 0) {
                const welcomeText = "Hey there! I'm your AI doctor friend. Voice mode is now active - just tap the microphone and tell me what's bothering you. I'm here to listen and help!";
                this.addMessage('ai', welcomeText);
                this.speak(welcomeText);
            }
        } else {
            $('#voiceModeToggle').removeClass('active');
            $('#voiceControls').removeClass('active');
            $('.chat-container').removeClass('voice-mode glassmorphism neon-glow');
            $('#messageInput').attr('placeholder', 'Describe your symptoms...');
            
            // Stop any ongoing recognition
            if (this.isListening && this.recognition) {
                this.recognition.stop();
            }
        }
    }

    toggleListening() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            if (this.isSpeaking) {
                this.stopSpeaking();
            }
            this.recognition.start();
        }
    }

    processVoiceInput(transcript) {
        const message = transcript.trim();
        if (!message) return;
        
        // Add user message
        this.addMessage('user', message);
        
        // Update voice display
        $('#voiceInputDisplay').text('Processing your message...');
        $('#voiceStatus').text('Let me think about that...');
        
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: message }]
        });
        
        // Show typing indicator
        this.showTyping(true);
        
        // Process with AI
        this.callGeminiAPI(message).then(response => {
            this.showTyping(false);
            
            if (response) {
                this.addMessage('ai', response);
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: response }]
                });
                
                // Speak the response
                this.speak(response);
                
                // Reset voice display
                $('#voiceInputDisplay').text('Click the microphone to continue...');
                $('#voiceStatus').text('Tap to speak with your AI friend');
            }
        }).catch(error => {
            this.showTyping(false);
            this.handleError(error);
            $('#voiceInputDisplay').text('Click the microphone to try again...');
            $('#voiceStatus').text('Tap to speak with your AI friend');
        });
    }

    addWelcomeMessage() {
        const welcomeText = "Hello! I'm your AI Doctor Assistant and friend. I'm here to help you understand your symptoms and provide caring guidance. What's bothering you today? Feel free to switch to voice mode for a more natural conversation!";
        
        this.addMessage('ai', welcomeText);
        this.speak(welcomeText);
    }

    async sendMessage() {
        const input = $('#messageInput');
        const message = input.val().trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage('user', message);
        input.val('');
        
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: message }]
        });
        
        // Show typing indicator
        this.showTyping(true);
        
        try {
            const response = await this.callGeminiAPI(message);
            this.showTyping(false);
            
            if (response) {
                this.addMessage('ai', response);
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: response }]
                });
                
                // Speak the response
                this.speak(response);
            }
        } catch (error) {
            this.showTyping(false);
            this.handleError(error);
        }
    }

    async callGeminiAPI(message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        
        // Prepare conversation context
        const contents = [
            {
                role: 'user',
                parts: [{ text: this.systemPrompt }]
            },
            ...this.conversationHistory
        ];

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response generated from AI');
        }
    }

    addMessage(sender, text) {
        const messagesContainer = $('#chatMessages');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageHtml = `
            <div class="message ${sender}">
                <div class="message-bubble">
                    ${this.formatMessage(text)}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
        
        messagesContainer.append(messageHtml);
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
        
        // Remove welcome message if it exists
        $('.welcome-message').fadeOut();
    }

    formatMessage(text) {
        // Basic text formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showTyping(show) {
        this.isTyping = show;
        $('#typingIndicator').toggle(show);
        $('#sendBtn').prop('disabled', show);
        
        if (show) {
            $('#chatMessages').scrollTop($('#chatMessages')[0].scrollHeight);
        }
    }

    speak(text) {
        if (!this.synth || this.isSpeaking) return;
        
        // Clean text for speech
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*\*/g, '');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        if (this.voice) {
            utterance.voice = this.voice;
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
            this.isSpeaking = true;
            $('#speakingIndicator').show();
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            $('#speakingIndicator').hide();
        };
        
        utterance.onerror = () => {
            this.isSpeaking = false;
            $('#speakingIndicator').hide();
        };
        
        this.synth.speak(utterance);
    }

    stopSpeaking() {
        if (this.synth && this.isSpeaking) {
            this.synth.cancel();
            this.isSpeaking = false;
            $('#speakingIndicator').hide();
        }
    }

    handleError(error) {
        console.error('Error:', error);
        
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.message.includes('API_KEY_INVALID')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key and try again.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API quota exceeded. Please try again later or check your billing settings.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        this.addMessage('ai', errorMessage);
    }
}

// Initialize the app when DOM is ready
$(document).ready(() => {
    window.aiDoctor = new AIDoctorAssistant();
});