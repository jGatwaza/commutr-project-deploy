/**
 * Text-to-Speech Service
 * Supports both browser voices and ElevenLabs API for premium quality
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const USE_ELEVENLABS = ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;

/**
 * Get the best available browser voice
 * Prioritizes natural-sounding voices like Google, Microsoft neural voices
 */
export function getBestBrowserVoice() {
  const voices = window.speechSynthesis.getVoices();
  
  // Priority list of high-quality voices
  const preferredVoices = [
    // Google voices (high quality)
    'Google US English',
    'Google UK English Female',
    'Google UK English Male',
    
    // Microsoft neural voices (very natural)
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft Ana Online (Natural) - English (United States)',
    
    // Apple voices (good quality on Safari)
    'Samantha',
    'Alex',
    'Karen',
    'Moira',
    'Tessa',
    
    // Other high-quality voices
    'Daniel',
    'Fiona',
    'Serena'
  ];

  // Try to find preferred voices
  for (const preferred of preferredVoices) {
    const voice = voices.find(v => 
      v.name.includes(preferred) || 
      v.name === preferred
    );
    if (voice) {
      return voice;
    }
  }

  // Fallback: find any English voice with "natural" or "neural" in the name
  const naturalVoice = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('natural') || 
     v.name.toLowerCase().includes('neural'))
  );
  
  if (naturalVoice) {
    return naturalVoice;
  }

  // Fallback: any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) {
    return englishVoice;
  }

  // Last resort: first available voice
  return voices[0];
}

/**
 * Speak text using ElevenLabs API
 */
async function speakWithElevenLabs(text, onStart, onEnd, onError) {
  try {
    onStart?.();

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onEnd?.();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      onError?.(error);
    };

    await audio.play();
    
    return audio;
  } catch (error) {
    onError?.(error);
    return null;
  }
}

/**
 * Speak text using browser's speech synthesis with best available voice
 */
function speakWithBrowser(text, onStart, onEnd, onError) {
  const synth = window.speechSynthesis;
  
  // Cancel any ongoing speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Select the best available voice
  const bestVoice = getBestBrowserVoice();
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  // Configure for natural speech
  utterance.rate = 0.95;  // Slightly slower for clarity
  utterance.pitch = 1.0;   // Normal pitch
  utterance.volume = 1.0;  // Full volume

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (event) => {
    onError?.(event);
  };

  synth.speak(utterance);
  
  return utterance;
}

/**
 * Main speak function - automatically chooses best available TTS
 */
export async function speak(text, callbacks = {}) {
  const { onStart, onEnd, onError } = callbacks;

  // Wait for voices to be loaded
  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise((resolve) => {
      window.speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
    });
  }

  // Use ElevenLabs if API key is available, otherwise use browser
  if (USE_ELEVENLABS) {
    return await speakWithElevenLabs(text, onStart, onEnd, onError);
  } else {
    return speakWithBrowser(text, onStart, onEnd, onError);
  }
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if TTS is supported
 */
export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

/**
 * Get list of available voices for debugging
 */
export function getAvailableVoices() {
  return window.speechSynthesis.getVoices().map(v => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
    localService: v.localService
  }));
}
