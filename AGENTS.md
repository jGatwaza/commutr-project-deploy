# AGENTS.md

This file provides context and instructions for AI coding agents working on the Commutr project.

## Project Overview

**Commutr** is a web and mobile application that helps users maximize their commute time by watching educational content tailored to fit their journey duration. The platform combines YouTube video recommendations with intelligent playlist generation, AI-powered conversational interfaces, and gamification features.

### Key Features
- **Smart Playlist Generation**: Creates personalized learning playlists based on topic and commute duration
- **AI Agent Mode**: Natural language interface (text and voice) for creating playlists conversationally
- **Session Tracking**: Records watch history and learning sessions
- **Gamification**: Achievement badges, streaks, and progress tracking
- **Content Recommendations**: Intelligent video selection based on difficulty levels and duration
- **Social Sharing**: Share playlists with unique tokens

## Commutr Assistant (Agent Mode)

The **Commutr Assistant** is an AI-powered conversational interface that allows users to create personalized learning playlists using natural language instead of traditional forms. It's one of the core differentiating features of Commutr.

### What It Does

Users can interact with the Commutr Assistant via:
- **Text Chat**: Type requests like "Create a Python playlist for my 15-minute commute"
- **Voice Input**: Speak requests hands-free using browser-native speech recognition
- **Conversational Flow**: The assistant maintains context across messages and can extract information from multi-turn conversations

### How It Works

1. **User Input**: User sends a message via text or voice
2. **AI Processing**: Message is processed by Groq's Llama 3.3 70B model
3. **Intent Extraction**: AI extracts topic and duration from natural language
4. **Playlist Generation**: If intent is detected, the system generates a playlist using existing playlist builder logic
5. **Response**: Assistant provides friendly feedback and displays the playlist

### Technical Architecture

**Frontend Component** (`client/pages/AgentMode.jsx`):
- React component with Redux state management
- Conversation history stored in Redux (`store/conversationSlice`)
- Real-time message display with typing indicators
- Voice input via `VoiceButton` component
- Auto-redirect to playlist view when playlist is generated

**Backend Service** (`src/services/agent.ts`):
- `processMessage()` function handles AI interaction
- Uses Groq SDK with Llama 3.3 70B Versatile model
- System prompt defines behavior and response format
- Conversation history support for context-aware responses
- Returns structured JSON with message and optional playlist request

**API Endpoints** (`src/web/agent.ts`):
- **POST `/v1/agent/chat`**: Main chat endpoint
  - Requires authorization token
  - Accepts message and conversation history
  - Returns agent response and optional playlist data
  - Handles errors gracefully with user-friendly messages

- **POST `/v1/agent/adjust-playlist`**: Dynamic playlist adjustment
  - Adjusts playlists based on remaining commute time
  - Filters out watched videos
  - Supports topic changes mid-commute
  - Actions: `skip`, `change_topic`, `continue`

### AI Model Configuration

**Provider**: Groq (free, fast inference)
- **Model**: `llama-3.3-70b-versatile`
- **Temperature**: 0.7 (balanced creativity/accuracy)
- **Max Tokens**: 500
- **Response Format**: Structured JSON

**System Prompt Design**:
- Friendly, conversational tone
- Extracts topic and duration from natural language
- Maintains conversation context across turns
- Returns JSON with message and optional playlist request
- Provides helpful fallback responses

### Voice Mode Features

**Browser-Native Speech Recognition**:
- Uses Web Speech API (no external API required)
- Supported browsers: Chrome, Edge, Safari
- Real-time transcription into text input
- Auto-submit when user stops speaking
- Visual feedback (pulsing microphone button)
- Free and works offline after initial load

**Implementation** (`client/components/VoiceButton.jsx`):
- Detects browser support for Web Speech API
- Handles microphone permissions
- Provides visual and status feedback
- Automatically triggers message submission
- Graceful fallback if speech not supported

### Conversation Memory

The assistant maintains context across the conversation using Redux state:
- **Message History**: All user and assistant messages stored
- **Conversation History**: Formatted for AI model (role + content)
- **Context Extraction**: AI uses history to understand incomplete requests
- **Example**: User says "Python" then "15 minutes" → AI creates Python playlist for 15 minutes

### Error Handling

- **Missing API Key**: Friendly message with setup instructions
- **No Videos Found**: Suggests alternative topics (cooking, python, javascript, etc.)
- **Duration Mismatch**: Explains why playlist couldn't fit and suggests alternatives
- **Network Errors**: User-friendly error messages with retry instructions
- **All Videos Watched**: Notifies user and suggests new topics

