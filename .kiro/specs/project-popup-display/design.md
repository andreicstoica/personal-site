# Design Document

## Overview

The project popup display system will enhance the ExperienceTable component by replacing inline project links with interactive clickable elements that open detailed modal popups. The system will be built as a reusable Astro component that integrates seamlessly with the existing experience data structure while maintaining backward compatibility.

## Architecture

### Component Structure
```
ProjectPopupSystem/
├── ProjectModal.astro          # Modal component for displaying project details
├── ProjectLink.astro           # Clickable project link component
├── ProjectParser.ts            # Utility for parsing project data from descriptions
└── types.ts                    # Type definitions for project data
```

### Data Flow
1. Experience descriptions are parsed to identify project references
2. Project data is extracted and structured from a new projects data source
3. ProjectLink components are rendered in place of markdown links
4. Modal state is managed via client-side JavaScript
5. Project details are displayed in the ProjectModal component

## Components and Interfaces

### Project Data Structure
```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  links: {
    demo?: string;
    github?: string;
    website?: string;
  };
  images?: string[];
}

interface ProjectReference {
  projectId: string;
  displayText: string;
}

// Extended Experience type
interface Experience {
  // ... existing fields
  projects?: ProjectReference[];
}
```

### ProjectModal Component
- **Purpose**: Display detailed project information in a modal overlay
- **Props**: `project: Project`, `isOpen: boolean`, `onClose: () => void`
- **Features**:
  - Responsive design with mobile-first approach
  - Keyboard navigation and focus trapping
  - ARIA accessibility attributes
  - Smooth animations for open/close transitions
  - Image gallery integration for project screenshots

### ProjectLink Component
- **Purpose**: Render clickable project names that trigger modal opening
- **Props**: `project: Project`, `displayText: string`
- **Features**:
  - Hover effects and visual feedback
  - Semantic button element for accessibility
  - Integration with existing typography styles
  - Graceful degradation without JavaScript

### ProjectParser Utility
- **Purpose**: Parse experience descriptions and replace project references
- **Functions**:
  - `parseProjectReferences(description: string): string` - Replace project links with ProjectLink components
  - `extractProjectIds(description: string): string[]` - Extract project IDs from description
  - `validateProjectData(projects: Project[]): boolean` - Validate project data structure

## Data Models

### Project Storage
Projects will be stored in a new `lib/projects.ts` file with the following structure:

```typescript
export const projects: Record<string, Project> = {
  'blob-game': {
    id: 'blob-game',
    title: 'Blob Game',
    description: 'A clicker game built with TypeScript and React where players grow a blob by clicking and purchasing upgrades. Features progressive gameplay mechanics, responsive design, and a game engine for a single source of truth.',
    technologies: ['TypeScript', 'React', 'Netlify', "CI/CD", "Game Engine", "Game Design"],
    links: {
      demo: 'https://blob-must-grow.netlify.app/',
      github: 'https://github.com/andreicstoica/blob-game'
    },
  },
  // ... other projects
};
```

### Experience Integration
The existing experience data will be modified to reference projects:

```typescript
{
  type: "personal",
  name: "Fractal Bootcamp",
  // ... other fields
  description: `Spent 60+ hours per week for 3 months learning React, NextJS, Vercel...
  
  Selected Projects:
  - {{project:blob-game}} – clicker game built with TS/React
  - {{project:courtly}} – tennis practice session (AI generated) React Native and web app
  - {{project:algos-visualized}} – visualizer for algorithms using Framer Motion`,
  projects: [
    { projectId: 'blob-game', displayText: 'Blob Game' },
    { projectId: 'courtly', displayText: 'Courtly' },
    { projectId: 'algos-visualized', displayText: 'Algos, Visualized' }
  ]
}
```

## Error Handling

### Missing Project Data
- If a referenced project ID doesn't exist, render the original link text as a non-interactive element
- Log warnings in development mode for missing project references
- Provide fallback display for incomplete project data

### Modal State Management
- Handle edge cases like multiple modals attempting to open simultaneously
- Ensure proper cleanup of event listeners and focus management
- Graceful handling of modal close during navigation or page refresh

### Accessibility Fallbacks
- Provide keyboard-only navigation paths
- Ensure screen reader compatibility with proper ARIA labels
- Maintain focus management when modals open/close

## Testing Strategy

### Unit Tests
- Test ProjectParser utility functions for correct parsing and replacement
- Validate project data structure and validation functions
- Test modal state management and event handling

### Integration Tests
- Test ExperienceTable rendering with project links
- Verify modal opening/closing behavior
- Test responsive behavior across different screen sizes

### Accessibility Tests
- Keyboard navigation testing
- Screen reader compatibility testing
- Focus management validation
- Color contrast and visual accessibility checks

### Browser Compatibility
- Test modal behavior across modern browsers
- Verify CSS animations and transitions
- Test touch interactions on mobile devices

## Implementation Notes

### Astro Integration
- Leverage Astro's component islands for client-side interactivity
- Use Astro's built-in CSS scoping for modal styles
- Integrate with existing Tailwind CSS classes and custom properties

### Performance Considerations
- Lazy load project images in modals
- Minimize JavaScript bundle size with tree shaking
- Use CSS transforms for smooth animations
- Implement modal content virtualization for large project lists

### Styling Approach
- Extend existing design system colors and typography
- Use CSS custom properties for theme consistency
- Implement smooth transitions with `prefers-reduced-motion` support
- Maintain responsive design principles from the existing table

### Progressive Enhancement
- Ensure basic functionality works without JavaScript
- Enhance with modal behavior when JavaScript is available
- Provide meaningful fallbacks for all interactive elements