# Purpose / Goal

Create a hero section above ExperienceTable featuring personalStatement overlayed on real-time ASCII art generated from a video. ASCII should have deep blacks, grey depth characters, colorful main elements, and slight glow effect.

# Success Criteria

1. Video converts to ASCII in real-time with target aesthetic: deep blacks, grey depth, colorful main element
2. personalStatement text overlays cleanly and readably on ASCII background
3. ASCII characters have subtle glow effect
4. Runs smoothly at 30fps, degrades gracefully on slow devices
5. Hero section integrates seamlessly above ExperienceTable in Home.astro

# Technical Structure

- `lib/ascii-processor.ts` - core ASCII conversion logic
- `src/assets/videos/ascii-bg.mp4` - source video file
- `src/components/AsciiHero.astro` - hero component with ASCII background + text overlay
- Integration into `Home.astro` as first section before ExperienceTable

# Implementation Notes

- Use canvas for video-to-ASCII conversion
- Character set: dense chars for color, sparse for grey, spaces for black
- CSS text-shadow for glow effect on ASCII characters
- Keep processing lightweight - simple sampling, limited character set

# Notes from an online ascii video processor in the settings (don't have to use if you think you can improve)

- Sample video at lower res (125px width)
- Brightness threshold around 30-40
- Character randomization from custom text
- Dual-color system for depth
- CSS text-shadow for glow
