import { getReferencedProjects } from "./projectParser";
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
    images: ["fractal-1.jpeg", "blob.gif", "blob-end.png", "blob-level.jpeg"],
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
      "courtly-form.png",
      "courtly-home.png",
      "courtly-settings.png",
      "courtly-ios-home.png",
      "courtly-ios-profile.png",
      "courtly-ios-badge.png",
      "courtly-ios-prev.png",
      "courtly-ios-intro.png",
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
    images: ["algos-sort.png", "algos-dijkstra.png", "algos-hull.png"],
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
    images: ["tarot-home.png", "tarot-message.png", "tarot-response.gif"],
  },
};

const getProject = (id: string): Project | undefined => {
  return projects[id];
};

const getAllProjects = (): Project[] => {
  return Object.values(projects);
};

export { getProject, getAllProjects };