### Example Interactions

**Simple Request**:
```
User: "I want to learn JavaScript for 15 minutes"
Assistant: "Great! I'll create a JavaScript playlist for your 15-minute commute. Let me gather the best videos for you!"
[Redirects to playlist with JavaScript videos]
```

**Conversational Context**:
```
User: "I'm interested in learning Python"
Assistant: "Awesome! Python is a great choice. How long is your commute?"
User: "About 20 minutes"
Assistant: "Perfect! I'll create a Python playlist for your 20-minute journey!"
[Generates playlist]
```

**Voice Input**:
```
User: [Speaks] "Create a cooking playlist for my thirty minute drive"
[Text appears in real-time as user speaks]
[Auto-submits after user finishes]
Assistant: "I'd love to help you learn cooking! Here's a perfect playlist for your 30-minute drive!"
[Shows playlist]
```

### Integration with Playlist System

The Agent Mode integrates seamlessly with Commutr's existing playlist infrastructure:
- Uses same `buildPack()` algorithm for playlist generation
- Respects difficulty levels based on user mastery
- Filters out previously watched videos
- Applies duration tolerance (±7% of target duration)
- Supports underfill detection for insufficient content
- Formats videos with metadata (title, channel, thumbnail, duration, difficulty)

### Setup Requirements

**Environment Variables**:
```env
GROQ_API_KEY="your-groq-api-key-here"
```

**Get Free Groq API Key**:
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (no credit card required)
3. Create API key in dashboard
4. Add to `.env` file

**Testing Agent Mode**:
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000
# Click "Agent Mode" or "🤖 Commutr Assistant" button
# Try text or voice input
```

### Key Files

**Frontend**:
- `client/pages/AgentMode.jsx` - Main chat interface
- `client/components/VoiceButton.jsx` - Voice input component
- `client/components/ChatMessage.jsx` - Message display
- `client/components/WelcomeState.jsx` - Empty state
- `client/store/conversationSlice.js` - Redux state management
- `client/styles/AgentMode.css` - Agent mode styling

**Backend**:
- `src/services/agent.ts` - AI service (Groq integration)
- `src/web/agent.ts` - Express routes for agent endpoints
- `src/pack/builder.ts` - Playlist building algorithm
- `src/stubs/metadata.ts` - Video metadata retrieval
- `src/stubs/mastery.ts` - User mastery tracking

**Tests**:
- `__tests__/unit/agent.test.ts` - Unit tests for agent service
- `__tests__/integration/agentAPI.test.ts` - API endpoint tests
- `__tests__/integration/conversationFlow.test.ts` - Conversation flow tests

### Design Guidelines

The Agent Mode follows Commutr's brand guidelines:
- **Parchment** (`#F4E9CD`) background for chat messages
- **Teal** (`#468189`) for user messages
- **Cambridge Blue** (`#77ACA2`) for assistant responses
- **Rich Black** (`#031926`) for text
- Microphone icon with pulsing animation during recording
- Smooth transitions and typing indicators for natural feel

### Future Enhancements

Consider these when extending Agent Mode:
- Multi-language support
- Playlist history integration in chat
- Inline video previews in chat
- Suggested prompts/quick replies
- Personalized recommendations based on past behavior
- Alternative AI providers (OpenAI, Claude) as fallback
- More sophisticated conversation branching
- Session persistence across page reloads

## Technology Stack

### Frontend
- **React 18.3+** with React Router for SPA navigation
- **Redux Toolkit** for state management
- **Vite** as the build tool and dev server
- **Firebase** for authentication
- **Web Speech API** for voice input (browser-native)

### Backend
- **Node.js** with Express 4.19+
- **TypeScript** with strict mode enabled
- **ES Modules** (type: "module" in package.json)
- **Groq SDK** for AI agent functionality (Llama 3.3 70B model)
- **YouTube Data API v3** for video content

### Development Tools
- **Jest** for testing (with ts-jest and babel-jest)
- **tsx** for running TypeScript files
- **Concurrently** for running multiple dev processes
- **Vite** for HMR and React Fast Refresh

## Architecture

