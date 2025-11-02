# Commutr
Commutr is a app and web based application that helps users use thier commute time more productively by watching content that interest them and fits within their commute window.

## API Endpoints

### Mastery & Streak Service (CTR-200)

**POST /api/session** - Log a learning session
```bash
curl -X POST "http://localhost:3000/api/session" \
  -H "Authorization: Bearer TEST" \
  -H "Content-Type: application/json" \
  -d '{"topic":"science","minutes":15}'
```

**GET /api/streak** - Get user streak statistics
```bash
curl -H "Authorization: Bearer TEST" "http://localhost:3000/api/streak"
```

Example response:
```json
{
  "totalSessions": 5,
  "totalMinutes": 75,
  "currentStreakDays": 2,
  "lastSessionISO": "2025-10-27T15:30:00.000Z"
}
```

### Session History Service (CTR-58)

**POST /api/history** - Save a session to history
```bash
curl -X POST "http://localhost:3000/api/history" \
  -H "Authorization: Bearer TEST" \
  -H "Content-Type: application/json" \
  -d '{"queryText":"science 10 min","intent":{},"playlist":{},"durationMs":4200}'
```

Example response:
```json
{
  "id": "c1a2b3c4d5e6f7g8h9",
  "shareToken": "abc123xyz456"
}
```

**GET /api/history** - List session history
```bash
curl -H "Authorization: Bearer TEST" "http://localhost:3000/api/history?limit=20"
```

Example response:
```json
[
  {
    "id": "c1a2b3c4d5e6f7g8h9",
    "createdAt": "2025-11-02T16:30:00.000Z",
    "queryText": "science 10 min"
  }
]
```

**GET /api/history/:id** - Get full session details
```bash
curl -H "Authorization: Bearer TEST" "http://localhost:3000/api/history/SESSION_ID"
```

Example response:
```json
{
  "id": "c1a2b3c4d5e6f7g8h9",
  "createdAt": "2025-11-02T16:30:00.000Z",
  "queryText": "science 10 min",
  "intent": {},
  "playlist": {},
  "shareToken": "abc123xyz456"
}
```

**GET /api/share/:token** - Get shared session (public, no auth required)
```bash
curl "http://localhost:3000/api/share/SHARE_TOKEN"
```

Example response:
```json
{
  "queryText": "science 10 min",
  "playlist": {}
}
```

**Share URL** - Access shared playlist via friendly URL
```
http://localhost:3000/s/SHARE_TOKEN
```

### Drive link
https://drive.google.com/drive/folders/1w17W1tEhD0DlaJoDO4mZE8NYu_HI0Lir
