# API Contracts

## POST /api/recommend

Returns video recommendations that fit within a specified duration budget, with de-duplication and optional topic filtering.

### Endpoint

```
POST /api/recommend
```

### Request Headers

```
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `remainingSeconds` | number | Yes | Target duration in seconds (must be > 0) |
| `excludeIds` | string[] | No | Array of video IDs to exclude from recommendations |
| `topic` | string | No | Topic filter (case-insensitive). Only videos with matching topic tags will be returned |

#### Example Request Body

```json
{
  "remainingSeconds": 900,
  "excludeIds": ["vid1", "vid3"],
  "topic": "javascript"
}
```

### Response

#### Success Response (200 OK)

Returns a JSON object with selected videos and metadata.

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `items` | Video[] | Array of selected videos |
| `totalSec` | number | Total duration of selected videos in seconds |
| `strategy` | string | Selection strategy used (e.g., "longest-first", "shortest-first", "creator-aware") |

**Video Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique video identifier |
| `url` | string | Video URL |
| `title` | string | Video title |
| `durationSec` | number | Video duration in seconds |
| `topicTags` | string[] | Optional array of topic tags |
| `creatorId` | string | Optional creator identifier |
| `publishedAt` | string | Optional ISO 8601 timestamp |

#### Example Success Response

```json
{
  "items": [
    {
      "id": "vid2",
      "url": "https://youtube.com/watch?v=def456",
      "title": "Advanced React Patterns",
      "durationSec": 600,
      "topicTags": ["react", "javascript", "programming"],
      "creatorId": "creator2",
      "publishedAt": "2024-02-20T14:30:00Z"
    },
    {
      "id": "vid7",
      "url": "https://youtube.com/watch?v=stu901",
      "title": "React Hooks Deep Dive",
      "durationSec": 300,
      "topicTags": ["react", "javascript", "hooks"],
      "creatorId": "creator5",
      "publishedAt": "2024-03-20T10:30:00Z"
    }
  ],
  "totalSec": 900,
  "strategy": "shortest-first-diversity"
}
```

#### Error Responses

**400 Bad Request** - Invalid request body

```json
{
  "error": "Invalid request body",
  "issues": [
    {
      "path": "remainingSeconds",
      "message": "remainingSeconds must be greater than 0"
    }
  ]
}
```

**405 Method Not Allowed** - Non-POST request

```json
{
  "error": "Method not allowed",
  "message": "Only POST requests are supported"
}
```

### Algorithm Behavior

The recommendation algorithm:

1. **Filters** videos by topic (if provided) and excludes specified IDs
2. **De-duplicates** videos by canonical ID (keeps only one video per ID)
3. **Tries multiple strategies** (longest-first, shortest-first, creator-aware, recency-first)
4. **Selects the best** result using tie-breakers:
   - Maximize total duration (up to 3% overbook allowed)
   - Maximize creator diversity (prefer more unique creators)
   - Maximize recency (prefer newer content)
5. **Returns** the optimal selection

### Sample cURL Commands

#### Basic recommendation

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "remainingSeconds": 900
  }'
```

#### With exclusions

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "remainingSeconds": 1200,
    "excludeIds": ["vid1", "vid2", "vid3"]
  }'
```

#### With topic filter

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "remainingSeconds": 1500,
    "topic": "react"
  }'
```

#### Complete example with all options

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "remainingSeconds": 1800,
    "excludeIds": ["vid1", "vid5"],
    "topic": "programming"
  }'
```

### Notes

- The algorithm allows up to 3% overbooking by default (e.g., for 900 seconds, up to 927 seconds may be selected)
- Topic matching is case-insensitive
- Videos are de-duplicated by canonical ID before selection
- Empty results are returned if no videos match the criteria or fit within the duration
