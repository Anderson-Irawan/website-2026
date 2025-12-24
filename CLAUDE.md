# CLAUDE.md - Anderson & Designs Portfolio Website

## Project Overview

**Anderson & Designs** is a portfolio website for a graphic designer specializing in logo design, branding, illustrations, and print/packaging. The site showcases bold, imaginative design work with a vibrant color palette and playful typography.

- **Type**: Static portfolio website
- **Tech Stack**: Pure HTML, CSS, and vanilla JavaScript (no frameworks)
- **Target Audience**: Startups and businesses seeking bold, creative branding
- **Tagline**: "Ditch the Classical and Vanilla"

## Codebase Structure

```
website-2026/
├── index.html          # Homepage with hero, portfolio preview, about, services, CTA
├── about.html          # About page with bio and credentials
├── work.html           # Portfolio grid page
├── case-study.html     # Individual project case study template
├── contact.html        # Contact form page
├── css/
│   └── styles.css      # Single comprehensive stylesheet
├── js/
│   └── main.js         # All JavaScript functionality
├── assets/
│   ├── fonts/
│   │   ├── Fuzamic-Regular.ttf    # Display font (headings)
│   │   ├── Knewave.ttf            # Marker/accent font
│   │   └── Manrope.ttf            # Body text font
│   └── images/
│       ├── Logo_BG_SVG.svg        # Background pattern logo
│       ├── RGB-Logo-01.svg        # Color logo variant
│       ├── RGB-Logo-02.svg        # Color logo variant
│       ├── MCM_ComicCon-49.jpg    # About page photo
│       ├── branding_flag_300x.png # Service sticker
│       ├── logo_badge_300x.png    # Service sticker
│       ├── illustrate_pencil_300x.png  # Service sticker
│       ├── print___packaging_300x.png  # Service sticker
│       └── stickerboard.png       # Decorative element
└── .gitattributes      # Git configuration for line endings
```

## Design System & Conventions

### Color Palette

```css
--color-red: #FF1739        /* Primary accent, CTAs */
--color-cream: #FFFDD2      /* Background (light pages), main text on dark */
--color-pink: #FF8899       /* Secondary accent, marker text */
--color-black: #060505      /* Main background, text on light */
--color-mint: #F5FFEE       /* Accent color (currently unused) */
--color-gray-placeholder: #4a4a4a  /* Placeholder backgrounds */
--color-gray-dark: #2a2a2a  /* Card backgrounds */
```

### Typography System

**Font Families:**
- `--font-display`: 'Fuzamic' - All-caps headings, bold statements
- `--font-marker`: 'Knewave' - Playful accent text, hero titles
- `--font-body`: 'Manrope' - Body text, navigation, forms

**Hierarchy:**
- `.heading-xl`: clamp(2.5rem, 8vw, 5rem) - Hero titles
- `.heading-lg`: clamp(2rem, 6vw, 4rem) - Section titles
- `.heading-md`: clamp(1.5rem, 4vw, 2.5rem) - Subsections
- `.heading-sm`: clamp(1.25rem, 3vw, 1.75rem) - Small headings

**Text Conventions:**
- All headings use uppercase by default (via CSS)
- Body text uses normal case
- Marker font (Knewave) is ALWAYS used for playful, eye-catching elements

### Spacing Scale

```css
--space-xs: 0.5rem   (8px)
--space-sm: 1rem     (16px)
--space-md: 1.5rem   (24px)
--space-lg: 2rem     (32px)
--space-xl: 3rem     (48px)
--space-2xl: 4rem    (64px)
--space-3xl: 6rem    (96px)
--space-4xl: 8rem    (128px)
```

**Use spacing variables consistently** - never use arbitrary pixel values.

### Layout Conventions

- **Container**: Max-width 1200px, padding 2rem (responsive)
- **Sections**: Default padding `var(--space-3xl)` vertical
- **Grid Systems**: CSS Grid for layouts (no flexbox grids)
- **Responsive Breakpoints**:
  - Mobile: < 576px
  - Tablet: 576px - 768px
  - Desktop: 768px - 992px
  - Large: > 992px

### Animation Philosophy

**Transition Functions:**
- `--transition-bounce`: cubic-bezier(0.34, 1.56, 0.64, 1) - Playful, energetic
- `--transition-smooth`: cubic-bezier(0.4, 0, 0.2, 1) - Elegant, subtle

**Animation Patterns:**
- Scroll animations use Intersection Observer (`animate-on-scroll` class)
- Staggered delays create rhythm (100ms increments)
- Page load animations for above-the-fold content
- Hover effects scale elements (1.05-1.15x) with bounce timing
- All animations unobserve after triggering (performance)

