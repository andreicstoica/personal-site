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
    private readonly asciiChars = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
    private readonly targetWidth = 120;
    private readonly targetHeight = 60;

    constructor(videoPath: string, outputElement: HTMLElement) {
        this.outputElement = outputElement;
        this.setupVideo(videoPath);
    }

    private setupVideo(videoPath: string): void {
        this.video = document.createElement('video');
        this.video.crossOrigin = 'anonymous';
        this.video.muted = true;
        this.video.loop = true;
        this.video.playsInline = true;
        this.video.preload = 'auto';

        // Optimize for performance
        this.video.style.display = 'none';
        document.body.appendChild(this.video);

        // Wait for video to be loaded before setting up
        this.video.addEventListener('loadeddata', () => {
            this.setupCanvas();
        });

        this.video.src = videoPath;
    }

    private setupCanvas(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.targetWidth;
        this.canvas.height = this.targetHeight;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

        // Set canvas properties for better performance
        this.ctx.imageSmoothingEnabled = false;
    }

    public async start(): Promise<void> {
        try {
            console.log('Starting ASCII video...');

            // Wait for video to be ready
            if (this.video.readyState < 2) {
                await new Promise<void>((resolve) => {
                    this.video.addEventListener('canplay', () => {
                        resolve();
                    }, { once: true });
                });
            }

            await this.video.play();
            this.isPlaying = true;
            this.renderFrame();
        } catch (error) {
            console.error('Failed to start video:', error);
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
            const imageData = this.ctx.getImageData(0, 0, this.targetWidth, this.targetHeight);
            const data = imageData.data;

            // Convert to ASCII
            let asciiOutput = '';

            for (let y = 0; y < this.targetHeight; y++) {
                for (let x = 0; x < this.targetWidth; x++) {
                    const index = (y * this.targetWidth + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    // Calculate brightness (luminance)
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

                    // Map brightness to ASCII character (inverted for dark background)
                    const charIndex = Math.floor((1 - brightness) * (this.asciiChars.length - 1));
                    asciiOutput += this.asciiChars[charIndex];
                }
                asciiOutput += '\n';
            }

            // Update output
            this.outputElement.textContent = asciiOutput;

            // Continue animation at ~30fps
            this.animationId = requestAnimationFrame(() => this.renderFrame());
        } catch (error) {
            console.error('Error in renderFrame:', error);
            this.startFallbackAnimation();
        }
    }

    private startFallbackAnimation(): void {
        console.log('Starting fallback animation...');
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
        let pattern = '';

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const time = frame * 0.05;
                const noise = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) * 0.5 + 0.5;
                const charIndex = Math.floor(noise * (chars.length - 1));
                pattern += chars[charIndex];
            }
            pattern += '\n';
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