# 🎤 Voice Mode Guide

## Overview

Voice Mode allows users to create playlists using **speech-to-text** technology. Simply click the microphone button, speak your request, and the AI agent will transcribe and process it to generate your perfect commute playlist!

## ✨ Features

### Real-Time Speech Recognition
- **Instant transcription** - see your words appear as you speak
- **High accuracy** - powered by browser's built-in Web Speech API
- **Natural language** - speak as you would normally
- **Edit before sending** - review and modify transcribed text

### Visual Feedback
- **🎤 Green microphone** - ready to record
- **🔴 Red pulsing button** - actively recording
- **Status messages** - clear feedback at every step
- **Real-time transcript** - watch your words appear

### Browser-Based Technology
- **No API keys needed** - uses Web Speech API
- **Completely free** - no cost for voice recognition
- **Works offline** - after initial page load
- **Privacy-friendly** - processing happens in browser

## 🚀 How to Use Voice Mode

### Step 1: Access Agent Mode
1. Open Commutr at `http://localhost:3000`
2. Click the **"🤖 Agent Mode"** button
3. You'll see the chat interface with a microphone button

### Step 2: Start Recording
1. Click the **🎤 microphone button** (next to Send button)
2. Browser will ask for microphone permission (first time only)
3. Click **"Allow"** to grant access
4. The button turns **red** and starts **pulsing** - you're recording!

### Step 3: Speak Your Request
Speak clearly into your microphone. Examples:
- "Create a Python playlist for my 15-minute commute"
- "I want to learn cooking for 20 minutes"
- "Make me a JavaScript playlist for half an hour"
- "Build a fitness playlist for 10 minutes"

### Step 4: Review Transcription
- Your speech appears in real-time in the text input field
- The status bar shows what you're saying
- Edit the text if needed before sending

### Step 5: Send Request
1. Recording stops automatically when you finish speaking
2. Review the transcribed text
3. Click **"Send"** to submit to the AI agent
4. The agent processes your request and generates a playlist!

## 🎯 Tips for Best Results

### Speaking Tips
- **Speak clearly** - enunciate your words
- **Normal pace** - not too fast or slow
- **Close to mic** - 6-12 inches away is ideal
- **Quiet environment** - reduce background noise
- **Natural speech** - use conversational language

### Request Format
Be specific about:
- **Topic** - what you want to learn (Python, cooking, fitness)
- **Duration** - how long your commute is (15 minutes, 20 minutes)

Good examples:
- ✅ "Create a Python playlist for 15 minutes"
- ✅ "I want cooking videos for my 20-minute drive"
- ✅ "Make me a JavaScript playlist for half an hour"

Less specific (might still work):
- ⚠️ "I want to learn Python" (no duration)
- ⚠️ "15-minute playlist" (no topic)

## 🌐 Browser Compatibility

### ✅ Fully Supported
- **Google Chrome** (Desktop & Mobile) - **Recommended**
- **Microsoft Edge** (Desktop & Mobile)
- **Safari** (macOS & iOS)
- **Opera** (Desktop)

### ⚠️ Limited Support
- **Firefox** - Limited Web Speech API support
- **Older browsers** - Update to latest version

### Device Support
- 💻 **Desktop** - Excellent (use built-in or external mic)
- 📱 **Mobile** - Good (use device microphone)
- 🎧 **Bluetooth headsets** - Supported (may have slight delay)

## 🔧 Technical Details

### Web Speech API
Voice Mode uses the browser's built-in **Web Speech API**, which:
- Runs locally in your browser
- Requires no external API calls
- Is completely free
- Respects user privacy
- Provides real-time transcription

### How It Works
1. **Click microphone** → Browser starts listening
2. **Speak request** → Audio captured by Web Speech API
3. **Real-time transcription** → Words appear in text field
4. **Stop recording** → Automatically stops after speech ends
5. **Send to AI** → Text sent to Groq's Llama 3.3 model
6. **Generate playlist** → Agent creates playlist via API

### Privacy & Security
- Voice processing happens **in your browser**
- No audio is sent to Commutr servers
- Google's speech recognition may process audio (Chrome only)
- No voice data is stored or logged
- Microphone access only when button clicked

## 🐛 Troubleshooting

### Microphone Not Working

**Problem:** "Microphone access denied"
**Solution:**
1. Look for microphone icon in browser address bar
2. Click it and select "Always allow" for localhost
3. Refresh the page
4. Try again

