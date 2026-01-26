# PRD: Meta Pixel & CAPI Integration for Portal28

**Status:** Active  
**Created:** 2026-01-25  
**Priority:** P1

## Overview

Implement Facebook Meta Pixel and Conversions API for Portal28 to optimize course enrollments and creator subscriptions.

## Standard Events Mapping

| Portal28 Event | Meta Standard Event | Parameters |
|----------------|---------------------|------------|
| `landing_view` | `PageView` | - |
| `course_preview` | `ViewContent` | `content_type: 'course'`, `content_ids` |
| `signup_complete` | `CompleteRegistration` | `content_name`, `status` |
| `course_created` | `AddToCart` | `content_type: 'course'` |
| `enrollment_completed` | `Purchase` | `value`, `currency`, `content_ids` |
| `checkout_started` | `InitiateCheckout` | `value`, `currency` |
| `subscription_started` | `Subscribe` | `value`, `currency`, `predicted_ltv` |
| `lesson_completed` | `ViewContent` | `content_type: 'lesson'` |

## Features

| ID | Name | Priority |
|----|------|----------|
| META-001 | Meta Pixel Installation | P1 |
| META-002 | PageView Tracking | P1 |
| META-003 | Standard Events Mapping | P1 |
| META-004 | CAPI Server-Side Events | P1 |
| META-005 | Event Deduplication | P1 |
| META-006 | User Data Hashing (PII) | P1 |
| META-007 | Custom Audiences Setup | P2 |
| META-008 | Conversion Optimization | P2 |
