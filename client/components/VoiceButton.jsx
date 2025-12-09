import { useState, useEffect, useRef, useCallback } from 'react';

function VoiceButton({ onTranscript, onStatus, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const callbacksRef = useRef({ onTranscript, onStatus, onComplete });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onTranscript, onStatus, onComplete };
  }, [onTranscript, onStatus, onComplete]);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      callbacksRef.current.onStatus('Voice input not supported. Try Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;  // Keep recording until user manually stops
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Safari-specific settings
    if ('webkitSpeechRecognition' in window) {
      recognition.maxAlternatives = 1;
    }

    recognition.onstart = () => {
      setIsRecording(true);
      callbacksRef.current.onStatus('Listening...');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      callbacksRef.current.onTranscript(transcript);

      // Show interim results in status
      if (!event.results[event.results.length - 1].isFinal) {
        callbacksRef.current.onStatus(transcript);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      // Let the user review and edit the transcribed message before sending.
      // We only update status here; actual sending happens when the user
      // explicitly taps the Send button in the chat UI.
      callbacksRef.current.onStatus('Recording complete. Tap Send to submit.');

      setTimeout(() => {
        callbacksRef.current.onStatus('');
      }, 4000);
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      
      if (event.error === 'no-speech') {
        callbacksRef.current.onStatus('No speech detected');
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        callbacksRef.current.onStatus('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'network') {
        callbacksRef.current.onStatus('Network error. Please check your connection.');
      } else if (event.error === 'aborted') {
        // Aborted is normal when user stops manually, don't show error
        callbacksRef.current.onStatus('');
      } else {
        callbacksRef.current.onStatus(`Speech error: ${event.error}. Please try again.`);
      }

      setTimeout(() => {
        callbacksRef.current.onStatus('');
      }, 4000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, []); // Empty dependency array - only run once

  const handleClick = async () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore stop errors
      }
    } else {
      try {
        // Request microphone permission explicitly
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (permError) {
            callbacksRef.current.onStatus('Microphone permission denied. Please allow access and try again.');
            setTimeout(() => {
              callbacksRef.current.onStatus('');
            }, 4000);
            return;
          }
        }
        
        recognitionRef.current.start();
      } catch (error) {
        // Handle Safari-specific issues
        if (error.name === 'InvalidStateError') {
          // Recognition is already started or not properly reset
          try {
            recognitionRef.current.abort();
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (retryError) {
                callbacksRef.current.onStatus('Could not start voice recognition. Please try again.');
                setTimeout(() => callbacksRef.current.onStatus(''), 3000);
              }
            }, 100);
          } catch (abortError) {
            // Ignore abort errors
          }
        } else {
          callbacksRef.current.onStatus('Could not start voice recognition. Please try again.');
          setTimeout(() => {
            callbacksRef.current.onStatus('');
          }, 3000);
        }
      }
    }
  };

  return (
    <button
      type="button"
      className={`voice-btn ${isRecording ? 'recording' : ''}`}
      onClick={handleClick}
      disabled={!isSupported}
      title={isSupported ? 'Click to speak' : 'Voice input not supported'}
    >
      {isRecording ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" fill="white"/>
        </svg>
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14C13.66 14 14.99 12.66 14.99 11L15 5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="#468189"/>
          <path d="M17 11C17 14.31 14.31 17 11 17C7.69 17 5 14.31 5 11H3C3 14.93 5.94 18.21 9.88 18.88V22H14.13V18.88C18.06 18.21 21 14.93 21 11H19C19 14.31 16.31 17 13 17C9.69 17 7 14.31 7 11H5C5 14.31 7.69 17 11 17C14.31 17 17 14.31 17 11Z" fill="#468189"/>
        </svg>
      )}
    </button>
  );
}

export default VoiceButton;