**Problem:** "No speech detected"
**Solution:**
- Check microphone is plugged in and working
- Test mic in system settings (System Preferences → Sound → Input)
- Make sure no other app is using microphone
- Speak louder or closer to microphone

### Transcription Issues

**Problem:** Inaccurate transcription
**Solution:**
- Speak more clearly and slowly
- Reduce background noise (close windows, turn off fans)
- Use a better microphone (external USB mic)
- Edit transcribed text before sending

**Problem:** Wrong words transcribed
**Solution:**
- Spell out unusual words or names
- Use simpler vocabulary
- Manually edit the text after transcription

### Browser Issues

**Problem:** "Voice input not supported"
**Solution:**
- Switch to Chrome, Edge, or Safari
- Update browser to latest version
- Try on a different device

**Problem:** Button is grayed out
**Solution:**
- Browser doesn't support Web Speech API
- Use Chrome (best compatibility)
- Check browser version is recent

## 📱 Mobile Usage

### iOS (Safari)
1. Open Safari and go to Commutr
2. Tap microphone button
3. Allow microphone access
4. Speak your request
5. Tap Send

### Android (Chrome)
1. Open Chrome and go to Commutr
2. Tap microphone button
3. Allow microphone access
4. Speak your request
5. Tap Send

### Mobile Tips
- Hold phone normally (mic is at bottom)
- Speak clearly in quiet environment
- Works great with phone's built-in mic
- Bluetooth headsets also work

## 🎨 Visual Indicators

### Microphone Button States

**🎤 Normal (Teal)**
- Ready to record
- Click to start listening

**🔴 Recording (Red + Pulsing)**
- Actively listening
- Speak now
- Click again to stop

**🎤 Disabled (Gray)**
- Browser doesn't support voice
- Feature not available

### Status Messages

- **"🎤 Listening... (speak now)"** - Recording in progress
- **"✅ Ready to send!"** - Transcription complete
- **"❌ No speech detected"** - Try speaking louder
- **"❌ Microphone access denied"** - Allow permissions
- **"⚠️ Voice input not supported"** - Use different browser

## 🎉 Example Use Cases

### Morning Commute
*Hands-free while driving:*
1. Click microphone before driving
2. "Create a news podcast playlist for 20 minutes"
3. Let AI generate playlist
4. Start listening!

### Accessibility
*For users with typing difficulties:*
1. Use voice instead of typing
2. Speak naturally
3. Edit if needed
4. More accessible interface

### Quick Requests
*Faster than typing:*
1. Click and speak in seconds
2. No typing required
3. Instant transcription
4. Send immediately

### Multilingual Support
*Works with accents:*
- English (US) - default
- Works well with various accents
- May need to speak clearly
- Edit transcription if needed

## 🔮 Future Enhancements

Potential improvements:
- Multiple language support (Spanish, French, etc.)
- Custom voice commands
- Wake word detection ("Hey Commutr")
- Voice response from AI
- Continuous conversation mode

## 📊 Comparison: Voice vs Text

| Feature | Voice Mode | Text Mode |
|---------|-----------|-----------|
| Speed | ⚡ Faster (5-10 sec) | 🐌 Slower (typing) |
| Accuracy | 🎯 ~95% (clear speech) | ✅ 100% (typed) |
| Hands-free | ✅ Yes | ❌ No |
| Edit before send | ✅ Yes | ✅ Yes |
| Works offline | ✅ Yes | ✅ Yes |
| Privacy | 🔒 Browser only | 🔒 Full |
| Accessibility | ♿ Excellent | ⌨️ Good |

## 🎓 Best Practices

### For Developers
- Always provide text fallback
- Show clear visual feedback
- Handle permission denials gracefully
- Test on multiple browsers
- Provide helpful error messages

### For Users
- Allow microphone permissions
- Speak in quiet environments
- Use good quality microphone
- Review transcription before sending
- Have fun experimenting!

## 🚀 Getting Started

1. **Start the server**: `npm run dev`
2. **Open browser**: Go to `http://localhost:3000`
3. **Click Agent Mode**: 🤖 button on main page
4. **Click microphone**: 🎤 button in chat
5. **Allow permissions**: Grant mic access
6. **Speak your request**: "Create a Python playlist for 15 minutes"
7. **Send and enjoy!**: Your playlist is ready!

---

**Happy voice commanding! 🎤✨**
