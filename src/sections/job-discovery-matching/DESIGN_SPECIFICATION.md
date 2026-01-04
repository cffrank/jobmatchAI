# Premium Job Discovery - Visual Design Specification

This document details the exact visual design specifications for all premium components, ensuring consistency and high-quality implementation.

---

## Color System

### Match Score Color Gradients

**High Match (70%+) - Emerald**
```
Background: from-emerald-50 to-emerald-50 (light) / from-emerald-950/30 to-emerald-950/30 (dark)
Text: text-emerald-600 (light) / text-emerald-400 (dark)
Border: border-emerald-200 (light) / border-emerald-800 (dark)
Gradient: from-emerald-500 to-emerald-600
```

**Medium Match (50-69%) - Amber**
```
Background: from-amber-50 to-amber-50 (light) / from-amber-950/30 to-amber-950/30 (dark)
Text: text-amber-600 (light) / text-amber-400 (dark)
Border: border-amber-200 (light) / border-amber-800 (dark)
Gradient: from-amber-500 to-amber-600
```

**Low Match (<50%) - Red**
```
Background: from-red-50 to-red-50 (light) / from-red-950/30 to-red-950/30 (dark)
Text: text-red-600 (light) / text-red-400 (dark)
Border: border-red-200 (light) / border-red-800 (dark)
Gradient: from-red-500 to-red-600
```

### Feedback Type Colors

**Interested - Emerald**
```
Button Hover: bg-emerald-50 dark:bg-emerald-950/30
Border Hover: border-emerald-300 dark:border-emerald-700
Icon Color: text-emerald-600 dark:text-emerald-400
Shadow: shadow-emerald-500/10
```

**Not Interested - Amber**
```
Button Hover: bg-amber-50 dark:bg-amber-950/30
Border Hover: border-amber-300 dark:border-amber-700
Icon Color: text-amber-600 dark:text-amber-400
Shadow: shadow-amber-500/10
```

**Spam - Red**
```
Button Hover: bg-red-50 dark:bg-red-950/30
Border Hover: border-red-300 dark:border-red-700
Icon Color: text-red-600 dark:text-red-400
Shadow: shadow-red-500/10
```

### Primary Actions

**Primary CTA - Blue Gradient**
```
Background: bg-gradient-to-r from-blue-600 to-blue-700
Hover: from-blue-700 to-blue-800
Text: text-white
Shadow: shadow-lg hover:shadow-xl
Border: border-blue-600 (when needed)
```

**Secondary Action - Slate**
```
Background: bg-slate-100 dark:bg-slate-700
Hover: bg-slate-200 dark:bg-slate-600
Text: text-slate-700 dark:text-slate-300
Border: border-slate-200 dark:border-slate-700
```

### Neutral Elements

**Card Background**
```
Background: bg-white dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Shadow: shadow-sm (rest) → shadow-xl (hover)
```

**Panel Background**
```
Background: bg-slate-50 dark:bg-slate-900
Border: border-slate-200 dark:border-slate-700
```

---

## Typography

### Headings

**Page Title (H1)**
```
Size: text-3xl sm:text-4xl (48px on desktop)
Weight: font-bold (700)
Color: text-slate-900 dark:text-slate-50
Tracking: tracking-tight (-0.025em)
Line Height: leading-tight (1.25)
```

**Section Title (H2)**
```
Size: text-xl sm:text-2xl (24px on desktop)
Weight: font-bold (700)
Color: text-slate-900 dark:text-slate-50
Margin: mb-6 (24px below)
```

**Card Title (H3)**
```
Size: text-xl (20px)
Weight: font-bold (700)
Color: text-slate-900 dark:text-slate-50
Hover: text-blue-600 dark:text-blue-400
Transition: transition-colors duration-200
```

**Subsection Title**
```
Size: text-sm (14px)
Weight: font-bold (700)
Color: text-slate-900 dark:text-slate-50
Transform: uppercase
Tracking: tracking-wide (0.025em)
```

### Body Text

**Primary Body**
```
Size: text-base (16px)
Weight: font-medium (500)
Color: text-slate-700 dark:text-slate-300
Line Height: leading-relaxed (1.625)
```

