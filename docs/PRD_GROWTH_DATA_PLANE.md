# PRD: Growth Data Plane for Portal28

**Status:** Active  
**Created:** 2026-01-25  
**Priority:** P0  
**Reference:** `autonomous-coding-dashboard/harness/prompts/PRD_GROWTH_DATA_PLANE.md`

## Overview

Implement the Growth Data Plane for Portal28: unified event tracking for course creation and enrollment funnels.

## Portal28-Specific Events

| Event | Source | Segment Trigger |
|-------|--------|-----------------|
| `landing_view` | web | - |
| `course_preview` | web | warm_lead |
| `signup_completed` | web | new_signup |
| `course_created` | app | creator_activated |
| `lesson_added` | app | - |
| `course_published` | app | creator_first_value |
| `enrollment_completed` | app | student_activated |
| `lesson_completed` | app | - |
| `certificate_issued` | app | student_aha |
| `checkout_started` | web | checkout_started |
| `subscription_started` | stripe | - |
| `course_sold` | stripe | creator_monetized |
| `email.clicked` | resend | newsletter_clicker |

## Segments for Portal28

### Creator Funnel
1. **creator_signup_no_course_72h** → email: "Create your first course"
2. **course_created_no_lessons_48h** → email: "Add your first lesson"
3. **course_ready_not_published** → email: "Your course is ready to launch"
4. **published_no_sales_7d** → email: "Marketing tips for your course"

### Student Funnel
1. **enrolled_no_progress_48h** → email: "Start your first lesson"
2. **lesson_streak_broken** → email: "Keep your learning streak"
3. **course_completed** → email: "Explore more courses"

## Features

| ID | Name | Priority |
|----|------|----------|
| GDP-001 | Supabase Schema Setup | P0 |
| GDP-002 | Person & Identity Tables | P0 |
| GDP-003 | Unified Events Table | P0 |
| GDP-004 | Resend Webhook Edge Function | P0 |
| GDP-005 | Email Event Tracking | P0 |
| GDP-006 | Click Redirect Tracker | P1 |
| GDP-007 | Stripe Webhook Integration | P1 |
| GDP-008 | Subscription Snapshot | P1 |
| GDP-009 | PostHog Identity Stitching | P1 |
| GDP-010 | Meta Pixel + CAPI Dedup | P1 |
| GDP-011 | Person Features Computation | P1 |
| GDP-012 | Segment Engine | P1 |
