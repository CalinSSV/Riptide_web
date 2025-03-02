// signal.js - Handles signal effects between lighthouses and boat

/**
 * Creates a signal transmitted from lighthouse to boat
 */
export class Signal {
    /**
     * Create a new signal
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} endX - Target X position
     * @param {number} endY - Target Y position
     * @param {number} color - Signal color
     * @param {number} speed - Signal speed
     */
    constructor(startX, startY, endX, endY, color, speed) {
        // Create container for signal
        this.container = new PIXI.Container();
        
        // Store properties
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = color;
        this.speed = speed || 0.01;
        this.progress = 0;
        this.amplitude = 10;
        this.frequency = 0.1;
        
        // Calculate signal path
        this.pathLength = Math.sqrt(
            Math.pow(this.endX - this.startX, 2) + 
            Math.pow(this.endY - this.startY, 2)
        );
        
        this.angle = Math.atan2(
            this.endY - this.startY, 
            this.endX - this.startX
        );
        
        // Create graphics for signal
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
        
        // Position container at start
        this.container.position.x = this.startX;
        this.container.position.y = this.startY;
        
        // Initial draw
        this.draw();
    }
    
    /**
     * Draw signal wave
     */
    draw() {
        this.graphics.clear();
        this.graphics.lineStyle(2, this.color, 0.7);
        
        // Calculate current signal length based on progress
        const currentLength = this.pathLength * this.progress;
        
        // Draw sine wave
        this.graphics.moveTo(0, 0);
        
        // Calculate wave points
        const points = 20; // Number of points to draw
        
        for (let i = 1; i <= points; i++) {
            const segmentLength = (i / points) * currentLength;
            
            // Calculate sine wave offset
            const waveOffset = Math.sin(segmentLength * this.frequency) * this.amplitude;
            
            // Calculate position in direction of signal
            const x = segmentLength * Math.cos(this.angle);
            const y = segmentLength * Math.sin(this.angle);
            
            // Calculate perpendicular offset for wave
            const perpX = -Math.sin(this.angle) * waveOffset;
            const perpY = Math.cos(this.angle) * waveOffset;
            
            // Draw to point
            this.graphics.lineTo(x + perpX, y + perpY);
        }
    }
    
    /**
     * Update signal animation
     * @param {number} delta - Time elapsed
     * @returns {boolean} - True if signal is complete
     */
    update(delta) {
        // Update progress
        this.progress += this.speed * delta;
        
        // Redraw signal
        this.draw();
        
        // Return true when signal reaches target
        return this.progress >= 1;
    }
    
    /**
     * Clean up signal resources
     */
    destroy() {
        // Remove from parent
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        
        // Clean up PIXI resources
        this.graphics.clear();
        this.container.destroy({ children: true });
    }
}

/**
 * Create a signal that pulses outward from a source
 */
export class PulseSignal {
    /**
     * Create a new pulse signal
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} color - Signal color
     * @param {number} duration - Signal duration
     */
    constructor(x, y, color, duration) {
        // Create container
        this.container = new PIXI.Container();
        this.container.position.set(x, y);
        
        // Store properties
        this.color = color;
        this.duration = duration || 60; // Frames
        this.timer = 0;
        this.maxRadius = 50;
        
        // Create graphics
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
        
        // Initial draw
        this.draw();
    }
    
    /**
     * Draw pulse signal
     */
    draw() {
        this.graphics.clear();
        
        // Calculate current radius and alpha
        const progress = this.timer / this.duration;
        const radius = this.maxRadius * progress;
        const alpha = 1 - progress;
        
        // Draw circle
        this.graphics.lineStyle(2, this.color, alpha);
        this.graphics.drawCircle(0, 0, radius);
    }
    
    /**
     * Update pulse animation
     * @param {number} delta - Time elapsed
     * @returns {boolean} - True if pulse is complete
     */
    update(delta) {
        // Update timer
        this.timer += delta;
        
        // Redraw
        this.draw();
        
        // Return true when pulse is complete
        return this.timer >= this.duration;
    }
    
    /**
     * Clean up pulse resources
     */
    destroy() {
        // Remove from parent
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        
        // Clean up PIXI resources
        this.graphics.clear();
        this.container.destroy({ children: true });
    }
}