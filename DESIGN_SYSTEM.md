# Ever.Chat Design System

## Overview
A modern, Discord-inspired design system for Ever.Chat that emphasizes clarity, usability, and a clean aesthetic with carefully balanced whitespace and intuitive navigation patterns.

## Core Design Principles

### 1. Visual Hierarchy
- **Three-panel layout**: Navigation sidebar → Content area → User/meta sidebar
- **Clear separation**: Distinct background colors to delineate functional areas
- **Focused attention**: Primary content area uses lightest background to draw focus

### 2. Color Palette

#### Background Colors
- **Primary Background**: `#FFFFFF` - Main content area
- **Secondary Background**: `#F7F8FA` - Sidebars and navigation
- **Tertiary Background**: `#FAFBFC` - Hover states and subtle emphasis
- **Input Background**: `#F2F3F5` - Form fields and input areas

#### Text Colors
- **Primary Text**: `#2E3338` - Main content and headings
- **Secondary Text**: `#5C6370` - Subdued text and metadata
- **Muted Text**: `#959BA7` - Hints and placeholders
- **Interactive Text**: `#6B47ED` - Links and clickable elements

#### Accent Colors
- **Primary Accent**: `#6B47ED` - Primary actions and selected states
- **Success**: `#3BA55D` - Online status and success states
- **Warning**: `#FAA81A` - Warnings and cautions
- **Danger**: `#ED4245` - Errors and destructive actions
- **Info**: `#5865F2` - Informational elements

### 3. Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
```

#### Type Scale
- **Display**: 24px/32px - Page titles
- **Heading 1**: 20px/28px - Section headers
- **Heading 2**: 16px/24px - Subsection headers
- **Body**: 14px/20px - Primary content
- **Small**: 12px/16px - Metadata and timestamps
- **Micro**: 11px/14px - Labels and badges

#### Font Weights
- **Regular**: 400 - Body text
- **Medium**: 500 - Emphasis and UI labels
- **Semibold**: 600 - Headings and buttons
- **Bold**: 700 - Strong emphasis

## Component Design

### Navigation Sidebar (Left)
- **Width**: 240px fixed
- **Background**: `#F7F8FA`
- **Border**: 1px solid `#E3E5E8` on right

#### Channel List
- **Item Height**: 32px
- **Padding**: 8px horizontal
- **Border Radius**: 4px
- **Hover State**: Background `#EBEDEF`
- **Active State**: Background `#E7E5FB`, text `#6B47ED`
- **Icon Size**: 16px with 8px right margin
- **Font**: 14px/20px medium weight

#### Section Headers
- **Font**: 11px uppercase, weight 600
- **Color**: `#5C6370`
- **Padding**: 16px top, 8px horizontal
- **Letter Spacing**: 0.5px

### Content Area (Center)
- **Background**: `#FFFFFF`
- **Padding**: 24px
- **Max Width**: 900px centered for readability

#### Message Container
- **Background**: `#FAFBFC`
- **Border Radius**: 12px
- **Padding**: 20px
- **Border**: 1px solid `#E3E5E8`
- **Centered Welcome Message**: Icon + text vertically centered

#### Chat Messages
- **Avatar Size**: 40px
- **Avatar Margin**: 16px right
- **Username**: 14px semibold, color `#2E3338`
- **Timestamp**: 11px, color `#959BA7`
- **Message Text**: 14px/20px, color `#2E3338`
- **Message Spacing**: 16px between messages

### Input Area (Bottom)
- **Height**: 68px
- **Background**: `#FFFFFF`
- **Border Top**: 1px solid `#E3E5E8`
- **Padding**: 16px

#### Message Input
- **Background**: `#F2F3F5`
- **Border Radius**: 8px
- **Padding**: 12px 16px
- **Font Size**: 14px
- **Placeholder Color**: `#959BA7`
- **Focus Border**: 2px solid `#6B47ED`

#### Send Button
- **Background**: `#6B47ED`
- **Color**: `#FFFFFF`
- **Border Radius**: 6px
- **Padding**: 8px 20px
- **Font**: 14px semibold
- **Hover**: Darken 10%
- **Active**: Darken 15%

### User Sidebar (Right)
- **Width**: 240px
- **Background**: `#F7F8FA`
- **Padding**: 16px

#### User Card
- **Avatar Size**: 32px
- **Status Indicator**: 10px circle, positioned bottom-right
- **Username Font**: 14px semibold
- **Status Text**: 12px, color `#5C6370`
- **Padding**: 8px
- **Border Radius**: 6px
- **Hover Background**: `#EBEDEF`

## Interactive States

### Hover Effects
- **Transition**: All 150ms ease
- **Background Change**: Lighten 3-5%
- **Cursor**: Pointer for interactive elements
- **Text Decoration**: None for links

### Focus States
- **Outline**: 2px solid `#6B47ED`
- **Outline Offset**: 2px
- **Border Radius**: Inherit from element

### Active/Selected States
- **Background**: Accent color at 10% opacity
- **Text Color**: Accent color
- **Border Left**: 3px solid accent (for nav items)

## Spacing System

### Base Unit: 4px
- **Micro**: 4px
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **XLarge**: 32px
- **XXLarge**: 48px

### Component Spacing
- **Button Padding**: 8px 16px
- **Card Padding**: 16px
- **Section Margin**: 24px
- **Input Padding**: 12px 16px

## Icons

### Size Guidelines
- **Navigation**: 16px
- **Inline**: 14px
- **Buttons**: 18px
- **Large Actions**: 24px

### Style
- **Stroke Width**: 2px
- **Style**: Outlined/line icons
- **Color**: Inherit from text color

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Hide sidebars, show hamburger menu */
}

/* Tablet */
@media (max-width: 1024px) {
  /* Collapse user sidebar */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Full three-panel layout */
}
```

## Animation Guidelines

### Timing Functions
- **Ease Out**: cubic-bezier(0.25, 0.46, 0.45, 0.94)
- **Ease In Out**: cubic-bezier(0.42, 0, 0.58, 1)

### Durations
- **Micro**: 100ms - Hover states
- **Fast**: 150ms - Toggles and buttons
- **Normal**: 250ms - Modals and panels
- **Slow**: 350ms - Page transitions

## Accessibility

### Color Contrast
- **Normal Text**: Minimum 4.5:1 ratio
- **Large Text**: Minimum 3:1 ratio
- **Interactive Elements**: Minimum 3:1 ratio

### Keyboard Navigation
- **Tab Order**: Logical left-to-right, top-to-bottom
- **Focus Indicators**: Always visible
- **Skip Links**: Provided for main content

### Screen Readers
- **ARIA Labels**: On all interactive elements
- **Semantic HTML**: Proper heading hierarchy
- **Alt Text**: For all images and icons

## Implementation Notes

### CSS Variables
```css
:root {
  --color-primary: #6B47ED;
  --color-background: #FFFFFF;
  --color-sidebar: #F7F8FA;
  --color-text: #2E3338;
  --color-text-muted: #959BA7;
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}
```

### Component Classes
```css
.channel-item
.message-container
.input-field
.button-primary
.sidebar-section
.user-card
```

This design system provides a cohesive, modern interface that balances functionality with visual appeal, ensuring a pleasant user experience across all interactions.