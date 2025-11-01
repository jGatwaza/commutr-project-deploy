# 🤖 Agent Mode Setup Guide

This guide will help you set up the new **Agent Mode** feature for Commutr, which allows users to create playlists through natural language conversation with an AI agent.

## 🎯 What is Agent Mode?

Agent Mode is an AI-powered chat interface that lets users request playlists conversationally. Instead of filling out a form, users can simply say:
- "Create a Python playlist for my 15-minute commute"
- "I want to learn cooking for 20 minutes"
- "Make me a JavaScript playlist for a 30-minute drive"

The AI agent extracts the topic and duration, then automatically generates a personalized playlist!

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
3. Try sending a message like:
   - "Create a playlist about cooking for 15 minutes"
   - "I want to learn Python for my 20-minute commute"
   - "Make me a JavaScript playlist for 30 minutes"

The agent will understand your request and automatically generate a playlist!

## 🎨 Features

### AI-Powered Chat Interface
- Natural language understanding
- Conversational playlist creation
- Automatic topic and duration extraction

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

## 🔧 How It Works

1. **User sends a message** through the chat interface
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

- [ ] Install dependencies (`npm install`)
- [ ] Add Groq API key to `.env`
- [ ] Start server (`npm run dev`)
- [ ] Click "Agent Mode" button on main page
- [ ] Send a playlist request message
- [ ] Verify playlist modal appears
- [ ] Check video playback works
- [ ] Test different topics (python, cooking, javascript, etc.)
- [ ] Test different durations (5, 15, 30 minutes)
- [ ] Test conversational messages (no playlist request)

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