## Key Features & Components

### 1. Navigation (`navbar`)
- Fixed position with scroll effect (adds `scrolled` class at 50px)
- Mobile hamburger menu (< 768px)
- Logo SVG with text
- Closes on outside click or link click

**Location**: All pages (identical markup)

### 2. Hero Section (`hero`)
- Minimal height: 50vh
- Contains subtitle, title (marker font), SVG underline
- Scroll indicator with line and text
- Fade-in animations on page load

**Location**: index.html:38-54

### 3. Portfolio Items

**Full-Width Style** (Homepage):
- `.portfolio-item-full` class
- 70vh image height
- Info section below with title and subtitle
- Hover scales image (1.05x)

**Location**: index.html:56-90

**Grid Style** (Work Page):
- `.portfolio-grid` with `.cols-2` or `.cols-3`
- Square aspect ratio
- Overlay with gradient

**Location**: work.html:46+

### 4. Services Section with Stickers
- Jumbled, overlapping layout using transform rotations
- Each sticker has unique positioning and hover effects
- Mobile view stacks vertically with simpler transforms

**Location**: index.html:116-135
**Styles**: css/styles.css:1324-1479

### 5. Contact Form
- Fields: name, company, email, project-type, budget, timeframe, description
- Uses `mailto:` link (no backend)
- Styled with pill-shaped inputs (border-radius: var(--radius-full))

**Location**: contact.html
**Handler**: js/main.js:107-138

### 6. Animation System

**Scroll Animations:**
```html
<div class="animate-on-scroll">Content</div>
```
- Automatically triggers when 10% visible
- Adds `visible` class
- Staggered by 100ms per element

**Fade-in Delays:**
```html
<div class="fade-in fade-in-delay-1">Content</div>
```
- Use for hero content
- Delays: 0.1s, 0.2s, 0.3s, 0.4s, 0.5s, 0.6s

## Development Workflow

### File Organization Rules

1. **HTML Files**: One per page, semantic structure, consistent navigation
2. **CSS**: Single monolithic stylesheet with clear section comments
3. **JavaScript**: Modular functions in single file, init on DOMContentLoaded
4. **Assets**: Organized by type (fonts/ and images/)

### CSS Organization Pattern

The stylesheet follows this exact order:
1. Font-face declarations
2. CSS Custom Properties (Design Tokens)
3. Reset & Base Styles
4. Animation Keyframes
5. Typography
6. Layout Utilities
7. Components (Navbar, Hero, Portfolio, etc.)
8. Page-specific styles
9. Utility classes

**DO NOT REORDER** - this structure is intentional.

### JavaScript Modules

```javascript
// Pattern used throughout main.js
function initModuleName() {
    const element = document.querySelector('.target');
    if (!element) return;  // Guard clause

    // Module logic here
}

// Called in DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    initScrollAnimations();
    // etc...
});
```

### Git Workflow

- **Main branch**: Production-ready code
- **Feature branches**: Use `claude/` prefix (e.g., `claude/claude-md-mjjr6cq7x1ydlyk7-APXt5`)
- **Commit messages**: Descriptive, lowercase, present tense
- **Recent commits**:
  - 1d3cf92: revamp 1
  - 42aba14: first commit

## Guidelines for AI Assistants

### Design Consistency Rules

