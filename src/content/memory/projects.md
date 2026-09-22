---
id: projects
title: Projects
route: /
---

Selected projects, newest cluster from the Fractal AI accelerator (2025) and freelance work. Each project has a page on this site.

## Refract
route: /projects/refract

The journal that collaborates with you to go deeper. Refract engages with writing in real time, asking questions that spark reflection, then highlights themes afterward. Built with the AI SDK, embeddings, browser text-area APIs, and React/Next.js. Demo: refract.site. GitHub: https://github.com/andreicstoica/refract

He describes two AI features that don't require prompting, a writing-first UI, and contextual responses. Hard parts were keeping the writer in control, making the conversation feel supportive, and balancing latency so nudges aren't stale. Implementation notes: Next.js App Router, Framer Motion and GSAP, Vercel AI SDK, a custom DOM-mirror over an infinite text area, an engine that watches topic, punctuation, and time before nudging, and clustered embeddings that get labeled into themes.

## Courtly
route: /projects/courtly

A tennis site and app that generates customized AI training routines. Personalized plans, adaptive difficulty, and collectible medals for NYC courts. React Native, Expo, React, tRPC, the AI SDK, and three.js. Demo: https://courtly-xi.vercel.app/. GitHub: https://github.com/andreicstoica/tennis-coach-mobile. Short video: https://youtube.com/shorts/HFRVCUYEce0

Workout generation used structured model output. The app shares a web client, uses geolocation for court badges, and renders 3D badges in three.js. Auth is JWT with refresh rotation. Type-safe mobile/web APIs go through tRPC and Zod.

## Blob Game
route: /projects/blob-game

A clicker game in TypeScript and React. Players grow a blob by clicking and buying upgrades. Multiple upgrade paths, achievements, and visual feedback. Also described on his resume as Blob Must Grow, inspired by Cookie Clicker and Universal Paperclips. Demo: https://sublobination.netlify.app/. GitHub: https://github.com/andreicstoica/blob-game

Features: debounced click tracking, an achievement engine, and a canvas blob with procedural growth. Hard parts were high-frequency clicks (requestAnimationFrame), an exponential economy, and keeping feedback smooth without blocking the UI. State sits in a custom useGameState reducer. Deployed on Netlify.

## Algos, Visualized
route: /projects/algos-visualized

Interactive visualizations of Quick Sort, Dijkstra's, and convex hull, using Framer Motion, CSS, and canvas. Demo: https://algos-visualized.vercel.app/. GitHub: https://github.com/andreicstoica/algos-visualized

Step-by-step walkthroughs. The hard part was lining animation timelines up with algorithm steps and choosing useful state snapshots. Quick sort uses Framer Motion. Dijkstra and convex hull render on canvas. TypeScript generics share visualization pieces.

## Daily Tarot
route: /projects/tarot-chat

A daily tarot reading chat for reflecting on a draw. React, Next.js, shadcn, and the Vercel AI SDK. Demo: https://t3-chat-app-ho6w.vercel.app/. GitHub: https://github.com/andreicstoica/t3-chat-app

Streaming replies, saved conversations, a profile, image upload, and session cookies. Hard parts were streaming text without layout jump, upload validation, and chat-history queries.

## Stance Health
route: /projects/stance-health

Chronic health therapy, med-tech. React, TypeScript, Node.js, FastAPI, Google Cloud, GSAP, and Chakra UI. Demo: https://mystance.co/

Freelance rebuild of the patient landing and results pages, with a mobile focus. A hero form replaced a separate top-of-funnel page. He simplified nearby-zip ranking and cites much faster results-page loads. HIPAA constraint: form data goes to the server as a UUID. Onboarding state accepts both the hero form and the older page.

## Holdfast Network
route: /projects/holdfast-network

A platform for aquaculture researchers to collaborate on physical resources, including formatted PDFs for NOAA requirements. React, TypeScript, MapLibre, Tailwind, tRPC, and Zod. Regional maps cluster while zooming. Auth has varying authorization. Document export supports continued funding. The audience includes researchers who are not deeply technical.
