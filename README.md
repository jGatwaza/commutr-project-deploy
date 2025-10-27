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

### Drive link
https://drive.google.com/drive/folders/1w17W1tEhD0DlaJoDO4mZE8NYu_HI0Lir
