# Technology Stack

## Core Framework
- **Astro 5.12.0** - Static site generator with component islands architecture
- **TypeScript** - Strict TypeScript configuration extending Astro's strict preset
- **Tailwind CSS 4.1.11** - Utility-first CSS framework via Vite plugin

## Build System
- **Bun** - Package manager and runtime (preferred over npm/yarn)
- **Vite** - Build tool and dev server (integrated with Astro)

## Development Commands

All commands should be run from the project root:

```bash
# Install dependencies
bun install

# Start development server (localhost:4321)
bun dev

# Build for production
bun build

# Preview production build locally
bun preview

# Run Astro CLI commands
bun astro [command]
```

## Configuration Files
- `astro.config.mjs` - Astro configuration with Tailwind integration
- `tsconfig.json` - TypeScript configuration extending Astro strict preset
- `package.json` - Project dependencies and scripts

## Asset Handling
- Static assets go in `/public` directory
- Component assets go in `/src/assets`
- Images are imported and optimized automatically by Astro