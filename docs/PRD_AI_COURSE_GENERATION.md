# Portal28 Academy — AI Course Generation from Video PRD

> **Document Version:** 1.0  
> **Created:** January 25, 2026  
> **Status:** Draft  
> **Priority:** HIGH

---

## Executive Summary

Enable course creators to upload a video and automatically generate a complete, interactive course with:
- AI-generated transcription and chapters
- Auto-generated lesson notes
- AI-suggested quiz questions
- Public comments system
- Timestamps and key points

This dramatically reduces course creation time from hours to minutes.

---

## User Stories

### As a Course Creator (Admin)
1. I can upload a video file or provide a video URL
2. The system automatically transcribes the video
3. AI analyzes the content and generates:
   - Chapter markers with timestamps
   - Lesson notes summarizing key points
   - Quiz questions to test comprehension
4. I can review and edit all AI-generated content
5. I can set the course as free or paid
6. I can publish the course when ready

### As a Student
1. I can browse and discover courses
2. I can purchase (or access free) courses
3. I can watch videos with chapter navigation
4. I can view AI-generated notes alongside the video
5. I can take quizzes to test my understanding
6. I can leave public comments on lessons
7. I can track my progress through the course

---

## Technical Architecture

### Phase 1: Video Ingestion Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Video Upload   │────▶│  Mux Processing │────▶│  Store in DB    │
│  (URL or File)  │     │  (Encoding)     │     │  (playback_id)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Supported Sources:**
- Direct file upload (MP4, MOV, WebM)
- YouTube URL (via yt-dlp or similar)
- Google Drive link
- Existing Mux asset

### Phase 2: AI Analysis Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Mux Playback   │────▶│  Transcription  │────▶│  AI Analysis    │
│  URL            │     │  (Whisper API)  │     │  (GPT-4/Claude) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┴───────────────────────────────┐
                        ▼                               ▼                               ▼
                ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
                │  Chapters       │           │  Notes          │           │  Quiz Questions │
                │  (timestamps)   │           │  (summaries)    │           │  (multiple-choice) │
                └─────────────────┘           └─────────────────┘           └─────────────────┘
```

**AI Services:**
- **Transcription:** OpenAI Whisper or AssemblyAI
- **Analysis:** OpenAI GPT-4 or Anthropic Claude
- **Output Format:** Structured JSON

### Phase 3: Interactive Elements

| Element | Description | Storage |
|---------|-------------|---------|
| **Chapters** | Timestamp markers with titles | `lesson_chapters` table |
| **Notes** | AI-generated summaries per chapter | `lesson_notes` table |
| **Quizzes** | Multiple-choice questions | `quizzes` + `quiz_questions` tables |
| **Comments** | Public lesson comments | `lesson_comments` table |

---

## Database Schema Additions

### New Tables

```sql
-- AI analysis jobs tracking
CREATE TABLE ai_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, transcribing, analyzing, complete, failed
  transcription TEXT,
  chapters JSONB, -- [{timestamp: 0, title: "Intro", summary: "..."}]
  notes JSONB, -- [{timestamp: 0, content: "..."}]
  quiz_suggestions JSONB, -- [{question: "...", options: [...], correct: 0}]
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Lesson chapters for navigation
CREATE TABLE lesson_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast chapter lookup
CREATE INDEX idx_lesson_chapters_lesson ON lesson_chapters(lesson_id, sort_order);
```

### Existing Tables Used
- `lessons` — Video content
- `lesson_notes` — Student and AI notes
- `lesson_comments` — Public comments
- `quizzes` + `quiz_questions` — Quiz system

---

## API Endpoints

### Video Upload & Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/lessons/upload-video` | Upload video file to Mux |
| POST | `/api/admin/lessons/import-video` | Import from URL (YouTube, etc.) |
| POST | `/api/admin/lessons/[id]/analyze` | Trigger AI analysis |
| GET | `/api/admin/ai-jobs/[id]` | Check analysis status |
| POST | `/api/admin/lessons/[id]/apply-analysis` | Apply AI suggestions |

### Student Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lessons/[id]/chapters` | Get lesson chapters |
| GET | `/api/lessons/[id]/notes` | Get lesson notes |
| GET | `/api/lessons/[id]/comments` | Get public comments |
| POST | `/api/lessons/[id]/comments` | Add comment |
| GET | `/api/lessons/[id]/quiz` | Get quiz questions |
| POST | `/api/lessons/[id]/quiz/submit` | Submit quiz answers |

---

## UI Components

### Admin: AI Course Generator