**Secondary Body**
```
Size: text-sm (14px)
Weight: font-medium (500)
Color: text-slate-600 dark:text-slate-400
Line Height: leading-normal (1.5)
```

**Caption/Label**
```
Size: text-xs (12px)
Weight: font-semibold (600)
Color: text-slate-500 dark:text-slate-400
Transform: uppercase (for labels)
Tracking: tracking-wide (0.025em)
```

---

## Spacing System

### Card Padding
```
Internal: p-6 (24px all sides)
Sections: space-y-4 (16px between sections)
Elements: gap-3 (12px between elements)
```

### Layout Spacing
```
Page Container: px-4 sm:px-6 lg:px-8 (responsive)
Vertical Rhythm: py-8 (32px top/bottom)
Section Gaps: mb-8 (32px between sections)
```

### Component Spacing
```
Button Internal: px-4 py-2.5 (16px horizontal, 10px vertical)
Badge Internal: px-3 py-1.5 (12px horizontal, 6px vertical)
Input Internal: px-3 py-2.5 (12px horizontal, 10px vertical)
```

---

## Border Radius

### Component Corners
```
Large Cards: rounded-2xl (16px)
Small Cards: rounded-xl (12px)
Buttons: rounded-lg (8px)
Badges: rounded-lg (8px)
Inputs: rounded-lg (8px)
Pills: rounded-full (9999px)
```

---

## Shadow System

### Elevation Levels

**Level 1 - Rest State**
```
Class: shadow-sm
CSS: 0 1px 2px 0 rgb(0 0 0 / 0.05)
Usage: Cards at rest, subtle elevation
```

**Level 2 - Hover State**
```
Class: shadow-md
CSS: 0 4px 6px -1px rgb(0 0 0 / 0.1)
Usage: Buttons on hover, interactive cards
```

**Level 3 - Active/Selected**
```
Class: shadow-lg
CSS: 0 10px 15px -3px rgb(0 0 0 / 0.1)
Usage: Active buttons, selected items
```

**Level 4 - Modal/Overlay**
```
Class: shadow-xl
CSS: 0 20px 25px -5px rgb(0 0 0 / 0.1)
Usage: Modals, dropdown menus, tooltips
```

**Level 5 - Maximum Elevation**
```
Class: shadow-2xl
CSS: 0 25px 50px -12px rgb(0 0 0 / 0.25)
Usage: Important modals, critical alerts
```

### Colored Shadows

**Blue Glow (Primary Actions)**
```
Class: shadow-blue-500/10
Usage: Primary buttons on hover
```

**Emerald Glow (Success States)**
```
Class: shadow-emerald-500/10
Usage: Success confirmations, high match scores
```

---

## Animation Specifications

### Timing Functions

**Ease Out (Entrances)**
```
Curve: cubic-bezier(0.16, 1, 0.3, 1)
Usage: Elements entering the screen
Example: Modal slide-in, tooltip appear
```

**Ease In-Out (Transitions)**
```
Curve: cubic-bezier(0.4, 0, 0.2, 1)
Usage: State changes, hover effects
Example: Color transitions, scale transforms
```

**Linear (Progress)**
```
Curve: linear
Usage: Progress bars, loading indicators
Example: Match quality bar animation
```

### Duration Standards

**Micro-interactions (Fast)**
```
Duration: 150-200ms
Usage: Hover effects, icon changes, color transitions
Examples:
- Button hover: transition-all duration-200
- Icon color change: transition-colors duration-200
```

**UI Transitions (Medium)**
```
Duration: 300-400ms
Usage: Panel slides, modal opens/closes
Examples:
- Filter panel expand: duration-300
- Dropdown menu slide: duration-300
```

**Progress Animations (Slow)**
```
Duration: 500-1000ms
Usage: Progress bars, score reveals
Examples:
- Match quality bar fill: duration-1000
- Statistics counter animation: duration-700
```

### Transform Specifications

**Hover Lift**
```
Transform: hover:-translate-y-1
Duration: duration-300
Easing: ease-out
```