### Directory Structure
```
commutr-project/
├── client/               # React frontend
│   ├── components/      # Reusable React components
│   ├── pages/          # Page-level components
│   ├── context/        # React context providers
│   ├── config/         # Firebase and app config
│   └── styles/         # CSS files
├── src/                 # Backend source code
│   ├── web/            # Express route handlers
│   ├── lib/            # Core business logic
│   │   ├── player/     # Video player logic
│   │   └── recommender/ # Recommendation engine
│   ├── services/       # External service integrations
│   ├── achievements/   # Badge and achievement logic
│   ├── history/        # Session history management
│   └── server.ts       # Main Express server
├── public/             # Static assets and legacy pages
├── test/               # Backend tests
├── __tests__/          # Integration tests
└── tests/              # Additional test suites
```

### Server Configuration
- **Development**: Vite dev server on port 3000, Express API on port 5173
- **Production**: Built Vite app served from Express
- **API Proxy**: `/v1` and `/api` paths proxied to Express backend

## Setup Commands

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file with:
```env
YOUTUBE_API_KEY="your-youtube-api-key"
GROQ_API_KEY="your-groq-api-key"
```

**API Keys:**
- YouTube API: [Google Cloud Console](https://console.cloud.google.com/)
- Groq API: [console.groq.com](https://console.groq.com) (free, no credit card)

### Development
```bash
# Start both API server and React dev server
npm run dev

# Start only API server (port 5173)
npm run dev:server

# Start only React/Vite (port 3000)
npm run dev:client
```

### Production
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
npm start
```

## Testing Instructions

### Running Tests

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (during development):**
```bash
npm test -- --watch
```

**Run specific test file:**
```bash
npm test -- path/to/test/file.test.ts
```

**Run with coverage:**
```bash
npm test -- --coverage
```

### Test Configuration
- **Framework**: Jest with ES Module support
- **Test patterns**: `**/__tests__/**/*.test.{js,ts}`, `**/test/**/*.test.{js,ts}`, `**/tests/**/*.test.{js,ts}`
- **Environment**: Node (default) and jsdom (for React components)
- **Timeout**: 10 seconds per test
- **Mocks**: Groq SDK is mocked in `__mocks__/groq-sdk.ts`

### Coverage Requirements
The project enforces minimum code coverage:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 80%
- **Statements**: 80%

### Linting and Static Analysis

**Currently no linters configured.** Consider adding:
```bash
# ESLint for TypeScript and React (recommendation)
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react

# Prettier for code formatting (recommendation)
npm install --save-dev prettier
```

### TypeScript Type Checking
```bash
# Check types without building
npx tsc --noEmit
```

### When to Update Tests

**ALWAYS add new tests when:**
- Adding a new feature or endpoint
- Fixing a bug (add regression test first)
- Modifying business logic
- Adding new components or pages
- Changing API contracts

**Update test expectations when:**
- API response structure changes (with explicit team approval)
- Business requirements change (document reason in commit)

### CRITICAL: Do NOT Modify Existing Tests

⚠️ **NEVER change existing tests unless explicitly requested by the user.**

The project follows **Test-Driven Development (TDD)** principles:
- Tests define the contract and expected behavior
- If tests fail, fix the implementation, NOT the tests
- Existing tests are protected by a pre-commit hook (`.githooks/pre-commit`)
- Modifying tests to make code pass defeats TDD and can hide bugs

**Exception:** Only modify tests if:
1. The user explicitly requests test changes
2. Requirements have fundamentally changed (document thoroughly)
3. There's a bug in the test itself (discuss with team first)

See `docs/CONTRIBUTING.md` for detailed TDD policy.

## Continuous Integration

**No CI/CD currently configured.**

### Recommended CI Setup
Consider implementing:
- **GitHub Actions** or **GitLab CI** for automated testing
- Run `npm test` on every pull request
- Run `npm run build` to verify builds succeed
- Type checking with `tsc --noEmit`
- Code coverage reports
- Automated deployment to Vercel/Netlify

### Example GitHub Actions Workflow
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run build
```

## API Endpoints

### Playlist Creation
- **POST** `/v1/recommend` - Generate video recommendations
- **POST** `/v1/playlist/build` - Build a playlist from duration and topic

### AI Agent
- **POST** `/v1/agent/chat` - Conversational playlist creation
  - Supports text and voice input
  - Extracts topic and duration from natural language
  - Returns playlist or continues conversation

### Session History
- **POST** `/api/history` - Save a session
- **GET** `/api/history` - List user's sessions
- **GET** `/api/history/:id` - Get session details
- **GET** `/api/share/:token` - Get shared session (public)

### Achievements & Streaks
- **POST** `/api/session` - Log a learning session
- **GET** `/api/streak` - Get user's streak statistics
- **GET** `/api/achievements` - Get badges and progress

### Playback
- **POST** `/api/playback/start` - Start video playback
- **POST** `/api/playback/progress` - Update playback progress
- **POST** `/api/playback/complete` - Mark video as complete

## Code Style and Conventions

### TypeScript
- **Strict mode** enabled in `tsconfig.json`
- Use `nodenext` module resolution
- Always provide explicit types for function parameters and returns
- Use ES modules (`import`/`export`, not `require`)

### React
- Functional components with hooks (no class components)
- Use React Router's `Link` for navigation
- Context for shared state (Auth, Commute)
- Redux Toolkit for global application state

### File Naming
- React components: PascalCase (e.g., `ChatMessage.jsx`)
- Backend modules: camelCase (e.g., `agent.ts`, `recommend.ts`)
- Test files: `*.test.ts`, `*.test.js`, `*.test.jsx`

### API Design
- RESTful endpoints under `/api` and `/v1`
- JSON request/response bodies
- Bearer token authentication: `Authorization: Bearer TOKEN`
- Rate limiting on sensitive endpoints

### Error Handling
- Return appropriate HTTP status codes
- Provide descriptive error messages
- Log errors server-side for debugging

## Color Scheme (Brand Guidelines)

Use Commutr's official color palette in UI components:
- **Rich Black**: `#031926` - Backgrounds
- **Teal**: `#468189` - Primary buttons, accents
- **Cambridge Blue**: `#77ACA2` - Secondary elements
- **Ash Gray**: `#9DBEBB` - Borders, disabled states
- **Parchment**: `#F4E9CD` - Chat backgrounds, light sections
- **White**: `#FFFFFF` - Text, cards

## Important Implementation Details

### Authentication
- Firebase Auth for user management
- Auth context in `client/context/AuthContext.jsx`
- Token stored in localStorage
- Protected routes check auth state

### Agent Mode
- Voice input uses Web Speech API (browser-native, free)
- Text-to-speech transcription in real-time
- Auto-submit after user stops speaking
- Groq API for AI responses (Llama 3.3 70B)
- Fallback to text input if voice unsupported

### Playlist Algorithm
- Videos selected based on topic keywords
- Duration matching within tolerance
- Difficulty levels: Beginner, Intermediate, Advanced
- Underfill tolerance: accepts playlists within 80% of target duration

### Data Storage
- Session history in JSON files (`data/commute-history.json`, `data/sessions.json`)
- Achievement data persisted per user
- No database currently (consider adding for production)

## Common Development Tasks

### Adding a New API Endpoint
1. Create handler in `src/web/` (e.g., `src/web/myFeature.ts`)
2. Define Express router with routes
3. Export router and import in `src/server.ts`
4. Add tests in `test/` or `__tests__/`
5. Update this AGENTS.md with new endpoint documentation

### Adding a New React Page
1. Create component in `client/pages/` (e.g., `NewPage.jsx`)
2. Add route in `client/App.jsx`
3. Add navigation link if needed
4. Style with Commutr color scheme
5. Add tests if complex logic

### Debugging Agent Mode
1. Check console for Groq API errors
2. Verify `GROQ_API_KEY` is set in `.env`
3. Test API directly: `POST http://localhost:5173/v1/agent/chat`
4. Check `src/services/agent.ts` for prompt logic
5. Review conversation history in browser DevTools

### Troubleshooting Build Issues
- Clear Vite cache: `rm -rf node_modules/.vite`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node version (requires Node 18+)
- Verify TypeScript compilation: `npx tsc --noEmit`

## Python Usage Note

**Always use `python3` instead of `python`** when running Python scripts or commands. This project may have Python tooling that requires Python 3.

## Security Considerations

- **Never commit** `.env` files or API keys
- API keys should be in `.env` (already in `.gitignore`)
- Use environment variables for all secrets
- Validate and sanitize user input
- Rate limit public endpoints
- Use HTTPS in production

## Resources and Documentation

- Main README: `README.md`
- Agent Mode setup: `AGENT_MODE_SETUP.md`
- Authentication setup: `AUTHENTICATION_SETUP.md`
- Voice mode guide: `VOICE_MODE_GUIDE.md`
- Contributing guidelines: `docs/CONTRIBUTING.md`
- API contracts: `docs/CONTRACTS.md`

## Questions or Issues?

If you encounter issues or need clarification:
1. Check relevant documentation files in `/docs` and root
2. Review test files for usage examples
3. Check `package.json` scripts for available commands
4. Consult the project's Google Drive (linked in README)
5. Preserve existing functionality when making changes
