# PRD: Portal28 Styling & CSS Design System

## Overview
A comprehensive design system for Portal28 Academy that ensures consistent styling across all pages, reusable components, and a cohesive brand identity.

## Brand Colors

### Primary Palette
| Name | Hex | Usage |
|------|-----|-------|
| Light | `#ECECEC` | Background, light surfaces |
| Beige | `#E2D2B1` | Muted backgrounds, accents |
| Green | `#547754` | Success states, CTAs |
| Blue | `#5674BF` | Primary actions, links |
| Purple Light | `#948CD3` | Secondary elements |
| Purple | `#554D91` | Accents, highlights |
| Purple Dark | `#362E59` | Sidebar, dark surfaces |
| Purple Darker | `#2C2849` | Dark mode background |

### Semantic Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#FFFFFF` | `#2C2849` | Page background |
| `--foreground` | `#0A0A0A` | `#FAFAFA` | Primary text |
| `--primary` | `#171717` | `#FAFAFA` | Primary buttons |
| `--secondary` | `#F5F5F5` | `#262626` | Secondary elements |
| `--muted` | `#F5F5F5` | `#262626` | Disabled states |
| `--accent` | `#F5F5F5` | `#262626` | Accent elements |
| `--destructive` | `#EF4444` | `#7F1D1D` | Error, delete actions |
| `--success` | `#547754` | `#547754` | Success states |

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale
| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-4xl` | 36px | 700 | Page titles |
| `text-3xl` | 30px | 600 | Section headers |
| `text-2xl` | 24px | 600 | Card titles |
| `text-xl` | 20px | 500 | Subheadings |
| `text-lg` | 18px | 400 | Large body text |
| `text-base` | 16px | 400 | Body text |
| `text-sm` | 14px | 400 | Secondary text |
| `text-xs` | 12px | 400 | Captions, labels |

## Spacing System

### Base Unit: 4px
| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Default gap |
| `space-3` | 12px | Medium gap |
| `space-4` | 16px | Section padding |
| `space-6` | 24px | Large padding |
| `space-8` | 32px | Section margins |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Hero sections |

## Component Library

### Existing shadcn/ui Components
Located in `components/ui/`:
- `accordion.tsx` - Expandable content sections
- `avatar.tsx` - User profile images
- `badge.tsx` - Status indicators
- `button.tsx` - Action buttons
- `card.tsx` - Content containers
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Context menus
- `input.tsx` - Text inputs
- `label.tsx` - Form labels
- `progress.tsx` - Progress bars
- `select.tsx` - Dropdown selects
- `separator.tsx` - Visual dividers
- `sheet.tsx` - Slide-out panels
- `slider.tsx` - Range inputs
- `switch.tsx` - Toggle switches
- `tabs.tsx` - Tab navigation
- `textarea.tsx` - Multi-line inputs
- `tooltip.tsx` - Hover tooltips

### Custom Components Needed

#### 1. PageHeader
```tsx
// Consistent page title styling across all pages
<PageHeader 
  title="Courses"
  description="Manage your course content"
  actions={<Button>Create Course</Button>}
/>
```

#### 2. DataTable
```tsx
// Reusable table with sorting, filtering, pagination
<DataTable 
  columns={columns}
  data={data}
  searchKey="name"
  pagination
/>
```

#### 3. StatCard
```tsx
// Dashboard statistics display
<StatCard
  title="Total Students"
  value={1234}
  change="+12%"
  icon={Users}
/>
```

#### 4. EmptyState
```tsx
// Consistent empty state messaging
<EmptyState
  icon={FileX}
  title="No courses yet"
  description="Create your first course to get started"
  action={<Button>Create Course</Button>}