**Scale Grow**
```
Transform: hover:scale-[1.02]
Duration: duration-200
Easing: ease-out
```

**Scale Shrink (Active)**
```
Transform: active:scale-[0.98]
Duration: duration-100
Easing: ease-in
```

### Custom Animations

**Shimmer Effect**
```
Animation: animate-shimmer
Keyframes:
  0%: translateX(-100%)
  100%: translateX(100%)
Duration: 2s infinite
Usage: Premium card hover overlays
```

**Slide In From Top**
```
Animation: animate-slide-in-from-top
Keyframes:
  0%: translateY(-10px) opacity(0)
  100%: translateY(0) opacity(1)
Duration: 200ms ease-out
Usage: Filter panels, dropdown menus
```

**Slide In From Bottom**
```
Animation: animate-slide-in-from-bottom
Keyframes:
  0%: translateY(10px) opacity(0)
  100%: translateY(0) opacity(1)
Duration: 200ms ease-out
Usage: Modals, tooltips
```

**Fade In**
```
Animation: animate-fade-in
Keyframes:
  0%: opacity(0)
  100%: opacity(1)
Duration: 200ms ease-out
Usage: Content reveals, conditional elements
```

---

## Interactive States

### Button States

**Rest**
```
Background: base color
Border: base border
Shadow: shadow-sm
Scale: scale-100
```

**Hover**
```
Background: darker shade
Border: accent color (if applicable)
Shadow: shadow-md → shadow-lg
Scale: scale-[1.02]
Cursor: cursor-pointer
```

**Active**
```
Background: darkest shade
Shadow: shadow-sm (reduced)
Scale: scale-[0.98]
```

**Disabled**
```
Background: bg-slate-300 dark:bg-slate-700
Text: text-slate-500 dark:text-slate-400
Cursor: cursor-not-allowed
Opacity: opacity-60
```

**Focus (Keyboard)**
```
Outline: focus:outline-none
Ring: focus:ring-2 focus:ring-blue-500
Border: focus:border-transparent
```

### Input States

**Rest**
```
Background: bg-slate-50 dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Text: text-slate-900 dark:text-slate-50
```

**Focus**
```
Outline: focus:outline-none
Ring: focus:ring-2 focus:ring-blue-500
Border: focus:border-transparent
```

**Error**
```
Border: border-red-300 dark:border-red-700
Ring: focus:ring-red-500
Background: bg-red-50 dark:bg-red-950/20
```

**Success**
```
Border: border-emerald-300 dark:border-emerald-700
Ring: focus:ring-emerald-500
Background: bg-emerald-50 dark:bg-emerald-950/20
```

---

## Component-Specific Specs

### JobFeedbackWidget

**Feedback Buttons**
```
Size: p-2.5 (40x40px clickable area)
Border Radius: rounded-xl (12px)
Background: bg-slate-50 dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Icon Size: w-4 h-4 (16px)

Hover States:
- Thumbs Up: bg-emerald-50 border-emerald-300
- Thumbs Down: bg-amber-50 border-amber-300
- Spam Flag: bg-red-50 border-red-300
```

**Reason Selector Modal**
```
Width: w-80 (320px)
Position: absolute bottom-full right-0
Offset: mb-2 (8px from trigger)
Background: bg-white dark:bg-slate-900
Border: border-slate-200 dark:border-slate-700
Border Radius: rounded-2xl (16px)
Shadow: shadow-2xl shadow-slate-900/10
Padding: p-5 (20px)
Z-Index: z-50
Animation: animate-slide-in-from-bottom
```

**Reason Options**
```
Width: w-full
Padding: px-3 py-2.5 (12px horizontal, 10px vertical)
Border Radius: rounded-lg (8px)
Border Width: border-2
Gap: gap-3 (12px between icon and text)

Selected State:
- Border: border-blue-500
- Background: bg-blue-50 dark:bg-blue-950/30
- Text: text-blue-700 dark:text-blue-300

Unselected State:
- Border: border-slate-200 dark:border-slate-700
- Background: bg-slate-50 dark:bg-slate-800
- Hover: border-slate-300 dark:border-slate-600
```

### EnhancedJobCard

