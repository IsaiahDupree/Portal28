# PRD: Event Tracking System for Portal28

**Status:** Active  
**Created:** 2026-01-25  
**Based On:** BlankLogo Event Tracking Pattern

## Overview

Implement sophisticated user event tracking for Portal28 to optimize the course creation and enrollment funnels.

## Event Categories

| Category | Events |
|----------|--------|
| **Acquisition** | `landing_view`, `cta_click`, `pricing_view`, `course_preview` |
| **Activation** | `signup_start`, `login_success`, `activation_complete`, `first_course_created` |
| **Core Value** | `course_created`, `lesson_added`, `course_published`, `enrollment_completed`, `lesson_completed`, `certificate_issued` |
| **Monetization** | `checkout_started`, `purchase_completed`, `subscription_started`, `course_sold` |
| **Retention** | `return_session`, `lesson_streak`, `course_completion_rate` |
| **Reliability** | `error_shown`, `video_upload_failed`, `enrollment_failed` |

## Core Value Event Properties

### course_created
```json
{
  "course_id": "string",
  "title": "string",
  "lesson_count": "number",
  "category": "string"
}
```

### enrollment_completed
```json
{
  "course_id": "string",
  "student_id": "string",
  "price": "number",
  "coupon_used": "string"
}
```

## 4 North Star Milestones

1. **Activated** = `first_course_created` (instructor) or `first_enrollment` (student)
2. **First Value** = first `course_published` or `lesson_completed`
3. **Aha Moment** = first `certificate_issued` or `course_sold`
4. **Monetized** = `purchase_completed`

## Features

| ID | Name | Priority |
|----|------|----------|
| TRACK-001 | Tracking SDK Integration | P1 |
| TRACK-002 | Acquisition Event Tracking | P1 |
| TRACK-003 | Activation Event Tracking | P1 |
| TRACK-004 | Core Value Event Tracking | P1 |
| TRACK-005 | Monetization Event Tracking | P1 |
| TRACK-006 | Retention Event Tracking | P2 |
| TRACK-007 | Error & Performance Tracking | P2 |
| TRACK-008 | User Identification | P1 |
