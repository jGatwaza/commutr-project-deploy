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
        {isOpen ? '✕' : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C10.9 2 10 2.9 10 4V10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10V4C14 2.9 13.1 2 12 2Z"/>
            <path d="M18 10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10H4C4 13.93 6.94 17.21 10.88 17.88V22H13.13V17.88C17.06 17.21 20 13.93 20 10H18Z"/>
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="floating-chat-panel">
          <div className="chat-header">
            <div className="chat-header-content">
              <span className="chat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#D9EEEE"/>
                  <path d="M12 7C11.17 7 10.5 7.67 10.5 8.5V12.5C10.5 13.33 11.17 14 12 14C12.83 14 13.5 13.33 13.5 12.5V8.5C13.5 7.67 12.83 7 12 7Z" fill="#5F8A8B"/>
                  <path d="M15 12.5C15 14.43 13.43 16 11.5 16C9.57 16 8 14.43 8 12.5H7C7 14.88 8.85 16.84 11.17 17.15V20H12.83V17.15C15.15 16.84 17 14.88 17 12.5H15Z" fill="#5F8A8B"/>
                </svg>
              </span>
              <h3>Commutr Assistant</h3>
            </div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>
              ← Back
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="welcome-icon">
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="30" r="30" fill="#D9EEEE"/>
                    <path d="M30 17.5C28.62 17.5 27.5 18.62 27.5 20V27.5C27.5 28.88 28.62 30 30 30C31.38 30 32.5 28.88 32.5 27.5V20C32.5 18.62 31.38 17.5 30 17.5Z" fill="#5F8A8B"/>
                    <path d="M36 27.5C36 30.54 33.54 33 30 33C26.46 33 24 30.54 24 27.5H22C22 31.64 25.04 35.07 29 35.79V42.5H31V35.79C34.96 35.07 38 31.64 38 27.5H36Z" fill="#5F8A8B"/>
                  </svg>
                </div>
                <h2>Hi, how can I help?</h2>
                <p>Tell me what you'd like to learn and how long your commute is, and I'll create a personalized playlist for you.</p>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="20" fill="#D9EEEE"/>
                      <path d="M20 11.67C19.08 11.67 18.33 12.42 18.33 13.33V19.17C18.33 20.08 19.08 20.83 20 20.83C20.92 20.83 21.67 20.08 21.67 19.17V13.33C21.67 12.42 20.92 11.67 20 11.67Z" fill="#5F8A8B"/>
                      <path d="M25 19.17C25 21.93 22.76 24.17 20 24.17C17.24 24.17 15 21.93 15 19.17H13.33C13.33 22.85 16.19 25.93 19.17 26.53V30.83H20.83V26.53C23.81 25.93 26.67 22.85 26.67 19.17H25Z" fill="#5F8A8B"/>
                    </svg>
                  )}
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
