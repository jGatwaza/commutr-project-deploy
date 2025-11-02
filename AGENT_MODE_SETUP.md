# 🤖 Agent Mode Setup Guide

This guide will help you set up the new **Agent Mode** feature for Commutr, which allows users to create playlists through natural language conversation with an AI agent.

## 🎯 What is Agent Mode?

Agent Mode is an AI-powered chat interface that lets users request playlists conversationally using **text or voice input**. Instead of filling out a form, users can simply say or type:
- "Create a Python playlist for my 15-minute commute"
- "I want to learn cooking for 20 minutes"
- "Make me a JavaScript playlist for a 30-minute drive"

The AI agent extracts the topic and duration, then automatically generates a personalized playlist!

### 🎤 Voice Mode Features
- **Speech-to-Text**: Click the microphone button and speak your request
- **Real-time Transcription**: See your words appear as you speak
- **Auto-Submit**: Request automatically sent when you finish speaking
- **Hands-Free**: No need to click "Send" - fully automatic!
- **Browser-Based**: Uses Web Speech API (no additional API needed!)
- **Free**: Completely free, works offline after initial load
- **Supported Browsers**: Chrome, Edge, Safari (latest versions)

## 🚀 Free AI Options

### **Recommended: Groq (Best Free Option)**
✅ **Completely Free** - No credit card required
✅ **Blazing Fast** - 1-2ms per token response time
✅ **Generous Limits** - Perfect for development and production

**Other Options:**
- **OpenAI**: $5-$18 free credits for new accounts (3 months)
- **Claude**: No free API tier (web interface only)

## 📋 Setup Instructions

### Step 1: Install Dependencies

Run the following command in your project directory:

```bash
npm install
```

This will install the `groq-sdk` package that was added to `package.json`.

### Step 2: Get Your Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account (no credit card needed)
3. Navigate to the **API Keys** section
4. Click **Create API Key**
5. Copy your API key

### Step 3: Configure Environment Variables

Open your `.env` file and replace the placeholder with your actual Groq API key:

```env
YOUTUBE_API_KEY="AIzaSyBGTGksmhHVi_N2kgk1Pt2laGCcYu7yrU4"
GROQ_API_KEY="your-actual-groq-api-key-here"
```

### Step 4: Start the Server

Start your development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Step 5: Test Agent Mode

1. Open your browser to `http://localhost:3000`
2. Click the **"🤖 Agent Mode"** button
3. Try either:
   
   **Text Mode:**
   - Type a message like: "Create a playlist about cooking for 15 minutes"
   - Press Send
   
   **Voice Mode:**
   - Click the 🎤 microphone button
   - Say: "I want to learn Python for my 20-minute commute"
   - The agent will transcribe and understand your request!

The agent will understand your request and automatically generate a playlist!

## 🎨 Features

### AI-Powered Chat Interface
- Natural language understanding
- Conversational playlist creation
- Automatic topic and duration extraction

### 🎤 Voice Input Mode
- **Browser-based speech recognition** (Web Speech API)
- **Real-time transcription** - see your words as you speak
- **Visual feedback** - pulsing red button while recording
- **Auto-submit** - request sent automatically after speaking
- **Hands-free operation** - no clicking required
- **No additional APIs needed** - completely free
- **Supported browsers**: Chrome, Edge, Safari
- **Perfect for accessibility** - fully voice-controlled

### Beautiful Modal Playlist Display
- Embedded YouTube videos
- Video metadata (title, channel, duration, difficulty level)
- Color-coded difficulty badges
- Playlist summary with total duration

