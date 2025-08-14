import type { Experience } from "./types";

export const personalStatement =
  "Builder with a background in product, VC, design, and full-stack development. I'm especially interested in how AI can help people reflect, express themselves, connect, and navigate the internet better. I work best when I can take a strong idea kernel and shape it by iterating quickly with others.<br><br>Lately I've been exploring reflective AI tools with a focus on simple interfaces that feel intuitive and well considered, and have been writing about it on my <a target='_blank' href='https://blog.andrei.bio/'>blog</a>. I care about how things feel and the side effects systems create, not just how they function.";

export const experiences: Experience[] = [
  {
    type: "work",
    name: "Freelance Engineer",
    tags: ["work", "code"],
    role: "Full Stack Software Engineer",
    startDate: "2025",
    description: `Software engineering work across various industries including med-tech and research platforms. Focused on quickly shipping performant web applications and improving user experience.
<br><br>
Selected Projects:
- {{project:stance-health}} – chronic health therapy med-tech startup
- {{project:holdfast-network}} – NOAA aquaculture research platform`,
    images: ["stance-health-1.jpeg", "holdfast-1.png"],
    projects: [
      { projectId: "stance-health", displayText: "Stance Health" },
      { projectId: "holdfast-network", displayText: "Holdfast Network" },
    ],
  },
  {
    type: "personal",
    name: "Fractal AI Accelerator",
    tags: ["personal", "code"],
    role: "Software Engineer",
    startDate: "2025",
    description: `Spent 60+ hours per week for 3 months learning React, NextJS, Vercel, Auth, tRPC, AI SDK/API, React Native, Postgresql, Typescript, Sentry, etc. <span class="speed-highlight">All built within 6 days</span>.
<br><br>
Selected Projects:
- {{project:blob-game}} – clicker game built with TS/React
- {{project:courtly}} – tennis practice session (AI generated) React Native and web app
- {{project:algos-visualized}} – visualized using Framer Motion and CSS animations
- {{project:tarot-chat}} – daily tarot reading chat website`,
    images: [
      "blob-game.gif",
      "tarot-response.gif",
      "fractal-2.png",
      "courtly-ios-home.png",
      "blob-end.png",
    ],
    projects: [
      { projectId: "blob-game", displayText: "Blob Game" },
      { projectId: "courtly", displayText: "Courtly" },
      { projectId: "algos-visualized", displayText: "Algos, Visualized" },
    ],
  },
  {
    type: "work",
    name: "NBCUniversal",
    tags: ["product", "media"],
    role: "Product Manager",
    startDate: "2024",
    endDate: "2025",
    description:
      "I led discovery and scoping of an AI-aided fact-checking tool for journalists, correspondents, and producers. This included technically defining what NBCU defined as a 'fact' in collaboration with Standards. I also spearheaded an NBCU News Group wide people, places, and things scheduling software vendor analysis and recommendation.",
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
      "Created a popup coffee shop based in NYC, serving modern coffee drinks and baked goods. Each popup features specialty coffee from local roasters, and a unique 'special' drink I create. Profits are donated to charity.",
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
      "I helped create WBD's first APM cohort and served as the lead PM for the digital properties of legacy Turner (like TNT), Discovery (TLC, HGTV, etc.), and WarnerMedia (Cartoon Network) networks. I led projects from start to finish across all platforms and helped rebase all legacy techstacks onto a new platform. Additionally, I contributed to a tiger team focused on developing a competitor in the FAST market.",
    images: ["wb-1.jpeg", "wb-2.jpeg"],
  },
  {
    type: "school",
    name: "Rationale",
    tags: ["writing"],
    role: "Writer & Researcher",
    startDate: "2023",
    description:
      "To graduate, I wrote a ~8 page paper that bounded my studies (and self-named degree). This wasn't meant to be an argumentative essay, more so a laying out of topics that would be discussed in a multiple-hour-long 'colloquium' (read: discussion) with my primary faculty advisor and another professor. That is why my rationale moves rather quickly and in broad strokes.",
  },
  {
    type: "school",
    name: "RunChuck",
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
      "a16z internship placement. Conducted full-site UX audit with Hotjar and found drop-offs. Redesigned an end-to-end website that segmented landing pages by newly identified customer types. I then distilled test results into a detailed product spec that enabled the Head of Product to secure CEO approval and budget for a full agency-built relaunch. I also collaborated with Growth Marketing to launch HubSpot-integrated, campaign-specific landing pages supporting nationwide ads.",
    images: ["blocpower-1.png"],
  },
  {
    type: "work",
    name: "Anthos Capital",
    tags: ["advising", "venture"],
    role: "Venture Fellow",
    startDate: "2021",
    description:
      "Built product research library for Anthos Capital's portfolio companies. Advised ESG product strategy.",
  },
  {
    type: "personal",
    name: "Lumber Sans",
    tags: ["personal", "design"],
    role: "Type Designer",
    startDate: "2020",
    description:
      "Quarantine passion project: hand-built a bespoke all-caps typeface in Glyphs 3, drawing on wood-block printing heritage and Pacific Northwest timber culture. Features hand-carved curves; optimized for headings and posters. Deployed as the primary accent font across my personal site! Inspiration sources: National Park Service signage (Standards Manual 'Parks' book) and avant-garde font archives.",
    images: ["lumber-1.png"],
  },
  {
    type: "work",
    name: "Autodesk",
    tags: ["product", "growth"],
    role: "Product Manager",
    startDate: "2019",
    description:
      "Owned all 'non-dev' responsibilities: community marketing, user research, and product. Ran 4 multi-city 'Autodesk Day' feedback events globally and online; engaged 100+ students and mentors. Insights drove a full UI/UX refresh that I co-led with engineering leads. Side project: co-designed an interactive exhibit for Oregon Museum of Science & Industry (OMSI). Built a custom Tinkercad parts library for kids to drag-and-drop classroom furniture on iPads, encouraging exploration of collaborative spaces (featured on Tinkercad's official blog).",
    images: ["autodesk-1.jpeg", "autodesk-2.jpeg"],
  },
  {
    type: "work",
    name: "XXcelerate Women",
    tags: ["venture"],
    role: "Writing & Ops Intern",
    startDate: "2018",
    images: ["xxcelerate-1.png"],
    description:
      "I was a writing intern for XXcelerate Women, a venture capital firm that invests in women-led startups. I wrote blog posts, researched companies, and helped organize events, securing Oregon Senator Ron Wyden as a speaker!",
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
