/**
 * Text-to-Speech Service
 * Supports both browser voices and ElevenLabs API for premium quality
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const USE_ELEVENLABS = ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;

const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY || '';
const USE_GOOGLE_CLOUD = GOOGLE_CLOUD_API_KEY && GOOGLE_CLOUD_API_KEY.length > 0;

// Manual voice preference - set this to override automatic selection
// Examples: 'Samantha', 'Alex', 'Google US English', 'Microsoft Aria Online (Natural)'
const PREFERRED_VOICE_NAME = '';

/**
 * Check if a voice is low quality and should be excluded
 */
function isLowQualityVoice(voice) {
  const nameLower = voice.name.toLowerCase();
  
  // Exclude obviously robotic/bad voices
  const badKeywords = ['microsoft david', 'microsoft zira', 'microsoft mark',
                       'poor quality', 'robotic', 'whisper', 'bells', 'bad news',
                       'trinoids', 'superstar', 'reed', 'sandy', 'rocko'];
  
  return badKeywords.some(keyword => nameLower.includes(keyword));
}

/**
 * Score a voice based on quality indicators
 */
function scoreVoice(voice) {
  let score = 0;
  const nameLower = voice.name.toLowerCase();
  
  // Heavily prefer specific high-quality voices
  const premiumVoices = [
    'samantha', 'alex', 'karen', 'moira', 'tessa', 'fiona',
    'google us english', 'google uk english female', 'google uk english male',
    'microsoft aria', 'microsoft jenny', 'microsoft guy', 'microsoft ana'
  ];
  
  for (const premium of premiumVoices) {
    if (nameLower.includes(premium)) {
      score += 100;
      break;
    }
  }
  
  // Strongly prefer online/cloud voices (usually higher quality)
  if (nameLower.includes('online') || nameLower.includes('cloud')) score += 60;
  
  // Strongly prefer neural/natural voices (most natural sounding)
  if (nameLower.includes('neural') || nameLower.includes('natural')) score += 50;
  
  // Prefer premium voice providers
  if (nameLower.includes('google')) score += 35;
  if (nameLower.includes('microsoft')) score += 30;
  if (nameLower.includes('amazon')) score += 25;
  
  // Prefer female voices (often sound more natural)
  if (nameLower.includes('female') || nameLower.includes('woman') ||
      nameLower.includes('aria') || nameLower.includes('jenny') ||
      nameLower.includes('samantha') || nameLower.includes('karen')) score += 8;
  
  // Prefer US English
  if (voice.lang === 'en-US') score += 15;
  else if (voice.lang.startsWith('en-')) score += 8;
  
  // Prefer local service voices (more reliable)
  if (voice.localService) score += 5;
  
  return score;
}

/**
 * Get the best available browser voice
 * Prioritizes natural-sounding voices like Google, Microsoft neural voices
 */
export function getBestBrowserVoice() {
  const voices = window.speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    return null;
  }
  
  // If user specified a preferred voice, try to use it
  if (PREFERRED_VOICE_NAME) {
    const preferredVoice = voices.find(v => 
      v.name === PREFERRED_VOICE_NAME || 
      v.name.toLowerCase().includes(PREFERRED_VOICE_NAME.toLowerCase())
    );
    if (preferredVoice) {
      return preferredVoice;
    }
  }
  
  // Filter to English voices only and exclude low-quality ones
  const englishVoices = voices.filter(v => 
    v.lang.startsWith('en') && !isLowQualityVoice(v)
  );
  
  if (englishVoices.length === 0) {
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    return anyEnglish || voices[0];
  }
  
  // Score and sort all English voices
  const scoredVoices = englishVoices.map(voice => ({
    voice,
    score: scoreVoice(voice)
  })).sort((a, b) => b.score - a.score);
  
  const bestVoice = scoredVoices[0].voice;
  return bestVoice;
}

/**
 * Speak text using Google Cloud Text-to-Speech API
 */
async function speakWithGoogleCloud(text, onStart, onEnd, onError) {
  try {
    onStart?.();

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-C',  // Most natural female neural voice - warm and conversational
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 0,
          volumeGainDb: 0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google Cloud TTS error: ${response.status}`);
    }

    const data = await response.json();
    
    // Decode base64 audio content
    const audioContent = data.audioContent;
    const audioBlob = await fetch(`data:audio/mp3;base64,${audioContent}`).then(r => r.blob());
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

  // Fix for Chrome: sometimes speech doesn't start without a small delay
  setTimeout(() => {
    synth.speak(utterance);
  }, 10);
  
  return utterance;
}

/**
 * Main speak function - automatically chooses best available TTS
 */
export async function speak(text, callbacks = {}) {
  const { onStart, onEnd, onError } = callbacks;

  // Wait for voices to be loaded (with timeout)
  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 2000);
      
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      
      // In some browsers, voices are already loaded but the event never fires
      setTimeout(() => {
        if (window.speechSynthesis.getVoices().length > 0) {
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });
  }

  // Priority: Google Cloud > ElevenLabs > Browser
  
  // Try Google Cloud first if available
  if (USE_GOOGLE_CLOUD) {
    const result = await speakWithGoogleCloud(text, onStart, onEnd, onError);
    
    if (!result) {
      return speakWithBrowser(text, onStart, onEnd, onError);
    }
    
    return result;
  }
  
  // Try ElevenLabs if Google Cloud not available
  if (USE_ELEVENLABS) {
    const result = await speakWithElevenLabs(text, onStart, onEnd, onError);
    
    if (!result) {
      return speakWithBrowser(text, onStart, onEnd, onError);
    }
    
    return result;
  }
  
  // Fall back to browser voice
  return speakWithBrowser(text, onStart, onEnd, onError);
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

/**
 * List all English voices to console for manual selection
 * Usage: Open console and run: window.listVoices()
 */
export function listAllVoices() {
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  return englishVoices.map((voice, i) => {
    const quality = isLowQualityVoice(voice) ? 'LOW QUALITY' : 'GOOD';
    const score = scoreVoice(voice);
    return { index: i + 1, quality, name: voice.name, lang: voice.lang, score };
  });
}

// Make listAllVoices available globally for debugging
if (typeof window !== 'undefined') {
  window.listVoices = listAllVoices;
}