### Commutr Color Scheme
The interface uses the Commutr brand colors:
- **Rich Black** (#031926) - Background
- **Teal** (#468189) - Primary buttons
- **Cambridge Blue** (#77ACA2) - Accents
- **Ash Gray** (#9DBEBB) - Borders
- **Parchment** (#F4E9CD) - Chat background
- **White** (#FFFFFF) - Text and cards

## 🏗️ Architecture

### Frontend
- **`/public/agent.html`** - Agent Mode chat interface
- **`/public/index.html`** - Updated with Agent Mode button

### Backend
- **`/src/services/agent.ts`** - AI agent service using Groq SDK
- **`/src/web/agent.ts`** - Express router for agent endpoints
- **`/src/server.ts`** - Updated to include agent router

### API Endpoint

**POST** `/v1/agent/chat`

**Request:**
```json
{
  "message": "Create a Python playlist for 15 minutes"
}
```

**Response (with playlist):**
```json
{
  "message": "Great! I'll create a Python playlist for your 15-minute commute. Let me gather the best videos for you!",
  "playlist": {
    "items": [...],
    "totalDurationSec": 900,
    "underFilled": false
  },
  "playlistContext": {
    "topic": "python",
    "duration": 900
  }
}
```

**Response (just chatting):**
```json
{
  "message": "I can help you create personalized learning playlists...",
  "playlist": null,
  "playlistContext": null
}
```

## 🎤 How to Use Voice Mode

### Using Voice Input
1. Click the **🎤 microphone button** in the chat input area
2. The button will turn red and pulse, indicating it's listening
3. **Speak clearly** into your microphone: "Create a Python playlist for 15 minutes"
4. Your speech will be transcribed in real-time into the text input
5. When you finish speaking, the button returns to normal
6. **Request is automatically sent** after 0.5 seconds - no clicking needed!
7. The agent processes your request and generates a playlist!

### Voice Mode Tips
- **Speak naturally** - no need for special commands
- **Be specific** - mention both topic and duration
- **Speak complete requests** - it auto-submits after you finish
- **Speak clearly** - for best transcription accuracy
- **Allow microphone access** - browser will ask permission first time

### Browser Compatibility
- ✅ **Chrome** (recommended) - best support
- ✅ **Edge** - excellent support
- ✅ **Safari** - good support (iOS and macOS)
- ❌ **Firefox** - limited support (may not work)

## 🔧 How It Works

1. **User sends a message** through the chat interface (text or voice)
2. **AI agent processes** the message using Groq's Mixtral model
3. **Agent extracts** topic and duration (if present)
4. **Playlist generator** creates a curated playlist using the existing playlist API
5. **Modal appears** with embedded YouTube videos ready to watch
6. **User can watch** videos directly in the modal or continue chatting

## 📊 Example Conversations

### Example 1: Simple Request
```
User: "I want to learn JavaScript for 15 minutes"
Agent: "Awesome! I'll create a JavaScript playlist for your 15-minute journey!"
[Playlist modal appears with JavaScript videos]
```

### Example 2: Conversational
```
User: "What can you do?"
Agent: "I can help you create personalized learning playlists for your commute! 
       Just tell me what topic you'd like to learn about and how long your 
       commute is..."
```

### Example 3: Topic Not Found
```
User: "Create a playlist about asdfghjkl for 10 minutes"
Agent: "I couldn't find any educational videos for 'asdfghjkl'. Could you try 
       a different topic? Some popular topics include: cooking, python, 
       javascript, fitness..."
```

## 🎯 Testing Checklist

### Setup
- [ ] Install dependencies (`npm install`)
- [ ] Add Groq API key to `.env`
- [ ] Start server (`npm run dev`)
- [ ] Click "Agent Mode" button on main page

### Text Mode Testing
- [ ] Type and send a playlist request message
- [ ] Verify playlist modal appears
- [ ] Check video playback works
- [ ] Test different topics (python, cooking, javascript, etc.)
- [ ] Test different durations (5, 15, 30 minutes)
- [ ] Test conversational messages (no playlist request)

### Voice Mode Testing
- [ ] Click microphone button
- [ ] Allow microphone access when prompted
- [ ] Verify button turns red and pulses
- [ ] Speak a playlist request
- [ ] Check real-time transcription works
- [ ] Verify transcribed text appears in input field
- [ ] Send voice-transcribed message
- [ ] Test in different browsers (Chrome, Edge, Safari)
- [ ] Test with background noise
- [ ] Test stopping recording mid-speech

## 🐛 Troubleshooting

### "Cannot connect to server"
- Make sure the server is running: `npm run dev`
- Check that port 3000 is not in use

### "AI agent not configured"
- Verify your `GROQ_API_KEY` is set in `.env`
- Make sure the API key is valid (test at console.groq.com)

### "No videos found"
- Try a different topic (cooking, python, javascript, fitness)
- Check that YouTube API is working

### Groq SDK not found
- Run `npm install` to install dependencies
- Restart your IDE/editor

### Voice Mode Issues

**"Microphone access denied"**
- Click the microphone icon in your browser's address bar
- Allow microphone access for localhost
- Refresh the page and try again

**"Voice input not supported"**
- Use Chrome, Edge, or Safari (latest versions)
- Firefox has limited Web Speech API support
- Update your browser to the latest version

**"No speech detected"**
- Check your microphone is working (test in system settings)
- Speak closer to the microphone
- Ensure no other app is using the microphone
- Check browser permissions for microphone access

**Voice transcription is inaccurate**
- Speak more clearly and slowly
- Reduce background noise
- Use a better quality microphone
- Edit the transcribed text before sending

## 🚀 Alternative: Using OpenAI

If you prefer to use OpenAI instead of Groq, you can modify `/src/services/agent.ts`:

1. Install OpenAI SDK: `npm install openai`
2. Replace Groq import with OpenAI
3. Update the API call to use OpenAI's chat completion
4. Add `OPENAI_API_KEY` to your `.env` file

## 📝 Notes

- The AI agent uses Groq's **Llama 3.3 70B** model for fast, intelligent responses
- Playlist generation reuses the existing playlist builder logic
- All existing playlist features (difficulty levels, duration matching) work in Agent Mode
- The modal design matches the Commutr color scheme for brand consistency

## 🎉 What's Next?

Now that Agent Mode is set up, users can:
- Create playlists through natural conversation
- Get intelligent recommendations
- Enjoy a more interactive experience

Happy coding! 🚀