**Card Container**
```
Background: bg-white dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Border Radius: rounded-2xl (16px)
Padding: p-6 (24px)
Shadow (rest): shadow-sm
Shadow (hover): shadow-2xl shadow-blue-500/10
Border (hover): border-blue-300 dark:border-blue-700
Transform (hover): -translate-y-1
Transition: transition-all duration-300
Cursor: cursor-pointer
```

**Match Score Badge**
```
Position: absolute -top-3 -right-3
Padding: px-4 py-2 (16px horizontal, 8px vertical)
Border Radius: rounded-xl (12px)
Border Width: border-2
Font: text-sm font-bold
Shadow: shadow-lg
Backdrop: backdrop-blur-sm
Icon: w-4 h-4 (16px Sparkles)
Gap: gap-1.5 (6px between icon and text)

Label Below:
- Position: absolute -bottom-6 left-1/2 -translate-x-1/2
- Font: text-xs font-semibold
- Opacity: opacity-90
- White Space: whitespace-nowrap
```

**Match Quality Progress Bar**
```
Container:
- Height: h-2 (8px)
- Background: bg-slate-200 dark:bg-slate-700
- Border Radius: rounded-full
- Overflow: overflow-hidden

Progress Fill:
- Height: h-full (100%)
- Background: bg-gradient-to-r {gradient}
- Border Radius: rounded-full
- Transition: transition-all duration-1000 ease-out
- Shadow: shadow-lg
```

**Match Reasoning Cards**
```
Padding: p-2.5 (10px)
Border Radius: rounded-lg (8px)
Border Width: border
Gap: gap-2 (8px between icon and content)

Strengths:
- Background: bg-emerald-50 dark:bg-emerald-950/20
- Border: border-emerald-200 dark:border-emerald-800
- Icon: CheckCircle2 w-4 h-4 text-emerald-600

Concerns:
- Background: bg-amber-50 dark:bg-amber-950/20
- Border: border-amber-200 dark:border-amber-800
- Icon: AlertCircle w-4 h-4 text-amber-600
```

**Skill Badges**
```
Padding: px-3 py-1.5 (12px horizontal, 6px vertical)
Border Radius: rounded-lg (8px)
Font: text-xs font-semibold
Border Width: border
Shadow: shadow-sm

Matched:
- Background: bg-emerald-50 dark:bg-emerald-950/30
- Text: text-emerald-700 dark:text-emerald-400
- Border: border-emerald-200 dark:border-emerald-800

Missing:
- Background: bg-amber-50 dark:bg-amber-950/30
- Text: text-amber-700 dark:text-amber-400
- Border: border-amber-200 dark:border-amber-800
```

### FeedbackFilterControls

**Filter Toggle Button**
```
Padding: px-4 py-2.5 (16px horizontal, 10px vertical)
Border Radius: rounded-xl (12px)
Font: font-semibold
Shadow: shadow-sm hover:shadow-md
Gap: gap-2 (8px between icon and text)

Active State:
- Background: bg-blue-600
- Text: text-white
- Border: border-blue-600

Inactive State:
- Background: bg-white dark:bg-slate-800
- Text: text-slate-700 dark:text-slate-300
- Border: border-slate-200 dark:border-slate-700
- Hover Border: border-blue-300 dark:border-blue-700
```

**Active Filter Badge**
```
Padding: px-2 py-0.5 (8px horizontal, 2px vertical)
Background: bg-white/20
Font: text-xs font-bold
Border Radius: rounded-full
```

**Filter Panel**
```
Background: bg-white dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Border Radius: rounded-2xl (16px)
Padding: p-6 (24px)
Shadow: shadow-xl
Animation: animate-slide-in-from-top
Spacing: space-y-6 (24px between sections)
```

**Match Score Slider**
```
Height: h-2 (8px)
Width: w-full
Background: bg-slate-200 dark:bg-slate-700
Border Radius: rounded-lg (8px)
Accent Color: accent-blue-600
Appearance: appearance-none
Cursor: cursor-pointer
```

### FeedbackDashboard

