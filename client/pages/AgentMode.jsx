import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addUserMessage, 
  addAssistantMessage, 
  clearConversation,
  initializeSession,
  selectMessages,
  selectConversationHistory 
} from '../store/conversationSlice';
import ChatMessage from '../components/ChatMessage';
import VoiceButton from '../components/VoiceButton';
import PlaylistModal from '../components/PlaylistModal';
import WelcomeState from '../components/WelcomeState';
import '../styles/AgentMode.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function AgentMode() {
  const dispatch = useDispatch();
  const messages = useSelector(selectMessages);
  const conversationHistory = useSelector(selectConversationHistory);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playlistData, setPlaylistData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  
  const chatMessagesRef = useRef(null);
  const inputRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const navigate = useNavigate();

  // Initialize session on mount
  useEffect(() => {
    dispatch(initializeSession());
  }, [dispatch]);

  const showWelcome = messages.length === 0;

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const message = inputValue.trim();
    if (!message || isSubmittingRef.current) return;

    // Set submitting flag
    isSubmittingRef.current = true;

    // Add user message to Redux store
    dispatch(addUserMessage(message));
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({ 
          message,
          conversationHistory 
        })
      });

      setIsTyping(false);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Add agent response to Redux store
      dispatch(addAssistantMessage(data.message));

      // If playlist was generated, show modal
      if (data.playlist) {
        setTimeout(() => {
          setPlaylistData({ playlist: data.playlist, context: data.playlistContext });
          setShowModal(true);
        }, 500);
      }

    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      dispatch(addAssistantMessage('Sorry, I encountered an error. Please make sure the server is running and try again.'));
    } finally {
      isSubmittingRef.current = false;
      inputRef.current?.focus();
    }
  };

  const handleVoiceTranscript = (transcript) => {
    console.log('Setting transcript:', transcript);
    setInputValue(transcript);
  };

  const handleVoiceStatus = (status) => {
    setVoiceStatus(status);
  };

  const handleVoiceComplete = () => {
    console.log('Voice complete, checking input value');
    // Auto-submit after voice input
    // Use a slight delay to ensure state has updated
    setTimeout(() => {
      // Check if already submitting
      if (isSubmittingRef.current) {
        console.log('Already submitting, skipping');
        return;
      }

      // Use a callback to get the latest state
      setInputValue(currentValue => {
        console.log('Current input value:', currentValue);
        if (currentValue.trim() && !isSubmittingRef.current) {
          // Set submitting flag
          isSubmittingRef.current = true;

          // Trigger submit with the current value
          const message = currentValue.trim();
          
          // Add user message to Redux store
          dispatch(addUserMessage(message));
          setIsTyping(true);
          
          // Get current conversation history before adding new message
          const currentHistory = conversationHistory;
          
          // Make API call
          fetch(`${API_BASE}/v1/agent/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': AUTH_TOKEN
            },
            body: JSON.stringify({ 
              message,
              conversationHistory: currentHistory 
            })
          })
            .then(response => {
              setIsTyping(false);
              if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
              }
              return response.json();
            })
            .then(data => {
              dispatch(addAssistantMessage(data.message));
              if (data.playlist) {
                setTimeout(() => {
                  setPlaylistData({ playlist: data.playlist, context: data.playlistContext });
                  setShowModal(true);
                }, 500);
              }
            })
            .catch(error => {
              console.error('Error:', error);
              setIsTyping(false);
              dispatch(addAssistantMessage('Sorry, I encountered an error. Please make sure the server is running and try again.'));
            })
            .finally(() => {
              isSubmittingRef.current = false;
              inputRef.current?.focus();
            });
          
          return ''; // Clear input
        }
        return currentValue; // Keep current value if empty
      });
    }, 100);
  };

  return (
    <div className="agent-mode-page">
      <div className="container">
        <div className="header">
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4V10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10V4C14 2.9 13.1 2 12 2Z" fill="#468189"/>
              <path d="M18 10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10H4C4 13.93 6.94 17.21 10.88 17.88V22H13.13V17.88C17.06 17.21 20 13.93 20 10H18Z" fill="#468189"/>
            </svg>
            Commutr Assistant
          </h1>
          <div className="header-actions">
            {messages.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm('Clear conversation history?')) {
                    dispatch(clearConversation());
                  }
                }} 
                className="clear-btn"
                title="Clear conversation"
              >
                Clear
              </button>
            )}
            <button onClick={() => navigate('/home')} className="back-btn">← Back</button>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-messages" ref={chatMessagesRef}>
            {showWelcome && <WelcomeState />}
            
            {messages.map((message, index) => (
              <ChatMessage
                key={message.timestamp || index}
                content={message.content}
                isUser={message.role === 'user'}
              />
            ))}

            {isTyping && (
              <div className="message agent">
                <div className="message-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" fill="#468189"/>
                    <path d="M12 13C8.13 13 5 14.57 5 16.5V18H19V16.5C19 14.57 15.87 13 12 13Z" fill="#468189"/>
                    <path d="M17 10C17 11.66 15.66 13 14 13V15C16.76 15 19 12.76 19 10H17Z" fill="#468189"/>
                    <path d="M7 10H5C5 12.76 7.24 15 10 15V13C8.34 13 7 11.66 7 10Z" fill="#468189"/>
                  </svg>
                </div>
                <div className="typing-indicator show">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-container">
            <form className="chat-input-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                autoComplete="off"
                required
              />
              <VoiceButton
                onTranscript={handleVoiceTranscript}
                onStatus={handleVoiceStatus}
                onComplete={handleVoiceComplete}
              />
              <button type="submit" className="send-btn">Send</button>
            </form>
            <div className="voice-status">{voiceStatus}</div>
          </div>
        </div>
      </div>

      {showModal && playlistData && (
        <PlaylistModal
          playlist={playlistData.playlist}
          context={playlistData.context}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default AgentMode;
