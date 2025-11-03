import { useState, useRef, useEffect } from 'react';
import { useCommute } from '../context/CommuteContext';
import { useLocation } from 'react-router-dom';
import '../styles/FloatingChat.css';

const API_BASE = 'http://localhost:3000';

function FloatingChat({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const { getRemainingTime, currentTopic, watchedVideoIds } = useCommute();
  const location = useLocation();

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input requires HTTPS or is not supported in this browser. Please type your message instead.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Voice error:', error);
        alert('Voice input requires HTTPS. Please type your message instead.');
      }
    }
  };

  const getContext = () => {
    const remainingTime = getRemainingTime();
    const currentPage = location.pathname;
    
    return {
      currentPage,
      currentTopic,
      remainingTimeSec: remainingTime,
      watchedVideoCount: watchedVideoIds.length,
      isWatchingVideo: currentPage === '/player'
    };
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Use the EXACT same API call as AgentMode
      const response = await fetch(`${API_BASE}/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TEST'
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Agent response:', data);

      // Add agent response (same as AgentMode)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message
      }]);

      // If playlist was generated, navigate to playlist view immediately (same as AgentMode)
      if (data.playlist && onAction) {
        setTimeout(() => {
          onAction({
            type: 'navigate',
            path: '/playlist',
            playlist: data.playlist,
            context: data.playlistContext
          });
        }, 1000);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please make sure the server is running and try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickCommands = [
    { label: 'Skip video', command: 'skip this video' },
    { label: 'Change topic', command: 'change topic' },
    { label: 'Time left?', command: 'how much time is left?' },
    { label: 'Back to playlist', command: 'go back to playlist' }
  ];

  const handleQuickCommand = (command) => {
    setInputValue(command);
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="floating-chat-panel">
          <div className="chat-header">
            <div className="chat-header-content">
              <span className="chat-icon">🎙️</span>
              <h3>Commutr Assistant</h3>
            </div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>
              ← Back
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="welcome-icon">🎙️</div>
                <h2>Hi, how can I help?</h2>
                <p>Tell me what you'd like to learn and how long your commute is, and I'll create a personalized playlist for you.</p>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🎙️'}
                </div>
                <div className="message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message assistant">
                <div className="message-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>


          {/* Input Area */}
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
              disabled={isLoading || isListening}
              className="chat-input"
            />
            
            <button
              type="button"
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceInput}
              aria-label="Voice input"
            >
              🎙️
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default FloatingChat;