**Stat Cards**
```
Background: bg-white dark:bg-slate-800
Border: border-slate-200 dark:border-slate-700
Border Radius: rounded-2xl (16px)
Padding: p-6 (24px)
Shadow: shadow-lg hover:shadow-xl
Transition: transition-shadow duration-200

Icon Container:
- Size: w-12 h-12 (48px square)
- Border Radius: rounded-xl (12px)
- Background: bg-gradient-to-br {gradient}
- Shadow: shadow-lg
- Content: Icon w-6 h-6 text-white

Value:
- Font: text-3xl font-bold
- Color: text-slate-900 dark:text-slate-50
- Margin: mb-1 (4px below)

Label:
- Font: text-sm font-medium
- Color: text-slate-600 dark:text-slate-400
```

**Progress Bars (Reason Chart)**
```
Container Height: h-2 (8px)
Background: bg-slate-200 dark:bg-slate-700
Border Radius: rounded-full
Overflow: overflow-hidden

Fill:
- Height: h-full
- Background: bg-gradient-to-r from-amber-500 to-amber-600
- Border Radius: rounded-full
- Transition: transition-all duration-500
```

**Feedback List Items**
```
Padding: px-6 py-4 (24px horizontal, 16px vertical)
Border Bottom: border-b border-slate-200 dark:border-slate-700
Hover: bg-slate-50 dark:bg-slate-700/50
Transition: transition-colors
Gap: gap-4 (16px between elements)
```

---

## Responsive Breakpoints

### Mobile First Approach

**Base (Mobile)**
```
Max Width: 640px
Font Size: Base sizes (text-base, text-sm, etc.)
Padding: px-4 (16px)
```

**Small (sm)**
```
Min Width: 640px
Font Size: Slightly larger (text-lg → text-xl)
Padding: sm:px-6 (24px)
```

**Medium (md)**
```
Min Width: 768px
Grid Columns: 2-column layouts
Spacing: Increased gaps
```

**Large (lg)**
```
Min Width: 1024px
Font Size: Max sizes (text-3xl → text-4xl)
Padding: lg:px-8 (32px)
Grid Columns: 3-4 column layouts
```

---

## Dark Mode Strategy

### Implementation
```
Dark mode class on root element: <html class="dark">
All colors have dark: variants specified
Use semantic color names (slate, not specific hex)
```

### Testing Dark Mode
```
Light mode: Default
Dark mode: Toggle via system preference or app setting
Both modes must maintain WCAG AA contrast ratios
```

---

## Accessibility Standards

### Color Contrast
- **Normal Text:** Minimum 4.5:1 (WCAG AA)
- **Large Text:** Minimum 3:1 (WCAG AA)
- **UI Components:** Minimum 3:1 (WCAG AA)

### Focus Indicators
```
Visible focus ring on all interactive elements
Ring width: ring-2 (2px)
Ring color: ring-blue-500
Offset: offset from element border
```

### Keyboard Navigation
```
Tab order follows visual flow
Enter activates buttons
Escape closes modals
Arrow keys navigate lists
```

### Screen Reader Support
```
Semantic HTML (button, input, label, etc.)
ARIA labels where needed
Alt text for all images
Proper heading hierarchy (h1 → h2 → h3)
```

---

## Performance Targets

### Animation Performance
- **Frame Rate:** 60fps minimum
- **Paint Time:** < 16ms per frame
- **Layout Shifts:** Zero CLS (Cumulative Layout Shift)

### Interaction Latency
- **Click to Visual Feedback:** < 100ms
- **Hover to Visual Feedback:** < 50ms
- **Animation Start Delay:** < 50ms

---

## Implementation Checklist

When implementing these designs:

- [ ] Use exact color values specified (not custom hex)
- [ ] Match shadow elevations to component states
- [ ] Apply correct border radius to each component type
- [ ] Use specified animation durations and easing
- [ ] Implement all interactive states (rest, hover, active, disabled)
- [ ] Ensure dark mode variants for all colors
- [ ] Test keyboard navigation flow
- [ ] Verify color contrast ratios
- [ ] Test on mobile, tablet, desktop viewports
- [ ] Validate 60fps animation performance

---

This specification ensures pixel-perfect implementation of the premium design system.
