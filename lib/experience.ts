import type { Experience } from "./types";

export const experiences: Experience[] = [
  {
    type: "personal",
    name: "Fractal Bootcamp",
    tags: ["personal", "code"],
    role: "Software Engineer",
    startDate: "2025",
    description:
      "Spent 60+ hours per week for 3 months learning React, NextJS, Vercel, Auth, tRPC, AI SDK/API, React Native, Postgresql, Typescript, Sentry, etc.",
    images: ["blob-game.gif", "fractal-2.png", "fractal-1.jpeg"],
  },
  {
    type: "work",
    name: "NBCUniversal",
    tags: ["product", "media"],
    role: "Product Manager",
    startDate: "2024",
    endDate: "2025",
    description:
      "I led discovery and scoping of an AI-aided fact-checking tool for journalists, correspondents, and producers. This included technically defining what NBCU defined as a ‘fact’ in collaboration with Standards. I also spearheaded an NBCU News Group wide people, places, and things scheduling software vendor analysis and recommendation.",
    images: ["nbc-1.jpeg"],
  },
  {
    type: "other",
    name: "Sfânt Coffee",
    tags: ["personal", "coffee"],
    role: "Founder & Barista",
    startDate: "2024",
    endDate: "...",
    description:
      "Created a popup coffee shop based in NYC, serving modern coffee drinks and baked goods. Each popup features specialty coffee from local roasters, and a unique ‘special’ drink I create. Profits are donated to charity.",
    images: ["sfant-1.png", "sfant-2.jpeg", "sfant-3.png"],
  },
  {
    type: "work",
    name: "Warner Bros. Discovery",
    tags: ["product", "media"],
    role: "Product Manager",
    startDate: "2023",
    endDate: "2024",
    description:
      "I helped create WBD's first APM cohort and served as the lead PM for the digital properties of legacy Turner (TNT, TBS, truTV), Discovery (TLC, Food Network, HGTV, etc.), and WarnerMedia (Cartoon Network, TCM, etc.) networks. I led projects from start to finish across all platforms (Roku, iOS, web) and helped rebase all legacy techstacks onto a new platform. Additionally, I contributed to a tiger team focused on developing a competitor in the FAST market and helped reimagine how users interact with streaming interfaces.",
    images: ["wb-1.jpeg", "wb-2.jpeg"],
  },
  {
    type: "school",
    name: "Undergrad Rationale",
    tags: ["writing"],
    role: "Writer & Researcher",
    startDate: "2023",
    description:
      "To graduate, I wrote a ~8 page paper that bounded my studies (and self-named degree). This wasn't meant to be an argumentative essay, more so a laying out of topics that would be discussed in a multiple-hour-long ‘colloquium’ (read: discussion) with my primary faculty advisor and another professor. That is why my rationale moves rather quickly and in broad strokes.",
  },
  {
    type: "school",
    name: "Runchuck",
    tags: ["personal"],
    role: "Developer, Designer",
    startDate: "2022",
    description:
      "Runchuck is a playful take on tracking heart rate during your run. Instead of over-fixating on a number (what does 171 really mean?), Runchuck slowly changes a ring of LEDs to different colors to tell you how hard you're working. Final project for NYU ITP's 'Interaction as Art Medium' course.",
    images: ["runchuck-1.jpeg", "runchuck-2.png", "runchuck-3.jpeg"],
  },
  {
    type: "work",
    name: "BlocPower",
    tags: ["product", "growth"],
    role: "Product Manager",
    startDate: "2021",
    description:
      "a16z internship placement. I was charged with improving the top of funnel click-through rate. After conducting a full-site UX audit with Hotjar and pinpointing drop-offs, I designed an end-to-end website overhaul that segmented landing pages by newly identified customer types. To prove the concept, I built three pillar pages in Webflow; they out-performed the legacy site. I distilled the results into a detailed product specification that enabled the Head of Product to secure CEO approval and budget for a full agency-built relaunch. I also collaborated with Growth Marketing to launch HubSpot-integrated, campaign-specific landing pages supporting nationwide ads. Following a new funding round in March 2023, BlocPower rolled out the new design language, marketing assets, and full website—work that began with my internship.",
    images: ["blocpower-1.png"],
  },
  {
    type: "work",
    name: "Anthos Capital",
    tags: ["advising", "venture"],
    role: "Venture Fellow",
    startDate: "2021",
    description:
      "Led site-wide UX audit using Hotjar; uncovered high drop-off on homepage and intake funnel. Designed end-to-end website overhaul (wireframes & mockups) that segmented landing-pages by customer type. Faced initial hesitation but built 3 proof-of-concept pillar pages in Webflow; pages out-performed existing site and lifted funnel conversion 20%. Converted these results into a product spec, enabling Head of Product to secure CEO approval and budget for a full agency-built relaunch that is now live. I also Partnered with Growth Marketing to spin up HubSpot-integrated, campaign-specific landing pages supporting nationwide ads.",
  },
  {
    type: "personal",
    name: "Lumber Sans",
    tags: ["personal", "design"],
    role: "Type Designer",
    startDate: "2020",
    description:
      "Quarantine passion project: hand-built a bespoke all-caps typeface in Glyphs 3, drawing on wood-block printing heritage and Pacific Northwest timber culture. Features hand-carved curves; optimized for headings and posters. Deployed as the primary accent font across my personal site! Inspiration sources: National Park Service signage (Standards Manual “Parks” book) and avant-garde font archives.",
    images: ["lumber-1.png"],
  },
  {
    type: "work",
    name: "Autodesk",
    tags: ["product", "growth"],
    role: "Product Manager",
    startDate: "2019",
    description:
      "One of 12  interns maintaining Autodesk’s Synthesis simulator for FIRST Robotics teams. Owned all “non-dev” responsibilities: community marketing, user research, and product. Ran 4 multi-city “Autodesk Day” feedback events (Portland, MI, Montréal, + virtual); engaged 100+ students and mentors. Insights drove a full UI/UX refresh that I co-led with engineering leads. Side project: co-designed an interactive exhibit for Oregon Museum of Science & Industry (OMSI). Built a custom Tinkercad parts library for kids to drag-and-drop classroom furniture on iPads, encouraging exploration of collaborative spaces (featured on Tinkercad’s official blog).",
    images: ["autodesk-1.jpeg", "autodesk-2.jpeg"],
  },
  {
    type: "work",
    name: "XXcelerate Women",
    tags: ["venture"],
    role: "Writing & Ops Intern",
    startDate: "2018",
    images: ["xxcelerate-1.png"],
  },
  {
    type: "other",
    name: "WashPod",
    tags: ["electrical engineering", "fundraising"],
    role: "Project Lead",
    startDate: "2017",
    description:
      "Lexus Eco Challenge Finalist ($10,000 prize) - A solar powered mobile laundry and shower unit for the Portland homeless. Led 5-member electrical team; designed and wired a solar PV system with charge controller and battery bank to run lighting, washer/dryer, pumps, and water heater—backed by propane generator for winter reliability. Deployed first WashPod at Right 2 Dream Too pod village; continues to serve residents year-round.",
    images: ["washpod-1.jpg", "washpod-2.jpg", "washpod-3.jpg"],
  },
];
