# Accessibility Testing Guide

**Created:** February 8, 2026
**Purpose:** Guide for ensuring WCAG 2.1 AA compliance

---

## Overview

Portal28 Academy aims to meet **WCAG 2.1 Level AA** compliance standards to ensure the platform is accessible to all users, including those using assistive technologies.

## Testing Infrastructure

### Automated Testing Tools

- **@axe-core/playwright** - Automated accessibility testing integrated into E2E tests
- **Playwright** - Browser automation for keyboard navigation and manual checks
- **ESLint** - Static analysis for JSX accessibility issues (eslint-plugin-jsx-a11y)

### Manual Testing Tools

- **Chrome DevTools Lighthouse** - Accessibility audit
- **WAVE Browser Extension** - Visual accessibility evaluation
- **axe DevTools Browser Extension** - Detailed violation reporting
- **Screen Readers:**
  - **macOS:** VoiceOver (⌘+F5)
  - **Windows:** NVDA (free), JAWS (commercial)
  - **Linux:** Orca

---

## Running Accessibility Tests

### Automated Tests

```bash
# Run all accessibility tests
npm run test:a11y

# Run with HTML report
npm run test:a11y:report

# Run specific test file
npx playwright test e2e/accessibility.spec.ts

# Run in headed mode (watch tests execute)
npx playwright test e2e/accessibility.spec.ts --headed
```

### Viewing Results

```bash
# Display logged accessibility issues
node scripts/log-a11y-issues.js show

# Demo of issue logging
node scripts/log-a11y-issues.js demo
```

---

## Test Coverage

### A11Y-001: Keyboard Navigation
- ✅ All interactive elements accessible via Tab/Shift+Tab
- ✅ Enter/Space activate buttons and links
- ✅ Escape closes modals
- ✅ Arrow keys navigate lists and menus
- ✅ Focus trap in modals

### A11Y-002: Screen Reader Compatibility
- ✅ Automated axe-core scans (WCAG 2.1 AA tags)
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ ARIA labels on interactive elements
- ✅ Semantic HTML landmarks (nav, main, footer)
- ✅ Role attributes where appropriate

### A11Y-003: Color Contrast Ratios
- ✅ Automated color contrast checks via axe-core
- ✅ Text contrast ≥ 4.5:1 (normal text)
- ✅ Text contrast ≥ 3:1 (large text ≥ 18pt/24px)
- ✅ UI component contrast ≥ 3:1

### A11Y-004: Focus Indicators
- ✅ Visible focus indicators on all interactive elements
- ✅ Focus ring or outline present
- ✅ Focus styles not removed with `outline: none` without alternative

### A11Y-005: Alt Text for Images
- ✅ All images have alt attribute
- ✅ Content images have descriptive alt text
- ✅ Decorative images use `alt=""` or `role="presentation"`

### A11Y-006: Form Label Associations
- ✅ All inputs have associated labels
- ✅ Labels linked via `for` attribute or wrapping
- ✅ ARIA labels where visual labels not present
- ✅ Select dropdowns have labels

### A11Y-007: Error Message Announcements
- ✅ Error messages associated with form fields (`aria-describedby`)
- ✅ `aria-invalid="true"` on invalid inputs
- ✅ `role="alert"` for critical errors
- ✅ Error announcements for screen readers

---

## WCAG 2.1 Compliance Checklist

### Level A (Must Have)

- [x] Keyboard access to all functionality
- [x] Text alternatives for non-text content
- [x] Sufficient color contrast (minimum)
- [x] Form labels and instructions
- [x] Error identification
- [x] Page titles
- [x] Focus order
- [x] Link purpose from context
- [x] Heading hierarchy
- [x] Language of page

### Level AA (Target)

- [x] Color contrast enhancement (4.5:1 for text)
- [x] Resize text up to 200%
- [x] Multiple ways to navigate
- [x] Consistent navigation
- [x] Visible focus indicator
- [x] Error suggestions
- [x] Labels or instructions for input
- [x] Status messages

---

