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
      "An interactive algorithm visualizer that brings computer science concepts to life through smooth animations and user interaction. Built with Framer Motion and CSS animations, it helps users understand Quick Sort, Dijkstra`s, and Convex Hull through visual representation.",
    technologies: ["React", "TypeScript", "Framer Motion", "CSS Animations"],
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
