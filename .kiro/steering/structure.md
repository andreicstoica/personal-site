# Project Structure

## Directory Organization

```
/
├── public/                 # Static assets (favicon, images, etc.)
├── src/
│   ├── assets/            # Component-scoped assets (SVGs, images)
│   ├── components/        # Reusable Astro components
│   ├── layouts/           # Page layout templates
│   ├── pages/             # File-based routing (generates URLs)
│   └── styles/            # Global CSS and Tailwind imports
├── .astro/                # Generated Astro files (auto-managed)
└── dist/                  # Production build output
```

## File Conventions

### Components (`src/components/`)
- Use `.astro` extension for Astro components
- PascalCase naming (e.g., `Welcome.astro`)
- Include component-scoped styles using `<style>` tags
- Import assets using relative paths

### Pages (`src/pages/`)
- File-based routing: `index.astro` → `/`, `about.astro` → `/about`
- Use frontmatter for component imports and logic
- Wrap content in Layout component for consistent structure

### Layouts (`src/layouts/`)
- Base HTML structure with `<slot />` for content injection
- Include global meta tags, title, and base styles
- Use semantic HTML structure

### Styles (`src/styles/`)
- `global.css` imports Tailwind CSS
- Component-specific styles should be scoped within components
- Use Tailwind utilities for consistent design system

## Code Style Guidelines

### Astro Components
- Use frontmatter (`---`) for imports and server-side logic
- Prefer component composition over large monolithic components
- Use TypeScript for type safety
- Include alt text for images and proper semantic HTML

### CSS/Styling
- Prefer Tailwind utilities over custom CSS when possible
- Use component-scoped styles for component-specific styling
- Maintain responsive design patterns
- Use CSS custom properties for consistent theming