## Development Guidelines

### 1. Semantic HTML

Use semantic HTML elements instead of generic divs:

```jsx
// ❌ Bad
<div className="navigation">
  <div onClick={handleClick}>Home</div>
</div>

// ✅ Good
<nav>
  <a href="/">Home</a>
</nav>
```

### 2. Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```jsx
// ❌ Bad - div not keyboard accessible
<div onClick={handleClick}>Click me</div>

// ✅ Good - button is keyboard accessible
<button onClick={handleClick}>Click me</button>

// ✅ Good - custom element with keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

### 3. ARIA Labels

Provide accessible names for elements:

```jsx
// Icon-only buttons need labels
<button aria-label="Close dialog">
  <XIcon />
</button>

// Images need alt text
<img src="logo.png" alt="Portal28 Academy" />

// Form inputs need labels
<label htmlFor="email">Email</label>
<input id="email" type="email" name="email" />
```

### 4. Focus Management

Manage focus in dynamic content:

```jsx
function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus first element in modal
      modalRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div role="dialog" aria-modal="true" ref={modalRef} tabIndex={-1}>
      {/* Modal content */}
    </div>
  );
}
```

### 5. Error Handling

Associate errors with form fields:

```jsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

---

## Common Accessibility Issues

### Issue 1: Missing Alt Text

**Problem:** Images without alt attributes
**Solution:**
```jsx
// Decorative images
<img src="decoration.png" alt="" />

// Content images
<img src="course.jpg" alt="Introduction to React course thumbnail" />
```

### Issue 2: Poor Color Contrast

**Problem:** Text doesn't meet 4.5:1 contrast ratio
**Solution:** Use a color contrast checker (e.g., WebAIM Contrast Checker)
```css
/* ❌ Bad - contrast ratio 3.2:1 */
.text {
  color: #888;
  background: #fff;
}

/* ✅ Good - contrast ratio 7:1 */
.text {
  color: #555;
  background: #fff;
}
```

### Issue 3: Keyboard Trap

**Problem:** Users can't escape modal with keyboard
**Solution:**
```jsx
<Modal onClose={handleClose}>
  <button onClick={handleClose}>Close (or press Escape)</button>
  {/* Listen for Escape key */}
  <div onKeyDown={(e) => e.key === 'Escape' && handleClose()}>
    {/* Modal content */}
  </div>
</Modal>
```

### Issue 4: Missing Form Labels

**Problem:** Input fields without labels
**Solution:**
```jsx
// ✅ Visible label
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// ✅ Visual label with aria-label
<input type="text" aria-label="Search courses" placeholder="Search..." />
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:a11y
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: playwright-report/
```

---

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Deque University](https://dequeuniversity.com/rules/axe/)

### Testing Tools
- [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Screen Readers
- [NVDA (Windows, Free)](https://www.nvaccess.org/)
- [JAWS (Windows, Commercial)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS, Built-in)](https://www.apple.com/accessibility/mac/vision/)

### Courses & Training
- [Web Accessibility by Google (Udacity)](https://www.udacity.com/course/web-accessibility--ud891)
- [Accessibility Fundamentals (Deque)](https://dequeuniversity.com/)

---

## Testing Schedule

### During Development
- Run `npm run test:a11y` before committing
- Manual keyboard testing for new features
- Check focus indicators in browser

### Before Deployment
- Full accessibility test suite
- Manual screen reader testing
- Review logged issues

### Monthly Review
- Audit new pages/features
- Update accessibility documentation
- Train team on new patterns

---

## Reporting Issues

When you find an accessibility issue:

1. **Document the issue:**
   - What element/page is affected?
   - What WCAG criterion does it violate?
   - What's the impact (critical/serious/moderate/minor)?

2. **Create a fix:**
   - Follow WCAG guidelines
   - Test with keyboard and screen reader
   - Verify automated tests pass

3. **Verify the fix:**
   - Run `npm run test:a11y`
   - Manual testing
   - Check that issue is resolved

---

*Last Updated: February 8, 2026*
