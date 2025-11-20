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
import { buildApiUrl, AUTH_TOKEN } from '../config/api';

const API_BASE = buildApiUrl();

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

    // Build conversation history including the new user message
    // This ensures the AI has full context of the conversation
    const updatedHistory = [
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    try {
      const response = await fetch(`${API_BASE}/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({ 
          message,
          conversationHistory: updatedHistory 
        })
      });

      setIsTyping(false);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Add agent response to Redux store
      dispatch(addAssistantMessage(data.message));

      // If playlist was generated, redirect to playlist view
      if (data.playlist) {
        setTimeout(() => {
          navigate('/playlist', {
            state: {
              playlist: data.playlist,
              context: data.playlistContext
            }
          });
        }, 1000);
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
          
          // Build conversation history including the new user message
          const updatedHistory = [
            ...conversationHistory,
            {
              role: 'user',
              content: message
            }
          ];
          
          // Make API call
          fetch(`${API_BASE}/v1/agent/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': AUTH_TOKEN
            },
            body: JSON.stringify({ 
              message,
              conversationHistory: updatedHistory 
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
                  navigate('/playlist', {
                    state: {
                      playlist: data.playlist,
                      context: data.playlistContext
                    }
                  });
                }, 1000);
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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#D9EEEE"/>
              <path d="M16 9C15.17 9 14.5 9.67 14.5 10.5V14.5C14.5 15.33 15.17 16 16 16C16.83 16 17.5 15.33 17.5 14.5V10.5C17.5 9.67 16.83 9 16 9Z" fill="#5F8A8B"/>
              <path d="M19.5 14.5C19.5 16.43 17.93 18 16 18C14.07 18 12.5 16.43 12.5 14.5H11.5C11.5 16.88 13.35 18.84 15.67 19.15V22H16.33V19.15C18.65 18.84 20.5 16.88 20.5 14.5H19.5Z" fill="#5F8A8B"/>
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
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="24" fill="#D9EEEE"/>
                    <path d="M24 14C22.35 14 21 15.35 21 17V23C21 24.65 22.35 26 24 26C25.65 26 27 24.65 27 23V17C27 15.35 25.65 14 24 14Z" fill="#5F8A8B"/>
                    <path d="M30 23C30 26.31 27.31 29 24 29C20.69 29 18 26.31 18 23H16C16 27.42 19.03 31.11 23 31.83V37H25V31.83C28.97 31.11 32 27.42 32 23H30Z" fill="#5F8A8B"/>
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
              <button
                type="button"
                className="conversation-btn"
                onClick={() => navigate('/conversation')}
                title="Voice Conversation Mode"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 6H19V15H6V17C6 17.55 6.45 18 7 18H18L22 22V7C22 6.45 21.55 6 21 6Z" fill="#77ACA2"/>
                  <path d="M17 1H3C2.45 1 2 1.45 2 2V16L6 12H17C17.55 12 18 11.55 18 11V2C18 1.45 17.55 1 17 1ZM13 9H7C6.45 9 6 8.55 6 8C6 7.45 6.45 7 7 7H13C13.55 7 14 7.45 14 8C14 8.55 13.55 9 13 9ZM15 6H7C6.45 6 6 5.55 6 5C6 4.45 6.45 4 7 4H15C15.55 4 16 4.45 16 5C16 5.55 15.55 6 15 6Z" fill="#77ACA2"/>
                </svg>
              </button>
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