1. **ALWAYS use CSS custom properties** - Never hardcode colors, spacing, or fonts
2. **NEVER introduce new fonts** - Only use Fuzamic, Knewave, and Manrope
3. **Maintain color harmony** - Red (#FF1739) is primary, Pink (#FF8899) is accent
4. **Respect the spacing scale** - Use predefined spacing variables
5. **Keep the playful personality** - Bold, bouncy, energetic (not corporate/minimal)

### Code Quality Standards

1. **Semantic HTML**: Use appropriate tags (section, article, nav, etc.)
2. **Accessibility**: Include alt text, ARIA labels, keyboard navigation
3. **Responsive-first**: Mobile → Desktop using media queries
4. **Performance**: Unobserve animations after trigger, optimize images
5. **BEM-like naming**: Descriptive class names (`.portfolio-item-full`, `.hero-scroll`)

### Common Tasks Guide

#### Adding a New Page

1. Copy structure from existing page (navigation + footer)
2. Add page-specific class to `<body>` if needed (e.g., `page-cream`)
3. Maintain consistent spacing (150px padding-top for content)
4. Link page in navigation menu
5. Add scroll animations with `.animate-on-scroll`

#### Adding Portfolio Items

**Homepage** (full-width):
```html
<a href="case-study.html" class="portfolio-item-full animate-on-scroll">
    <div class="portfolio-image">
        <img src="path/to/image.jpg" alt="Project Name">
    </div>
    <div class="portfolio-info">
        <h2>Project Name</h2>
        <p class="portfolio-subtitle">Type of Work</p>
    </div>
</a>
```

**Work Page** (grid):
```html
<a href="case-study.html" class="portfolio-item animate-on-scroll">
    <img src="path/to/image.jpg" alt="Project Name">
    <div class="portfolio-item-overlay">
        <p class="portfolio-item-title">Project Name</p>
    </div>
</a>
```

#### Modifying Colors/Design Tokens

1. Update `:root` variables in css/styles.css:33-73
2. Test across all pages (index, about, work, contact, case-study)
3. Check both light (cream) and dark (black) backgrounds
4. Verify accessibility contrast ratios

#### Adding Animations

**Scroll-triggered:**
```html
<div class="animate-on-scroll">
    <!-- Content fades in when scrolling -->
</div>
```

**Page load (hero only):**
```html
<div class="fade-in fade-in-delay-2">
    <!-- Fades in 0.2s after page load -->
</div>
```

**Custom hover effect:**
```css
.element {
    transition: transform 0.4s var(--transition-bounce);
}
.element:hover {
    transform: scale(1.05) rotate(2deg);
}
```

### What NOT to Do

❌ **NEVER add a CSS framework** (Bootstrap, Tailwind, etc.)
❌ **NEVER use inline styles** (except for quick one-off overrides)
❌ **NEVER add build tools** (Webpack, Vite, etc.) - this is intentionally simple
❌ **NEVER use JavaScript frameworks** (React, Vue, etc.)
❌ **NEVER change the font choices** - they define the brand
❌ **NEVER make it "corporate" or "minimal"** - keep it bold and playful
❌ **NEVER use generic Lorem Ipsum** - use placeholder text that fits the brand voice

### Image Handling

**Current State:**
- Many images use `.image-placeholder` div (gray background with "Image" text)
- Service stickers are PNG files (branding, logo, print, illustrations)
- Background pattern uses SVG for scalability

**When Adding Images:**
1. Optimize for web (compress JPG/PNG, use WebP if possible)
2. Use descriptive alt text
3. Maintain consistent aspect ratios per component
4. Use `object-fit: cover` for dynamic images
5. Consider retina displays (2x assets or SVG)

## Technical Specifications

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Intersection Observer required
- No IE11 support needed

### Performance Targets
- First Contentful Paint: < 1.5s
- No render-blocking resources (fonts use `font-display: swap`)
- Animations use `transform` and `opacity` (GPU-accelerated)
- Intersection Observer unobserves after animation

### SEO Considerations
- Semantic HTML structure
- Meta descriptions on all pages
- Descriptive title tags
- Alt text on all images
- Clean URL structure (no query params)

## Contact & Deployment

**Email**: hello@andersondesigns.com (used in contact form mailto)
**Deployment**: Static hosting (works with GitHub Pages, Netlify, Vercel, etc.)
**No Backend Required**: All functionality is client-side

## Version History

- **v1.0 (1d3cf92)**: Revamp 1 - Current design system implemented
- **v0.1 (42aba14)**: First commit - Initial structure
- **v0.0 (0e505bf)**: Initial commit

---

## Quick Reference: File Locations

| Feature | HTML | CSS Lines | JS Lines |
|---------|------|-----------|----------|
| Navigation | All pages:12-35 | 295-414 | 16-35 |
| Hero Section | index.html:38-54 | 1117-1176 | N/A |
| Portfolio Grid | work.html:46+ | 267-291, 517-599 | N/A |
| Portfolio Full | index.html:56-90 | 1181-1232 | N/A |
| About Section | index.html:93-114 | 1236-1321 | N/A |
| Services Stickers | index.html:116-135 | 1324-1479 | N/A |
| CTA Section | index.html:138-148 | 1483-1516 | N/A |
| Footer | All pages (end) | 1520-1563 | N/A |
| Contact Form | contact.html | 929-1004 | 107-138 |
| Scroll Animations | N/A | 197-208 | 40-70 |
| Mobile Menu | All pages:23-27 | 371-414 | 75-102 |

---

**Last Updated**: 2025-12-24
**Repository**: Anderson-Irawan/website-2026
**Current Branch**: claude/claude-md-mjjr6cq7x1ydlyk7-APXt5
