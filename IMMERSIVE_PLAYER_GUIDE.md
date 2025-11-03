# 🎬 Immersive Player with Dynamic Playlist Adjustment - HW8

## Overview

This feature implements a full-screen immersive video player with real-time commute tracking that allows users to dynamically adjust their playlist mid-commute. Users can skip videos, change topics, and the system automatically recommends content that fits their remaining time without showing duplicate videos.

## Features Implemented

### ✅ Core Features
- **Playlist List View** - Display playlist as cards with thumbnails, titles, and durations
- **Immersive Video Player** - Full-screen YouTube player with minimal distractions
- **Real-Time Countdown Timer** - Shows remaining commute time with color-coded status
- **Skip Video** - Move to next video or fetch more if at end of playlist
- **Change Topic** - Request new content on different topic mid-commute
- **Watch History Tracking** - System tracks watched videos and excludes them from future recommendations
- **Auto-Fetch More Videos** - Automatically fetches more content when playlist is exhausted
- **Completion Screen** - Shows stats when commute time ends

### 🎨 User Experience
- Color-coded timer (green > 10 min, yellow 5-10 min, red < 5 min)
- Smooth transitions between videos
- Loading states with spinners
- Next video preview
- Mobile responsive design
- Dark theme for reduced eye strain

## Architecture

### Backend Components

#### 1. Watch History Module (`/src/history/watchHistory.ts`)
- Tracks all watched videos per user
- Stores: userId, videoId, topic, timestamp, duration, completion%
- Functions:
  - `addWatchedVideo()` - Record a watched video
  - `getWatchedVideoIds()` - Get list of watched video IDs
  - `getWatchHistory()` - Get full watch history
  - `hasWatchedVideo()` - Check if video was watched

#### 2. Adjust Playlist Endpoint (`/src/web/agent.ts`)
**POST** `/v1/agent/adjust-playlist`

**Request:**
```json
{
  "remainingTimeSec": 900,
  "currentTopic": "python",
  "newTopic": "cooking",
  "watchedVideoIds": ["abc123", "def456"],
  "action": "skip" | "change_topic" | "continue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Great! I've found 3 cooking videos...",
  "playlist": {
    "items": [...],
    "totalDurationSec": 850,
    "underFilled": false
  },
  "playlistContext": {
    "topic": "cooking",
    "duration": 900
  }
}
```

**Features:**
- Filters out watched videos from recommendations
- Builds playlist matching remaining time
- Handles topic changes
- Returns error if no videos available

### Frontend Components

#### 1. PlaylistView (`/client/pages/PlaylistView.jsx`)
- Displays playlist as scrollable list of video cards
- Shows playlist summary (video count, duration, commute time)
- Video cards show thumbnail, title, channel, difficulty badge
- Click any video to start playing from that position
- "Start Playlist" button to begin from first video

#### 2. ImmersivePlayer (`/client/pages/ImmersivePlayer.jsx`)
- Full-screen YouTube iframe player
- Real-time state management:
  - Current video index
  - Watched video IDs
  - Remaining commute time
  - Loading states
- Auto-advances to next video when current ends
- Fetches more videos when playlist exhausted
- Shows completion screen when time runs out

#### 3. CommuteTimer (`/client/components/CommuteTimer.jsx`)
- Fixed position timer in top-right corner
- Displays remaining time in MM:SS format
- Color-coded border based on remaining time
- Status text ("plenty of time", "wrapping up soon", "almost there!")
- Pulsing animation on timer icon

#### 4. PlayerControls (`/client/components/PlayerControls.jsx`)
- **Skip Button** - Skip to next video
- **Change Topic Button** - Opens input to request new topic
- Topic change form with submit/cancel
- Next video preview at bottom
- Disabled states during loading

## User Flow

### 1. Create Playlist
```
Home → Agent Mode → "Create Python playlist for 20 minutes"
→ Agent generates playlist → Redirects to PlaylistView
```

### 2. View Playlist
```
PlaylistView shows:
- Summary: 5 videos, 18 min total, 20 min commute
- List of video cards with thumbnails
- Click "Start Playlist" or any video card
```

### 3. Watch Videos
```
ImmersivePlayer opens:
- Timer shows 20:00 counting down
- Video plays in full-screen
- Controls at bottom (Skip, Change Topic)
- Next video preview shown
```

### 4. Skip Video
```
User clicks "Skip"
→ Current video marked as watched
→ Moves to next video
→ If last video, fetches more videos automatically
```

### 5. Change Topic
```
User clicks "Change Topic"
→ Input appears: "Enter new topic"
→ User types "cooking" and submits
→ API call to adjust-playlist endpoint
→ New cooking playlist loads
→ Starts playing first cooking video
→ Python videos excluded from future recommendations
```

### 6. Commute Ends
```
Timer reaches 0:00
→ Completion screen appears
→ Shows stats: 4 videos watched, 20 minutes learned
→ "Create New Playlist" button returns to Agent Mode
```

## API Endpoints

### Existing Endpoints Used
- `POST /v1/agent/chat` - Create initial playlist
- `POST /api/session` - Track learning sessions
- `GET /v1/playlist` - Get playlist (used internally)

