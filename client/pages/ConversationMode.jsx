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
import { speak, stopSpeaking } from '../services/ttsService';
import '../styles/ConversationMode.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function ConversationMode() {
  const dispatch = useDispatch();
  const messages = useSelector(selectMessages);
  const conversationHistory = useSelector(selectConversationHistory);
  const navigate = useNavigate();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const handleUserInputRef = useRef(null);

  useEffect(() => {
    dispatch(initializeSession());
    
    if (!hasGreeted) {
      setTimeout(() => {
        const greeting = "Hello! I'm your Commutr assistant. What would you like to learn about today? You can tell me a topic and how long your commute is.";
        dispatch(addAssistantMessage(greeting));
        speakText(greeting);
        setHasGreeted(true);
      }, 500);
    }
  }, [dispatch, hasGreeted]);

  useEffect(() => {
    handleUserInputRef.current = handleUserInput;
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('Voice input not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening... speak now');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      if (event.results[event.results.length - 1].isFinal) {
        finalTranscriptRef.current = transcript;
        setStatus(`You said: "${transcript}"`);
      } else {
        setStatus(transcript);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      const finalTranscript = finalTranscriptRef.current.trim();
      
      if (finalTranscript) {
        console.log('Processing transcript:', finalTranscript);
        if (handleUserInputRef.current) {
          handleUserInputRef.current(finalTranscript);
        }
        finalTranscriptRef.current = '';
      } else {
        console.log('No final transcript detected');
        setStatus('No speech detected. Please try again.');
        setTimeout(() => {
          setStatus('Tap to speak');
        }, 3000);
      }
    };

    recognition.onerror = (event) => {
      console.log('Speech recognition error:', event.error);
      setIsListening(false);
      
      finalTranscriptRef.current = '';
      
      if (event.error === 'no-speech') {
        setStatus('No speech detected. Tap to speak again.');
      } else if (event.error === 'not-allowed') {
        setStatus('Microphone access denied. Please allow access.');
      } else if (event.error === 'aborted') {
        setStatus('Tap to speak');
      } else {
        setStatus(`Speech error. Tap to try again.`);
      }
      
      setTimeout(() => {
        if (!isListening && !isSpeaking) {
          setStatus('Tap to speak');
        }
      }, 3000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopSpeaking();
    };
  }, []);

  const speakText = async (text, autoListen = true) => {
    stopSpeaking();

    return new Promise(async (resolve) => {
      const audio = await speak(text, {
        onStart: () => {
          setIsSpeaking(true);
          setStatus('AI is speaking...');
        },
        onEnd: () => {
          setIsSpeaking(false);
          
          if (autoListen) {
            setTimeout(() => {
              console.log('Auto-listening triggered');
              if (!isSubmittingRef.current) {
                startListening();
              }
            }, 300);
          } else {
            setStatus('Tap to speak');
          }
          
          resolve();
        },
        onError: (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
          setStatus('Speech error. Tap to continue.');
          resolve();
        }
      });

      currentAudioRef.current = audio;
    });
  };

  const handleUserInput = async (transcript) => {
    console.log('handleUserInput called with:', transcript);
    if (isSubmittingRef.current || !transcript) {
      console.log('Skipping - already submitting or empty transcript');
      return;
    }

    isSubmittingRef.current = true;
    setIsProcessing(true);
    setStatus('Processing your request...');

    dispatch(addUserMessage(transcript));

    const updatedHistory = [
      ...conversationHistory,
      {
        role: 'user',
        content: transcript
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
          message: transcript,
          conversationHistory: updatedHistory 
        })
      });

      setIsProcessing(false);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      dispatch(addAssistantMessage(data.message));

      if (data.playlist) {
        const playlistMessage = "Great! I've created your playlist. Let me take you there now!";
        
        await speakText(playlistMessage, false);
        
        navigate('/playlist', {
          state: {
            playlist: data.playlist,
            context: data.playlistContext
          }
        });
      } else {
        speakText(data.message, true);
      }

    } catch (error) {
      console.error('Error:', error);
      setIsProcessing(false);
      const errorMsg = 'Sorry, I encountered an error. Please make sure the server is running and try again.';
      dispatch(addAssistantMessage(errorMsg));
      speakText(errorMsg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const startListening = () => {
    console.log('startListening called', { 
      hasRecognition: !!recognitionRef.current, 
      isListening
    });

    if (!recognitionRef.current) {
      console.log('No recognition ref');
      return;
    }

    if (isListening) {
      console.log('Already listening');
      return;
    }

    try {
      stopSpeaking();
      
      finalTranscriptRef.current = '';
      
      try {
        recognitionRef.current.abort();
      } catch (e) {
      }
      
      setTimeout(() => {
        try {
          console.log('Starting recognition...');
          recognitionRef.current.start();
        } catch (startError) {
          console.error('Failed to start recognition:', startError);
          setIsListening(false);
          setStatus('Could not start listening. Please try again.');
        }
      }, 100);
      
    } catch (error) {
      console.error('Recognition error:', error);
      setIsListening(false);
      setStatus('Could not start listening. Please try again.');
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setStatus('Speech stopped. Tap to speak.');
  };

  return (
    <div className="conversation-mode-page">
      <div className="conversation-container">
        <div className="conversation-header">
          <h1>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#77ACA2"/>
              <path d="M16 9C15.17 9 14.5 9.67 14.5 10.5V14.5C14.5 15.33 15.17 16 16 16C16.83 16 17.5 15.33 17.5 14.5V10.5C17.5 9.67 16.83 9 16 9Z" fill="#031926"/>
              <path d="M19.5 14.5C19.5 16.43 17.93 18 16 18C14.07 18 12.5 16.43 12.5 14.5H11.5C11.5 16.88 13.35 18.84 15.67 19.15V22H16.33V19.15C18.65 18.84 20.5 16.88 20.5 14.5H19.5Z" fill="#031926"/>
            </svg>
            Voice Conversation
          </h1>
          <button onClick={() => navigate('/agent')} className="back-btn">
            ← Back to Chat
          </button>
        </div>

        <div className="conversation-content">
          <div className="messages-display">
            {messages.map((message, index) => (
              <div 
                key={message.timestamp || index} 
                className={`conversation-message ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#468189"/>
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#F4E9CD"/>
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#77ACA2"/>
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#031926"/>
                    </svg>
                  )}
                </div>
                <div className="message-bubble">
                  {message.content}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="conversation-message assistant">
                <div className="message-avatar">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#77ACA2"/>
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#031926"/>
                  </svg>
                </div>
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="voice-control-area">
            <div className="status-text">{status}</div>
            
            <button
              className={`voice-circle-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={isSpeaking ? handleStopSpeaking : startListening}
              disabled={isProcessing}
            >
              {isListening ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#468189" opacity="0.3"/>
                  <circle cx="12" cy="12" r="6" fill="#F4E9CD"/>
                </svg>
              ) : isSpeaking ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="#F4E9CD"/>
                  <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="#F4E9CD"/>
                  <path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="#F4E9CD"/>
                </svg>
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14C13.66 14 14.99 12.66 14.99 11L15 5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="#F4E9CD"/>
                  <path d="M17 11C17 14.31 14.31 17 11 17C7.69 17 5 14.31 5 11H3C3 14.93 5.94 18.21 9.88 18.88V22H14.13V18.88C18.06 18.21 21 14.93 21 11H19C19 14.31 16.31 17 13 17C9.69 17 7 14.31 7 11H5C5 14.31 7.69 17 11 17C14.31 17 17 14.31 17 11Z" fill="#F4E9CD"/>
                </svg>
              )}
            </button>

            <div className="voice-hint">
              {isListening ? 'Listening...' : isSpeaking ? 'Tap to stop' : isProcessing ? 'Processing...' : 'Tap to speak'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationMode;
