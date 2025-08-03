#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ASCII.js settings based on your image
const ASCII_SETTINGS = {
  backgroundColor: "#2ceb9c",
  bgGradient: true,
  bgSaturation: 70,
  fontColor: "#3848ff",
  fontColor2: "#ffffff",
  fontSizeFactor: 5,
  resolution: 96,
  threshold: 5,
  invert: false,
  randomness: 2,
  textType: "Random Text"
};

// Video processing settings
const PROCESSING_CONFIG = {
  fps: 15, // Reduced for performance
  maxFrames: 300, // Limit frames for smaller file size
  outputWidth: 80,
  outputHeight: 40
};

async function transcodeVideo() {
  console.log('🎬 Starting video transcoding...');
  
  const videoPath = path.join(__dirname, '../src/assets/videos/ascii-bg.mp4');
  const outputPath = path.join(__dirname, '../public/data/ascii-frames.json');
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Extract frames from video using ffmpeg
    console.log('📹 Extracting video frames...');
    const framesDir = path.join(__dirname, '../temp/frames');
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
    
    // Extract frames at specified FPS
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -vf "fps=${PROCESSING_CONFIG.fps},scale=${PROCESSING_CONFIG.outputWidth}:${PROCESSING_CONFIG.outputHeight}" -frame_pts 1 "${framesDir}/frame_%04d.png"`;
    
    console.log('Running ffmpeg command...');
    execSync(ffmpegCmd, { stdio: 'inherit' });
    
    // Process frames to ASCII
    console.log('🖼️ Converting frames to ASCII...');
    const frames = [];
    const frameFiles = fs.readdirSync(framesDir)
      .filter(file => file.endsWith('.png'))
      .sort()
      .slice(0, PROCESSING_CONFIG.maxFrames);
    
    for (let i = 0; i < frameFiles.length; i++) {
      const frameFile = frameFiles[i];
      const framePath = path.join(framesDir, frameFile);
      
      // Convert image to ASCII using a simple algorithm
      const asciiFrame = await convertImageToAscii(framePath);
      frames.push(asciiFrame);
      
      if (i % 10 === 0) {
        console.log(`Processed ${i + 1}/${frameFiles.length} frames`);
      }
    }
    
    // Create optimized output
    const outputData = {
      frames,
      fps: PROCESSING_CONFIG.fps,
      settings: ASCII_SETTINGS,
      metadata: {
        originalVideo: 'ascii-bg.mp4',
        processedAt: new Date().toISOString(),
        frameCount: frames.length,
        dimensions: {
          width: PROCESSING_CONFIG.outputWidth,
          height: PROCESSING_CONFIG.outputHeight
        }
      }
    };
    
    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`✅ Transcoding complete! Output saved to: ${outputPath}`);
    console.log(`📊 Generated ${frames.length} frames at ${PROCESSING_CONFIG.fps} FPS`);
    
    // Clean up temp files
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(framesDir, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Transcoding failed:', error);
    process.exit(1);
  }
}

async function convertImageToAscii(imagePath) {
  // Simple ASCII conversion using canvas
  const { createCanvas, loadImage } = require('canvas');
  
  try {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(PROCESSING_CONFIG.outputWidth, PROCESSING_CONFIG.outputHeight);
    const ctx = canvas.getContext('2d');
    
    // Draw image to canvas
    ctx.drawImage(image, 0, 0, PROCESSING_CONFIG.outputWidth, PROCESSING_CONFIG.outputHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, PROCESSING_CONFIG.outputWidth, PROCESSING_CONFIG.outputHeight);
    const data = imageData.data;
    
    // ASCII characters from dark to light
    const asciiChars = ' .:-=+*#%@';
    
    let asciiOutput = '';
    
    for (let y = 0; y < PROCESSING_CONFIG.outputHeight; y++) {
      for (let x = 0; x < PROCESSING_CONFIG.outputWidth; x++) {
        const index = (y * PROCESSING_CONFIG.outputWidth + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Convert to grayscale
        const gray = (r + g + b) / 3;
        
        // Map to ASCII character
        const charIndex = Math.floor((gray / 255) * (asciiChars.length - 1));
        asciiOutput += asciiChars[charIndex];
      }
      asciiOutput += '\n';
    }
    
    return asciiOutput;
    
  } catch (error) {
    console.error('Error converting image to ASCII:', error);
    return 'Error processing frame';
  }
}

// Run the transcoding
if (require.main === module) {
  transcodeVideo();
}

module.exports = { transcodeVideo }; 