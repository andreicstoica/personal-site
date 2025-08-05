// ASCII Video Converter - Optimized for performance
// Based on https://github.com/collidingScopes/ascii/blob/main/ASCII.js

export class AsciiVideoConverter {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private video!: HTMLVideoElement;
  private outputElement: HTMLElement;
  private animationId: number | null = null;
  private isPlaying = false;

  // ASCII character set for brightness mapping (from darkest to brightest)
  private readonly asciiChars =
    ".'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  private readonly brightnessThreshold = 0.12; // Only show ASCII for pixels brighter than this
  private readonly targetWidth = 160;
  private readonly targetHeight = 120;

  constructor(videoPath: string, outputElement: HTMLElement) {
    this.outputElement = outputElement;
    this.setupVideo(videoPath);
  }

  private setupVideo(videoPath: string): void {
    this.video = document.createElement("video");
    this.video.crossOrigin = "anonymous";
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;
    this.video.preload = "auto";

    // Optimize for performance
    this.video.style.display = "none";
    document.body.appendChild(this.video);

    // Wait for video to be loaded before setting up
    this.video.addEventListener("loadeddata", () => {
      this.setupCanvas();
    });

    this.video.src = videoPath;
  }

  private setupCanvas(): void {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.targetWidth;
    this.canvas.height = this.targetHeight;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

    // Set canvas properties for better performance
    this.ctx.imageSmoothingEnabled = false;
  }

  public async start(): Promise<void> {
    try {
      // Wait for video to be ready
      if (this.video.readyState < 2) {
        await new Promise<void>((resolve) => {
          this.video.addEventListener(
            "canplay",
            () => {
              resolve();
            },
            { once: true },
          );
        });
      }

      await this.video.play();
      this.isPlaying = true;
      this.renderFrame();
    } catch (error) {
      console.error("Failed to start video:", error);
      this.startFallbackAnimation();
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.video) {
      this.video.pause();
    }
  }

  private renderFrame(): void {
    if (!this.isPlaying || this.video.paused || this.video.ended) {
      return;
    }

    try {
      // Check if video has valid dimensions
      if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
        this.animationId = requestAnimationFrame(() => this.renderFrame());
        return;
      }

      // Clear canvas first
      this.ctx.clearRect(0, 0, this.targetWidth, this.targetHeight);

      // Draw video frame to canvas with proper scaling
      this.ctx.drawImage(this.video, 0, 0, this.targetWidth, this.targetHeight);

      // Get image data for processing
      const imageData = this.ctx.getImageData(
        0,
        0,
        this.targetWidth,
        this.targetHeight,
      );
      const data = imageData.data;

      // Convert to ASCII
      let asciiOutput = "";

      for (let y = 0; y < this.targetHeight; y++) {
        for (let x = 0; x < this.targetWidth; x++) {
          const index = (y * this.targetWidth + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          // Calculate brightness (luminance)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          // Only show ASCII for bright enough pixels, leave dark areas empty
          if (brightness > this.brightnessThreshold) {
            // Map brightness to ASCII character
            const normalizedBrightness =
              (brightness - this.brightnessThreshold) /
              (1 - this.brightnessThreshold);
            const charIndex = Math.floor(
              normalizedBrightness * (this.asciiChars.length - 1),
            );
            asciiOutput += this.asciiChars[charIndex];
          } else {
            asciiOutput += " "; // Empty space for dark areas
          }
        }
        asciiOutput += "\n";
      }

      // Update output
      this.outputElement.textContent = asciiOutput;

      // Continue animation at ~30fps
      this.animationId = requestAnimationFrame(() => this.renderFrame());
    } catch (error) {
      console.error("Error in renderFrame:", error);
      this.startFallbackAnimation();
    }
  }

  private startFallbackAnimation(): void {
    let frame = 0;
    const animate = () => {
      if (!this.isPlaying) return;

      const pattern = this.generateFallbackPattern(frame);
      this.outputElement.textContent = pattern;
      frame++;

      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private generateFallbackPattern(frame: number): string {
    const width = this.targetWidth;
    const height = this.targetHeight;
    const chars = this.asciiChars;
    let pattern = "";

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const time = frame * 0.05;
        const noise =
          Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) * 0.5 + 0.5;
        const charIndex = Math.floor(noise * (chars.length - 1));
        pattern += chars[charIndex];
      }
      pattern += "\n";
    }
    return pattern;
  }

  public destroy(): void {
    this.stop();
    if (this.video && this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
  }
}

export class AsciiImageConverter {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private image!: HTMLImageElement;
  private outputElement: HTMLElement;
  private animationId: number | null = null;
  private isPlaying = false;
  private startTime = Date.now();

  // ASCII character set for brightness mapping (from darkest to brightest)
  private readonly asciiChars =
    ".'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  private readonly brightnessThreshold = 0.12;
  private readonly maxWidth = 160;
  private readonly maxHeight = 120;

  // Animation constants
  private readonly maxSwayAmount = 3;
  private readonly windSpeed = 0.3;
  private readonly swayHeightCutoff = 0.6; // Only top 60% of tree sways

  private targetWidth = 160;
  private targetHeight = 120;

  constructor(
    imagePath: string,
    outputElement: HTMLElement,
    private invertColors: boolean = true,
  ) {
    this.outputElement = outputElement;
    this.setupImage(imagePath);
  }

