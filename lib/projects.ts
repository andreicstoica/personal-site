import type { Project } from "./types";

export const projects: Record<string, Project> = {
  "blob-game": {
    id: "blob-game",
    title: "Blob Game",
    description:
      "A clicker game built with TypeScript and React where players grow a blob by clicking and purchasing upgrades. The game includes multiple upgrade paths, achievements, and satisfying visual feedback.",
    technologies: [
      "TypeScript",
      "React",
      "Game Engine",
      "Game Design",
      "Netlify",
    ],
    technicalDetails: {
      keyFeatures: [
        "Real-time click tracking with debounced state updates for performance",
        "Achievement engine with progress tracking and unlock conditions",
        "Responsive canvas-based blob rendering with procedural growth animations",
      ],
      challenges: [
        "Optimizing render performance for high-frequency click events using RAF scheduling",
        "Designing balanced game economy with exponential growth curves",
        "Implementing smooth visual feedback without blocking UI while still being visually stimulating",
        "Managing complex state dependencies between upgrades and achievements",
      ],
      implementation: [
        "Custom useGameState hook encapsulating reducer pattern for centralized state management",
        "CSS-in-JS animations synchronized with game state changes",
        "Automated deployment pipeline with Netlify for continuous integration",
      ],
    },
    links: {
      demo: "https://sublobination.netlify.app/",
      github: "https://github.com/andreicstoica/blob-game",
    },
    images: ["fractal-1.webp", "blob.webm", "blob-end.webp", "blob-level.webp"],
  },
  courtly: {
    id: "courtly",
    title: "Courtly",
    description:
      "A tennis focused website and app that generates customized AI-powered training routines for players. Featuring personalized workout plans, adaptive difficulty based on player performance, and collectible medals for NYC area courts.",
    technologies: [
      "React Native",
      "Expo",
      "React",
      "tRPC",
      "Authentication",
      "AI SDK",
      "AI Tool Calling",
      "Formatted AI Responses",
      "threeJS",
    ],
    technicalDetails: {
      keyFeatures: [
        "AI-powered workout generation using OpenAI GPT-4 with structured output parsing",
        "Cross-platform mobile app with native performance using Expo",
        "Real-time geolocation integration for court badges and stats",
        "3D badge visualization system using Three.js with WebGL rendering",
        "Secure authentication flow with JWT tokens and refresh token rotation",
      ],
      challenges: [
        "Implementing type-safe API communication between mobile and web clients",
        "Managing complex state synchronization between native and web platforms",
      ],
      implementation: [
        "tRPC procedures with Zod validation for runtime type checking and API contracts",
        "Custom AI prompt engineering with structured JSON schema for consistent workout formats",
        "Three.js scene optimization with LOD rendering and texture compression",
        "OAuth 2.0 implementation with secure token storage using Expo SecureStore",
        "Automated CI/CD pipeline with EAS Build for iOS and Android distribution",
      ],
    },
    links: {
      github:
        "https://github.com/andreicstoica/tennis-coach-mobile?tab=readme-ov-file#readme",
      demo: "https://courtly-xi.vercel.app/",
    },
    images: [
      "courtly-form.webp",
      "courtly-home.webp",
      "courtly-settings.webp",
      "courtly-ios-home.webp",
      "courtly-ios-profile.webp",
      "courtly-ios-badge.webp",
      "courtly-ios-prev.webp",
      "courtly-ios-intro.webp",
    ],
    video: "https://youtube.com/shorts/HFRVCUYEce0",
  },
  "algos-visualized": {
    id: "algos-visualized",
    title: "Algos, Visualized",
    description:
      "An interactive algorithm visualizer that brings computer science concepts to life through smooth animations and user interaction. Built with Framer Motion and CSS animations, it helps users understand Quick Sort, Dijkstra's, and Convex Hull through visual representation.",
    technologies: ["React", "TypeScript", "Framer Motion", "CSS Animations"],
    technicalDetails: {
      keyFeatures: [
        "Step-by-step algorithm walkthroughs with visualizations and animations",
        "Responsive rendering with dynamic layout algorithms, including HTML Canvas rendering",
      ],
      challenges: [
        "Synchronizing animation timelines with algorithm execution steps",
        "Gathering useful 'snapshots' of algorithm states to visualize",
      ],
      implementation: [
        "Framer Motion orchestration for coordinated multi-element animations in Quick Sort Visualization",
        "TypeScript generics for reusable algorithm visualization components",
        "Canvas API integration for high-performance rendering of convex hull and Dijkstra's algorithms",
      ],
    },
    links: {
      demo: "https://algos-visualized.vercel.app/",
      github: "https://github.com/andreicstoica/algos-visualized",
    },
    images: ["algos-sort.webp", "algos-dijkstra.webp", "algos-hull.webp"],
  },
  "tarot-chat": {
    id: "tarot-chat",
    title: "Daily Tarot",
    description:
      "A daily tarot reading chat website that helps users understand and reflect on their tarot readings. Built with React, NextJS, shadcn components, and theVercel AI SDK.",
    technologies: [
      "React Native",
      "TypeScript",
      "Neon",
      "AI SDK",
      "File Upload",
      "Authentication",
    ],
    technicalDetails: {
      keyFeatures: [
        "Streaming AI responses using Vercel AI SDK with real-time message updates",
        "Database-backed conversation persistence",
        "Profile with the ability to update information",
        "File upload system with image processing and secure cloud storage integration",
        "Session-based authentication with secure cookie management",
        "Responsive chat interface with shadcn/ui components and Tailwind CSS",
      ],
      challenges: [
        "Implementing smooth streaming text updates without UI flicker or layout shifts",
        "Managing file upload security with proper validation",
        "Optimizing database queries for chat history and performance",
      ],
      implementation: [
        "Next.js API routes with middleware for authentication and request validation (tRPC)",
        "Vercel AI SDK streaming with custom parsing for structured tarot responses",
      ],
    },
    links: {
      demo: "https://t3-chat-app-ho6w.vercel.app/",
      github: "https://github.com/andreicstoica/t3-chat-app",
    },
    images: ["tarot-home.webp", "tarot-message.webp", "tarot-response.webm"],
  },
  "stance-health": {
    id: "stance-health",
    title: "Stance Health",
    description:
      "Chronic health therapy med-tech startup. Stance helps patients find the right therapist for their needs by ranking therapists based on their location, availability, and other factors.",
    technologies: [
      "React",
      "TypeScript",
      "Node.js",
      "FastAPI",
      "Google Cloud",
      "GSAP",
      "Chakra UI",
    ],
    technicalDetails: {
      keyFeatures: [
        "Simplified landing page with small animations",
        "Hero form that acts as top-of-funnel - previously its own page",
        "Improved results page load speed 3x by improving ranking algorithm"
      ],
      challenges: [
        "Improving ranking algorithm",
        "Making onboarding flow support dual entries (hero form and previous page)",
        "Working around HIPAA regulations (form data sent to server as UUID)",
        "Integrations with medical web services",
      ],
      implementation: [
        "Central 'Onboarding' state management that accepts changes from various pages",
        "Improved ranking algorithm by simplifying nearby zip code logic",
        "Single page landing page with animations for each section"
      ],
    },
    links: {
      demo: "https://mystance.co/",
    },
    images: ["stance-health-1.webp"],
  },
  "holdfast-network": {
    id: "holdfast-network",
    title: "Holdfast Network",
    description:
      "A platform that helps acquaculture professionals collaborate on research, specifically for physical resources. Generates formatted PDFs to support NOAA requirements. The platform is mostly used by university researchers and their partners.",
    technologies: [
      "React",
      "TypeScript",
      "MapLibre",
      "Tailwind CSS",
      "Linear",
    ],
    technicalDetails: {
      keyFeatures: [
        "Performant regional maps that support clustering during zoom in/out",
        "Authentication and variying authorization requirements",
        "Document export feature to support continued funding",
      ],
      challenges: [
        "Interface design for explaining research projects visually to other researchers",
        "Easy to use interface for varying levels of tech saavy"
      ],
      implementation: [
        "tRPC procedures with Zod validation",
        "MapLibre maps",
        "CI/CD pipeline with Husky, GitHub Actions"
      ]
    },
    images: [
      "holdfast-1.webp"
    ],
    links: {
      demo: "https://simpler.grants.gov/opportunity/0ebd10b9-141c-440d-ae26-9145e61fec39",
    }
  },
};

const getProject = (id: string): Project | undefined => {
  return projects[id];
};

const getAllProjects = (): Project[] => {
  return Object.values(projects);
};

export { getProject, getAllProjects };