/>
```

#### 5. LoadingState
```tsx
// Consistent loading indicators
<LoadingState text="Loading courses..." />
```

## Page Layouts

### Public Pages
```
┌─────────────────────────────────────────┐
│ Navbar                                  │
├─────────────────────────────────────────┤
│                                         │
│ Hero Section (home only)                │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ Main Content                            │
│ - max-width: 1400px                     │
│ - padding: 2rem                         │
│                                         │
├─────────────────────────────────────────┤
│ Footer                                  │
└─────────────────────────────────────────┘
```

### App Pages (Authenticated)
```
┌──────┬──────────────────────────────────┐
│      │ Topbar                           │
│ Side │──────────────────────────────────│
│ bar  │                                  │
│      │ Page Content                     │
│ 240px│ - padding: 24px                  │
│      │                                  │
└──────┴──────────────────────────────────┘
```

### Admin Pages
```
┌──────┬──────────────────────────────────┐
│      │ Admin Header                     │
│ Side │──────────────────────────────────│
│ bar  │ Breadcrumbs                      │
│      │──────────────────────────────────│
│ 280px│ Page Title + Actions             │
│      │──────────────────────────────────│
│      │ Content Area                     │
│      │ - Cards, Tables, Forms           │
└──────┴──────────────────────────────────┘
```

## Page-Specific Styling

### 1. Home Page (`/`)
- [ ] Hero section with gradient background
- [ ] Feature cards with hover effects
- [ ] Testimonials carousel
- [ ] CTA sections with brand colors

### 2. Courses Page (`/courses`)
- [ ] Course grid with responsive columns
- [ ] Course cards with image, title, description
- [ ] Filter/search functionality
- [ ] Pricing badges

### 3. Login/Signup Pages
- [ ] Centered form layout
- [ ] Brand logo at top
- [ ] Social login buttons (if applicable)
- [ ] Error message styling

### 4. App Dashboard (`/app`)
- [ ] Welcome message with user name
- [ ] Progress overview cards
- [ ] Recent activity feed
- [ ] Quick action buttons

### 5. Admin Dashboard (`/admin`)
- [ ] Key metrics overview
- [ ] Recent activity log
- [ ] Quick actions grid
- [ ] System status indicators

### 6. Course Player (`/app/courses/[id]/lessons/[lessonId]`)
- [ ] Video player (full width)
- [ ] Lesson navigation sidebar
- [ ] Notes panel
- [ ] Progress indicator

## Reusable Style Patterns

### 1. Card Styles
```css
.card-base {
  @apply rounded-lg border bg-card text-card-foreground shadow-sm;
}

.card-hover {
  @apply transition-shadow hover:shadow-md;
}

.card-interactive {
  @apply cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg;
}
```

### 2. Button Variants
```css
.btn-primary {
  @apply bg-brand-blue text-white hover:bg-brand-blue/90;
}

.btn-secondary {
  @apply bg-brand-purple-light text-white hover:bg-brand-purple;
}

.btn-success {
  @apply bg-brand-green text-white hover:bg-brand-green/90;
}

.btn-ghost {
  @apply hover:bg-accent hover:text-accent-foreground;
}
```

### 3. Form Styles
```css
.form-group {
  @apply space-y-2;
}

.form-label {
  @apply text-sm font-medium leading-none;
}

.form-input {
  @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm;
}

.form-error {
  @apply text-sm text-destructive;
}
```

### 4. Section Styles
```css
.section-header {
  @apply flex items-center justify-between mb-6;
}

.section-title {
  @apply text-2xl font-semibold tracking-tight;
}

.section-description {
  @apply text-sm text-muted-foreground;
}
```

## Animation & Transitions

### Standard Transitions
```css
transition-colors: 150ms
transition-opacity: 200ms
transition-transform: 200ms
transition-shadow: 200ms
```

### Entrance Animations
```css
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

.scale-in {
  animation: scaleIn 0.2s ease-out;
}
```

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

## Dark Mode

Automatically switches based on user preference:
```tsx
// In layout.tsx
<html className="dark">
```

All components should use CSS variables that adapt:
```css
bg-background    /* White in light, #2C2849 in dark */
text-foreground  /* Black in light, white in dark */
border-border    /* Light gray in light, dark gray in dark */
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Audit existing components for consistency
- [ ] Update `globals.css` with brand color variables
- [ ] Create shared style utilities in `@/lib/styles.ts`
- [ ] Implement PageHeader component
- [ ] Implement EmptyState component
- [ ] Implement LoadingState component

### Phase 2: Public Pages (Week 2)
- [ ] Redesign Home page hero
- [ ] Style Courses listing page
- [ ] Update Login/Signup forms
- [ ] Style About, FAQ, Privacy, Terms pages
- [ ] Add consistent footer

### Phase 3: App Pages (Week 3)
- [ ] Style App dashboard
- [ ] Style course player
- [ ] Style community pages
- [ ] Style profile settings
- [ ] Add progress visualizations

### Phase 4: Admin Pages (Week 4)
- [ ] Style Admin dashboard
- [ ] Create DataTable component
- [ ] Style all admin CRUD pages
- [ ] Add charts/analytics styling
- [ ] Style moderation tools

### Phase 5: Polish (Week 5)
- [ ] Add micro-animations
- [ ] Test dark mode consistency
- [ ] Responsive testing all pages
- [ ] Performance optimization
- [ ] A11y audit and fixes

## Files to Create/Update

### New Files
- `lib/styles.ts` - Shared style utilities
- `components/ui/page-header.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/loading-state.tsx`
- `components/ui/stat-card.tsx`
- `components/ui/data-table.tsx`

### Files to Update
- `app/globals.css` - Add custom utilities
- `tailwind.config.ts` - Extend theme
- All page components - Apply consistent styling

## Success Metrics
1. All pages use brand colors consistently
2. No inline styles - all via Tailwind/CSS variables
3. Components are reusable across pages
4. Dark mode works on all pages
5. Mobile responsive on all pages
6. Lighthouse accessibility score > 90
