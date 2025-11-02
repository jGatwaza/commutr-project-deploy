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
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsRecording(true);
      callbacksRef.current.onStatus('Listening...');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      console.log('Transcript:', transcript);
      callbacksRef.current.onTranscript(transcript);

      // Show interim results in status
      if (!event.results[event.results.length - 1].isFinal) {
        callbacksRef.current.onStatus(transcript);
      }
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsRecording(false);
      callbacksRef.current.onStatus('Sending...');
      
      // Trigger auto-submit
      setTimeout(() => {
        callbacksRef.current.onComplete();
        callbacksRef.current.onStatus('');
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'no-speech') {
        callbacksRef.current.onStatus('No speech detected');
      } else if (event.error === 'not-allowed') {
        callbacksRef.current.onStatus('Microphone access denied');
      } else {
        callbacksRef.current.onStatus(`Error: ${event.error}`);
      }

      setTimeout(() => {
        callbacksRef.current.onStatus('');
      }, 3000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []); // Empty dependency array - only run once

  const handleClick = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isRecording) {
      console.log('Stopping voice recognition');
      recognitionRef.current.stop();
    } else {
      try {
        console.log('Starting voice recognition');
        recognitionRef.current.start();
      } catch (error) {
        console.error('Recognition error:', error);
        callbacksRef.current.onStatus('Could not start voice recognition');
        setTimeout(() => {
          callbacksRef.current.onStatus('');
        }, 3000);
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
