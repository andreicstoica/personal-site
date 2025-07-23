# Implementation Plan

- [x] 1. Create project data structure and types
  - Create `lib/projects.ts` file with project data for Fractal Bootcamp projects (Blob Game, Courtly, Algos Visualized)
  - Define TypeScript interfaces for Project, ProjectReference, and extended Experience types in `lib/types.ts`
  - Add sample project data with all required fields (title, description, technologies, links, images)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Build ProjectLink component
  - Create `src/components/ProjectLink.astro` component that renders clickable project names
  - Implement hover effects and visual styling consistent with existing design system
  - Add click handler to trigger modal opening with proper event management
  - Include accessibility attributes (ARIA labels, semantic button element)
  - _Requirements: 1.1, 4.1, 4.2, 4.3_

- [x] 3. Create ProjectModal component
  - Create `src/components/ProjectModal.astro` component for displaying project details
  - Implement modal overlay with background dimming and responsive design
  - Add project information display (title, description, technologies, links)
  - Include close functionality via click outside, escape key, and close button
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Create project parsing utility
  - Create `lib/projectParser.ts` utility to parse project references from experience descriptions
  - Implement function to replace `{{project:id}}` syntax with ProjectLink components
  - Add validation for project references and error handling for missing projects
  - Create helper functions for extracting project IDs from descriptions
  - _Requirements: 2.1, 2.4_

- [x] 5. Integrate popup system with ExperienceTable
  - Modify `src/components/ExperienceTable.astro` to use project parsing utility
  - Update experience description rendering to process project references
  - Add modal state management and event handling to the component
  - Ensure existing table functionality (filtering, responsive layout) remains intact
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Update experience data with project references
  - Modify Fractal Bootcamp experience in `lib/experience.ts` to use new project reference syntax
  - Replace existing markdown links with `{{project:id}}` references
  - Add projects array to experience data structure if needed
  - Test that existing experiences without projects continue to render correctly
  - _Requirements: 2.2, 2.4, 5.2_

- [x] 7. Implement modal accessibility and responsive features
  - Add focus trapping within modal when open
  - Implement proper ARIA attributes and screen reader support
  - Add keyboard navigation support (Tab, Shift+Tab, Escape)
  - Ensure focus returns to trigger element when modal closes
  - Add CSS styles for mobile-responsive modal layout
  - Implement smooth animations for modal open/close transitions
  - Add support for `prefers-reduced-motion` accessibility preference
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Add graceful degradation and error handling
  - Implement fallback rendering for missing project data
  - Add error boundaries and logging for development debugging
  - Ensure component works without JavaScript (shows basic project info)
  - Test edge cases like multiple modal attempts and navigation during modal open
  - _Requirements: 4.4, 2.4_

- [ ] 9. Create comprehensive test suite
  - Write unit tests for project parsing utility functions
  - Add integration tests for modal opening/closing behavior
  - Test accessibility features with keyboard navigation and screen readers
  - Verify responsive behavior and cross-browser compatibility
  - _Requirements: 1.1, 1.4, 3.2, 3.3_