### New Endpoints
- `POST /v1/agent/adjust-playlist` - Adjust playlist mid-commute

## File Structure

### New Files Created
```
Backend:
├── src/history/watchHistory.ts          # Watch history tracking
└── src/web/agent.ts                     # Added adjust-playlist endpoint

Frontend:
├── client/pages/PlaylistView.jsx        # Playlist list view
├── client/pages/ImmersivePlayer.jsx     # Full-screen player
├── client/components/CommuteTimer.jsx   # Countdown timer
├── client/components/PlayerControls.jsx # Skip/change controls
├── client/styles/PlaylistView.css       # Playlist styling
├── client/styles/ImmersivePlayer.css    # Player styling
├── client/styles/CommuteTimer.css       # Timer styling
└── client/styles/PlayerControls.css     # Controls styling

Documentation:
└── IMMERSIVE_PLAYER_GUIDE.md           # This file
```

### Modified Files
```
├── client/App.jsx                       # Added /playlist and /player routes
└── client/pages/AgentMode.jsx           # Redirect to playlist view
```

## Testing

### Manual Test Scenarios

#### Test 1: Happy Path
1. Navigate to Agent Mode
2. Say/type: "Create a Python playlist for 20 minutes"
3. ✅ Verify playlist view appears with videos
4. Click "Start Playlist"
5. ✅ Verify immersive player opens
6. ✅ Verify timer shows 20:00 and counts down
7. Wait 30 seconds, click "Skip"
8. ✅ Verify next video plays
9. Click "Change Topic", enter "cooking"
10. ✅ Verify cooking videos load
11. ✅ Verify Python videos don't appear again

#### Test 2: Playlist Exhaustion
1. Create 5-minute playlist
2. Skip through all videos quickly
3. ✅ Verify system auto-fetches more videos
4. ✅ Verify no duplicate videos shown

#### Test 3: Time Running Out
1. Create 20-minute playlist
2. Let timer run to < 5 minutes
3. ✅ Verify timer turns red
4. ✅ Verify status shows "almost there!"
5. Let timer reach 0:00
6. ✅ Verify completion screen appears
7. ✅ Verify stats are accurate

#### Test 4: Invalid Topic
1. In player, click "Change Topic"
2. Enter "asdfghjkl"
3. ✅ Verify error message appears
4. ✅ Verify playlist doesn't change

### API Testing

```bash
# Test adjust-playlist endpoint
curl -X POST "http://localhost:3000/v1/agent/adjust-playlist" \
  -H "Authorization: Bearer TEST" \
  -H "Content-Type: application/json" \
  -d '{
    "remainingTimeSec": 600,
    "currentTopic": "python",
    "watchedVideoIds": [],
    "action": "continue"
  }'

# Expected: Returns playlist with Python videos for 10 minutes
```

## Known Limitations

1. **YouTube API Required** - Needs valid YouTube API key in `.env`
2. **Groq API Required** - Needs valid Groq API key for agent chat
3. **No Persistent Auth** - Uses demo user "demoUser" for testing
4. **Watch History Not Synced** - Stored locally in JSON file
5. **No Video Playback Events** - Can't detect when user actually watches video (relies on skip/auto-advance)

## Future Enhancements

1. **Voice Commands** - "Skip this video", "Change topic to cooking"
2. **Playback Speed Control** - Adjust video speed to fit remaining time
3. **Video Quality Selection** - Choose resolution based on network
4. **Offline Mode** - Download videos for offline viewing
5. **Progress Persistence** - Resume playlist after closing app
6. **Social Sharing** - Share playlists with friends
7. **Analytics Dashboard** - Track learning progress over time

## Troubleshooting

### Issue: Videos not loading
**Solution:** Check YouTube API key in `.env` file

### Issue: Agent not responding
**Solution:** Check Groq API key in `.env` file

### Issue: Playlist view is blank
**Solution:** Ensure you created a playlist through Agent Mode first

### Issue: Timer not counting down
**Solution:** Check browser console for JavaScript errors

### Issue: Skip button not working
**Solution:** Check network tab for failed API calls

## Success Metrics

✅ **Core Functionality**
- User can view playlist before playing
- User can watch videos in immersive player
- Timer counts down accurately
- Skip button works
- Change topic works
- Watch history prevents duplicates

✅ **User Experience**
- Smooth transitions between videos
- Clear visual feedback
- Mobile responsive
- Loading states shown
- Error handling works

✅ **Technical Implementation**
- Backend endpoints functional
- Frontend components modular
- State management clean
- API integration working
- No console errors

## Deployment Notes

1. Ensure `.env` has valid API keys:
   ```
   YOUTUBE_API_KEY=your_key_here
   GROQ_API_KEY=your_key_here
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Access at: `http://localhost:5173`

4. For production:
   - Build: `npm run build`
   - Preview: `npm run preview`
   - Deploy to Vercel/Netlify

---

**Built for CS 1060 - HW8**  
**Feature:** Immersive Player with Dynamic Playlist Adjustment  
**Time Invested:** ~6 hours  
**Status:** ✅ Complete and Functional