  private setupImage(imagePath: string): void {
    this.image = document.createElement("img");
    this.image.crossOrigin = "anonymous";
    this.image.style.display = "none";
    document.body.appendChild(this.image);

    // Wait for image to be loaded before setting up
    this.image.addEventListener("load", () => {
      this.calculateAspectRatio();
      this.setupCanvas();
      this.renderFrame();
    });

    this.image.addEventListener("error", (error) => {
      console.error("Failed to load image:", error);
      this.startFallbackAnimation();
    });

    this.image.src = imagePath;
  }

  private calculateAspectRatio(): void {
    const imageAspectRatio = this.image.naturalWidth / this.image.naturalHeight;
    const maxAspectRatio = this.maxWidth / this.maxHeight;

    if (imageAspectRatio > maxAspectRatio) {
      this.targetWidth = this.maxWidth;
      this.targetHeight = Math.floor(this.maxWidth / imageAspectRatio);
    } else {
      this.targetHeight = this.maxHeight;
      this.targetWidth = Math.floor(this.maxHeight * imageAspectRatio);
    }
  }

  private setupCanvas(): void {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.targetWidth;
    this.canvas.height = this.targetHeight;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

    // Set canvas properties for better performance
    this.ctx.imageSmoothingEnabled = false;
  }

  public async start(): Promise<void> {
    try {
      this.isPlaying = true;
      this.startTime = Date.now();
      // If image is already loaded, render immediately
      if (this.image.complete && this.image.naturalHeight !== 0) {
        this.renderFrame();
      }
      // Otherwise renderFrame will be called from the load event
    } catch (error) {
      console.error("Failed to start image:", error);
      this.startFallbackAnimation();
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private renderFrame(): void {
    if (!this.isPlaying) {
      return;
    }

    try {
      // Check if image has valid dimensions
      if (this.image.naturalWidth === 0 || this.image.naturalHeight === 0) {
        return;
      }

      // Clear canvas first
      this.ctx.clearRect(0, 0, this.targetWidth, this.targetHeight);

      // Draw image to canvas with proper scaling
      this.ctx.drawImage(this.image, 0, 0, this.targetWidth, this.targetHeight);

      // Get image data for processing
      const imageData = this.ctx.getImageData(
        0,
        0,
        this.targetWidth,
        this.targetHeight,
      );
      const data = imageData.data;

      // Convert to ASCII with wind animation
      const time = (Date.now() - this.startTime) * 0.001;
      const displayWidth = this.targetWidth + this.maxSwayAmount * 2;
      let asciiOutput = "";

      for (let y = 0; y < this.targetHeight; y++) {
        // Calculate sway for this row (only top portion sways)
        const heightRatio = y / this.targetHeight;
        const swayInfluence =
          heightRatio < this.swayHeightCutoff
            ? (this.swayHeightCutoff - heightRatio) / this.swayHeightCutoff
            : 0;

        const windOffset =
          Math.sin(time * this.windSpeed + y * 0.01) *
          swayInfluence *
          this.maxSwayAmount;
        const leftPadding = this.maxSwayAmount + Math.round(windOffset);

        // Build row with consistent width
        let rowOutput = " ".repeat(Math.max(0, leftPadding));

        for (let x = 0; x < this.targetWidth; x++) {
          const index = (y * this.targetWidth + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          // Calculate brightness (luminance) with optional inversion
          let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          if (this.invertColors) {
            brightness = 1 - brightness;
          }

          // Only show ASCII for bright enough pixels, leave dark areas empty
          if (brightness > this.brightnessThreshold) {
            // Map brightness to ASCII character
            const normalizedBrightness =
              (brightness - this.brightnessThreshold) /
              (1 - this.brightnessThreshold);
            const charIndex = Math.floor(
              normalizedBrightness * (this.asciiChars.length - 1),
            );
            rowOutput += this.asciiChars[charIndex];
          } else {
            rowOutput += " "; // Empty space for dark areas
          }
        }

        // Ensure consistent row width
        const rightPadding = displayWidth - rowOutput.length;
        if (rightPadding > 0) {
          rowOutput += " ".repeat(rightPadding);
        }

        asciiOutput += rowOutput + "\n";
      }

      // Update output
      this.outputElement.textContent = asciiOutput;

      // Continue animation
      this.animationId = requestAnimationFrame(() => this.renderFrame());
    } catch (error) {
      console.error("Error in renderFrame:", error);
      this.startFallbackAnimation();
    }
  }

  private startFallbackAnimation(): void {
    let frame = 0;
    const animate = () => {
      if (!this.isPlaying) return;

      const pattern = this.generateFallbackPattern(frame);
      this.outputElement.textContent = pattern;
      frame++;

      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private generateFallbackPattern(frame: number): string {
    let pattern = "";
    const time = frame * 0.05;

    for (let y = 0; y < this.maxHeight; y++) {
      for (let x = 0; x < this.maxWidth; x++) {
        const noise =
          Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) * 0.5 + 0.5;
        const charIndex = Math.floor(noise * (this.asciiChars.length - 1));
        pattern += this.asciiChars[charIndex];
      }
      pattern += "\n";
    }
    return pattern;
  }

  public destroy(): void {
    this.stop();
    if (this.image && this.image.parentNode) {
      this.image.parentNode.removeChild(this.image);
    }
  }
}
