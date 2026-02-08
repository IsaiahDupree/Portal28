# Content Scheduling System

**Feature ID:** feat-230
**Status:** ✅ Implemented
**Date:** February 8, 2026

---

## Overview

Portal28's Content Scheduling System allows creators to schedule content for automatic publication at specific times, with full timezone support.

## Features

### Supported Content Types

- **Courses** - Schedule course launches
- **Lessons** - Schedule lesson releases (drip content)
- **Announcements** - Schedule community announcements
- **Emails** - Schedule email campaigns
- **YouTube Videos** - Schedule video publications
- **Posts** - Schedule blog posts

### Key Capabilities

✅ Schedule content for future publication
✅ Timezone-aware scheduling (supports all IANA timezones)
✅ Automatic publishing via cron job (runs every minute)
✅ Retry failed publications (up to 3 attempts)
✅ Schedule history tracking
✅ Reschedule or cancel pending publications
✅ Recurring schedules for repeating content

---

## API Reference

### Schedule Content

**Endpoint:** `POST /api/schedule`

**Request Body:**
```json
{
  "contentType": "course",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "scheduledFor": "2026-02-10T09:00:00",
  "timezone": "America/New_York",
  "autoPublish": true,
  "publishAction": {
    "sendNotification": true
  }
}
```

**Response:**
```json
{
  "id": "schedule-id",
  "content_type": "course",
  "content_id": "course-id",
  "scheduled_for": "2026-02-10T14:00:00.000Z",
  "timezone": "America/New_York",
  "status": "pending",
  "created_at": "2026-02-08T10:00:00.000Z"
}
```

### Get Scheduled Content

**Endpoint:** `GET /api/schedule?contentType=course&status=pending`

**Query Parameters:**
- `contentType` (optional) - Filter by content type
- `status` (optional) - Filter by status (pending, publishing, published, failed, cancelled)
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

### Update Schedule

**Endpoint:** `PATCH /api/schedule/[id]`

**Request Body:**
```json
{
  "scheduledFor": "2026-02-11T10:00:00",
  "timezone": "America/Los_Angeles"
}
```

### Cancel Schedule

**Endpoint:** `DELETE /api/schedule/[id]`

Marks the schedule as cancelled. Only pending schedules can be cancelled.

---

## Timezone Support

### Common Timezones

Portal28 supports all IANA timezones. Common ones include:

| Timezone | Label | Offset |
|----------|-------|--------|
| `UTC` | UTC | +00:00 |
| `America/New_York` | Eastern Time (ET) | -05:00/-04:00 |
| `America/Chicago` | Central Time (CT) | -06:00/-05:00 |
| `America/Denver` | Mountain Time (MT) | -07:00/-06:00 |
| `America/Los_Angeles` | Pacific Time (PT) | -08:00/-07:00 |
| `Europe/London` | London (GMT/BST) | +00:00/+01:00 |
| `Asia/Tokyo` | Japan Standard Time | +09:00 |

### Timezone Utilities

```typescript
import { toUTC, fromUTC, isValidTimezone, getTimeUntil } from '@/lib/utils/timezone';

// Convert local time to UTC for storage
const utc = toUTC('2026-02-10T09:00:00', 'America/New_York');
// => "2026-02-10T14:00:00.000Z"

// Convert UTC to local time for display
const local = fromUTC('2026-02-10T14:00:00.000Z', 'America/New_York');
// => "2026-02-10T09:00:00"

// Validate timezone
isValidTimezone('America/New_York'); // => true
isValidTimezone('Invalid/Zone'); // => false

// Calculate time until scheduled
const timeUntil = getTimeUntil('2026-02-10T14:00:00.000Z');
// => { days: 2, hours: 4, minutes: 30, seconds: 15, isPast: false }
```

---

## Auto-Publishing

### Cron Job

Content is automatically published by a cron job that runs **every minute**:

**Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "* * * * *"
    }
  ]
}
```

**Environment Variable:**
```
CRON_SECRET=your-secret-here
```

The cron job must include this secret in the Authorization header:
```
Authorization: Bearer your-secret-here
```

### Publishing Flow

1. **Check** - Every minute, the cron queries for pending items where `scheduled_for ≤ NOW()`
2. **Mark** - Updates status to `publishing`
3. **Publish** - Executes content-type-specific publish logic
4. **Success** - Updates status to `published` and sets `published_at`
5. **Failure** - Updates status to `failed` (or `pending` for retry), increments `retry_count`

### Retry Logic

- Failed publications are automatically retried up to 3 times
- After max retries, status changes to `failed`
- Error messages are stored in `error_message` field

---

## Database Schema

### `scheduled_content`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `content_type` | TEXT | Type of content (course, lesson, etc.) |
| `content_id` | UUID | ID of the content item |
| `scheduled_for` | TIMESTAMPTZ | When to publish (stored in UTC) |
| `timezone` | TEXT | Timezone for scheduling |
| `status` | TEXT | pending, publishing, published, failed, cancelled |
| `auto_publish` | BOOLEAN | Whether to auto-publish |
| `publish_action` | JSONB | Additional actions on publish |
| `published_at` | TIMESTAMPTZ | When it was actually published |
| `error_message` | TEXT | Error if failed |
| `retry_count` | INTEGER | Number of retry attempts |
| `max_retries` | INTEGER | Maximum retries allowed |
| `created_by` | UUID | User who scheduled it |

### `content_schedule_history`

Tracks all changes to schedules (audit log):

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `scheduled_content_id` | UUID | Reference to scheduled_content |
| `action` | TEXT | scheduled, rescheduled, published, failed, cancelled |
| `previous_scheduled_for` | TIMESTAMPTZ | Previous time (for reschedules) |
| `new_scheduled_for` | TIMESTAMPTZ | New time |
| `actor_id` | UUID | Who made the change |
| `reason` | TEXT | Reason for change |

### `recurring_schedules`

For repeating content (e.g., weekly newsletters):

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `content_type` | TEXT | Type of content |
| `template_id` | UUID | Template content ID |
| `recurrence_rule` | TEXT | RRULE or cron expression |
| `timezone` | TEXT | Timezone for recurrence |
| `next_occurrence` | TIMESTAMPTZ | Next scheduled time |
| `status` | TEXT | active, paused, archived |

---

## Usage Examples

### Example 1: Schedule a Course Launch

```typescript
const response = await fetch('/api/schedule', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contentType: 'course',
    contentId: 'course-123',
    scheduledFor: '2026-03-01T09:00:00', // 9 AM local time
    timezone: 'America/New_York',
    autoPublish: true,
    publishAction: {
      sendNotification: true, // Email subscribers
    },
  }),
});

const schedule = await response.json();
```

### Example 2: Schedule Drip Content

```typescript
// Release lessons over 4 weeks
const lessons = ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4'];

lessons.forEach((lessonId, index) => {
  const releaseDate = new Date('2026-03-01');
  releaseDate.setDate(releaseDate.getDate() + (index * 7)); // +7 days each

  fetch('/api/schedule', {
    method: 'POST',
    body: JSON.stringify({
      contentType: 'lesson',
      contentId: lessonId,
      scheduledFor: releaseDate.toISOString().split('T')[0] + 'T08:00:00',
      timezone: 'America/Los_Angeles',
      autoPublish: true,
    }),
  });
});
```

### Example 3: Schedule Announcement

```typescript
await fetch('/api/schedule', {
  method: 'POST',
  body: JSON.stringify({
    contentType: 'announcement',
    contentId: 'announcement-456',
    scheduledFor: '2026-02-14T12:00:00',
    timezone: 'UTC',
    autoPublish: true,
  }),
});
```

### Example 4: Reschedule Content

```typescript
await fetch('/api/schedule/schedule-id', {
  method: 'PATCH',
  body: JSON.stringify({
    scheduledFor: '2026-02-15T14:00:00', // New time
    timezone: 'America/Chicago', // New timezone
  }),
});
```

---

## Testing

### Unit Tests

```bash
npm test -- __tests__/api/schedule.test.ts
```

Tests cover:
- ✅ Timezone conversion (toUTC, fromUTC)
- ✅ Timezone validation
- ✅ Future date checking
- ✅ Time until calculation
- ✅ Daylight saving time handling

### Manual Testing

1. **Schedule Content:**
   ```bash
   curl -X POST http://localhost:2828/api/schedule \
     -H "Content-Type: application/json" \
     -d '{
       "contentType": "course",
       "contentId": "test-course-id",
       "scheduledFor": "2026-02-10T15:00:00",
       "timezone": "America/New_York",
       "autoPublish": true
     }'
   ```

2. **Trigger Cron Manually:**
   ```bash
   curl -X GET http://localhost:2828/api/cron/publish-scheduled \
     -H "Authorization: Bearer your-cron-secret"
   ```

---

## Security

### Access Control

- ✅ Users can only schedule their own content
- ✅ Admins can schedule any content
- ✅ Cron endpoint requires secret token
- ✅ RLS policies enforce content ownership

### Best Practices

1. **Never expose CRON_SECRET** in client code
2. **Validate timezone** before accepting schedule requests
3. **Check content exists** before scheduling
4. **Verify ownership** before allowing schedule creation

---

## Troubleshooting

### Issue: Content not publishing at scheduled time

**Check:**
1. Is the cron job configured correctly in `vercel.json`?
2. Is `CRON_SECRET` set in environment variables?
3. Is the cron endpoint being called? (Check Vercel logs)
4. Is the scheduled time in the past?
5. Is `auto_publish` set to `true`?

### Issue: Wrong timezone

**Solution:**
- Always use IANA timezone names (e.g., `America/New_York`, not `EST`)
- Verify timezone with `isValidTimezone()` before scheduling
- Remember: `scheduled_for` is stored in UTC in the database

### Issue: Schedule creation fails

**Check:**
1. Does the content item exist?
2. Does the user have permission to schedule this content?
3. Is the content already scheduled? (unique constraint)
4. Is the scheduled time in the future?

---

## Future Enhancements

- [ ] Bulk scheduling UI
- [ ] Schedule templates
- [ ] More granular retry strategies
- [ ] Webhook notifications on publish
- [ ] Calendar view of scheduled content
- [ ] Time zone auto-detection
- [ ] Smart scheduling (best time to publish)

---

*Last Updated: February 8, 2026*
