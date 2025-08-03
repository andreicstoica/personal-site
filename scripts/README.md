# Video Transcoding Script

This script processes your `ascii-bg.mp4` video into optimized ASCII art frames for instant web playback.

## Prerequisites

1. **FFmpeg** - Required for video frame extraction

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Node.js dependencies**
   ```bash
   npm install
   ```

## Usage

1. **Run the transcoding script:**

   ```bash
   npm run transcode
   ```

2. **The script will:**
   - Extract frames from `src/assets/videos/ascii-bg.mp4`
   - Convert each frame to ASCII art using the settings from your image
   - Optimize for web playback (15 FPS, 300 max frames)
   - Save the result to `public/data/ascii-frames.json`

## Settings

The script uses these optimized settings based on your requirements:

- **FPS**: 15 (reduced for performance)
- **Max Frames**: 300 (keeps file size manageable)
- **Resolution**: 80x40 characters
- **Colors**: Uses your CSS variables for consistent theming
- **Background**: Gradient enabled with your secondary color
- **Font**: Primary blue color with white secondary

## Output

The generated `ascii-frames.json` file contains:

- Array of ASCII frame strings
- FPS information
- Original settings used
- Metadata about the processing

## Performance

- **File Size**: ~50-100KB (much smaller than raw video)
- **Load Time**: Instant (no video decoding needed)
- **CPU Usage**: Minimal (just string rendering)
- **Memory**: Low (pre-rendered frames)

## Customization

Edit `scripts/transcode-video.js` to modify:

- Frame rate (`PROCESSING_CONFIG.fps`)
- Frame count (`PROCESSING_CONFIG.maxFrames`)
- Output resolution (`PROCESSING_CONFIG.outputWidth/Height`)
- ASCII settings (`ASCII_SETTINGS`)

## Troubleshooting

- **FFmpeg not found**: Install FFmpeg first
- **Canvas error**: Run `npm install` to get the canvas dependency
- **Large file size**: Reduce `maxFrames` or `fps` in the config
- **Poor quality**: Increase `outputWidth/Height` in the config