```
┌────────────────────────────────────────────────────────────────┐
│  Create Course from Video                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📹 Drop video file here or paste URL                    │ │
│  │                                                          │ │
│  │  Supported: MP4, MOV, YouTube, Google Drive              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Course Title: [_____________________________________]         │
│  Price:        [Free ▼] or [$___]                              │
│                                                                │
│  [🔄 Upload & Analyze with AI]                                 │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  AI Analysis Progress                                          │
│  ├─ ✅ Video uploaded                                          │
│  ├─ ✅ Transcription complete                                  │
│  ├─ 🔄 Generating chapters...                                  │
│  ├─ ⏳ Generating notes                                        │
│  └─ ⏳ Generating quiz questions                               │
└────────────────────────────────────────────────────────────────┘
```

### Admin: Review & Edit AI Content

```
┌────────────────────────────────────────────────────────────────┐
│  Review AI-Generated Content                                   │
├────────────────────────────────────────────────────────────────┤
│  Chapters (5)                                     [Edit All]   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 0:00  Introduction                            [Edit][❌] │ │
│  │ 2:30  Core Concept: Setting Intentions        [Edit][❌] │ │
│  │ 8:15  Practical Exercise                      [Edit][❌] │ │
│  │ 15:00 Common Mistakes                         [Edit][❌] │ │
│  │ 22:45 Summary & Next Steps                    [Edit][❌] │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Notes (Auto-generated)                           [Edit All]   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Key Points:                                              │ │
│  │ • Setting clear intentions improves focus by 40%        │ │
│  │ • The 3-step framework: Define, Visualize, Act          │ │
│  │ • Common mistake: Vague goals without deadlines         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Quiz Questions (3)                               [Edit All]   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Q1: What is the first step in setting intentions?       │ │
│  │     A) Visualize B) Define ✓ C) Act D) Review           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Publish Course]  [Save as Draft]                             │
└────────────────────────────────────────────────────────────────┘
```

### Student: Interactive Lesson View

```
┌────────────────────────────────────────────────────────────────┐
│  [Video Player - Mux]                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │                    🎬 Video                               │ │
│  │                                                          │ │
│  │  ▶ ──────●────────────────────────── 8:15 / 25:00       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Chapters                                                      │
│  ├─ ✅ 0:00 Introduction                                       │
│  ├─ ▶ 2:30 Core Concept ← Currently playing                   │
│  ├─ ○ 8:15 Practical Exercise                                 │
│  ├─ ○ 15:00 Common Mistakes                                   │
│  └─ ○ 22:45 Summary                                           │
│                                                                │
│  [📝 Notes] [💬 Comments (12)] [❓ Quiz]                        │
├────────────────────────────────────────────────────────────────┤
│  Notes                                                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📌 Key Points:                                           │ │
│  │ • Setting clear intentions improves focus by 40%        │ │
│  │ • The 3-step framework: Define, Visualize, Act          │ │
│  │                                                          │ │
│  │ ✏️ Add your own notes...                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 hours)
1. Create `ai_analysis_jobs` and `lesson_chapters` tables
2. Add API endpoint for triggering AI analysis
3. Integrate with OpenAI Whisper for transcription
4. Create basic admin UI for video upload

### Phase 2: AI Analysis (3-4 hours)
1. Implement transcription pipeline
2. Create GPT-4/Claude prompts for:
   - Chapter generation
   - Note summarization
   - Quiz question generation
3. Store results in database
4. Admin review UI

### Phase 3: Student Experience (2-3 hours)
1. Chapter navigation component
2. AI notes display alongside video
3. Quiz integration with lessons
4. Comments system (already exists)

### Phase 4: Polish & Testing (1-2 hours)
1. Error handling and retry logic
2. Progress indicators
3. E2E tests
4. Documentation

---

## Environment Variables Required

```env
# AI Services
OPENAI_API_KEY=sk-...           # For Whisper & GPT-4
# OR
ANTHROPIC_API_KEY=sk-ant-...    # For Claude

# Existing (already configured)
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
```

---

## Cost Estimates

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI Whisper | ~$0.006/min | 30-min video ≈ $0.18 |
| GPT-4 Analysis | ~$0.03/1K tokens | ~$0.50 per video |
| Mux Video | Already budgeted | Existing infrastructure |

**Total per course: ~$0.70-1.00**

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Course creation time | < 10 minutes (vs hours) |
| AI content accuracy | > 90% usable without edits |
| Student quiz completion | > 60% |
| Student note engagement | > 40% view notes |

---

## Security & Privacy

- Video content stored securely in Mux
- Transcriptions stored encrypted
- AI analysis done server-side only
- No student data sent to AI services
- Admin approval required before publishing

---

## Dependencies

- OpenAI API (or Anthropic Claude)
- Mux Video (already integrated)
- Supabase (already integrated)
- Existing quiz system
- Existing comments system
- Existing notes system

---

*Document created: January 25, 2026*
