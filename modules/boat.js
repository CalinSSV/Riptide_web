// boat.js - Enhanced with realistic water movement, buoyancy and particles

import { AssetCache } from './assetLoader.js';
import { PulseSignal } from './signal.js';

/**
 * Creates a boat with realistic physics, water particles and interactions
 * @param {Object} state - Global application state
 * @returns {Object} - Boat object
 */
export function createBoat(state) {
    const { app, layers } = state;
    const { width, height } = app.screen;
    const config = state.config.boat;
    
    // Create boat container
    const container = new PIXI.Container();
    container.position.set(
        width * config.startPosition.x,
        height * config.startPosition.y
    );
    container.interactive = true;
    container.cursor = 'pointer';
    
    // Load the boat texture
    let boatSprite;
    
    try {
        // Load the boat from assets
        boatSprite = new PIXI.Sprite(AssetCache.getTexture('boatTexture'));
        
        // Set anchor to bottom center for better buoyancy effect
        boatSprite.anchor.set(0.5, 0.75);
        
        // Scale to appropriate size relative to screen
        const baseWidth = width * 0.08; // 8% of screen width
        const scale = baseWidth / boatSprite.width;
        boatSprite.scale.set(scale);
    } catch (err) {
        console.error('Error loading boat texture:', err);
        // Fallback to a simple boat shape
        boatSprite = createSimpleBoat(width, height);
    }
    
    // Create receiver halo for signal reception
    const receiverHalo = new PIXI.Graphics();
    receiverHalo.beginFill(0xFFFFFF, 0.2);
    receiverHalo.drawCircle(0, -20, 10);
    receiverHalo.endFill();
    receiverHalo.visible = false; // Hide initially
    
    // Create wake effect behind boat
    const wake = new PIXI.Graphics();
    wake.beginFill(0xFFFFFF, 0.5);
    wake.drawPolygon([
        -25, 0,
        -40, 10,
        -35, 0,
        -40, -10
    ]);
    wake.endFill();
    wake.alpha = 0.4;
    
    // Create water particles container
    const particlesContainer = new PIXI.Container();
    
    // Create shadow under boat
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.3);
    shadow.drawEllipse(0, 5, boatSprite.width * 0.4 * boatSprite.scale.x, boatSprite.height * 0.1 * boatSprite.scale.y);
    shadow.endFill();
    
    // Add everything to the container
    container.addChild(shadow, wake, boatSprite, receiverHalo, particlesContainer);
    
    // Add to entities layer
    layers.entities.addChild(container);
    
    // Set up physics properties
    const physics = {
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        // Original position to track buoyancy
        originalY: container.y,
        // Buoyancy properties
        buoyancyAmplitude: height * 0.005, // 0.5% of screen height
        buoyancyFrequency: 0.02,
        buoyancyPhase: Math.random() * Math.PI * 2, // Random starting phase
        // Boat physics from config
        mass: config.physics.mass,
        buoyancy: config.physics.buoyancy,
        dragCoefficient: config.physics.dragCoefficient
    };
    
    // Set up path following
    const path = {
        points: config.pathPoints.map(p => ({
            x: width * p.x,
            y: height * p.y
        })),
        currentPointIndex: 0,
        speed: config.speed,
        // For smooth rotation
        targetRotation: 0,
        rotationSpeed: config.rotationSpeed
    };
    
    // Initialize particles
    const particles = [];
    const MAX_PARTICLES = 20;
    
    // Create boat object
    const boat = {
        container,
        boatSprite,
        wake,
        receiverHalo,
        physics,
        path,
        particlesContainer,
        particles,
        name: "Research Vessel",
        isReceivingSignal: false,
        signalTimer: 0,
        pulseTimer: 0,
        activePulses: [],
        lastParticleTime: 0,
        
        /**
         * Update boat movement and effects
         * @param {number} delta - Time elapsed
         */
        update(delta) {
            // Update path following
            this.followPath(delta);
            
            // Apply physics and buoyancy
            this.applyPhysics(delta);
            
            // Update wake effect
            this.updateWake(delta);
            
            // Update water particles
            this.updateWaterParticles(delta);
            
            // Update signal reception effects
            this.updateSignalEffects(delta);
        },
        
        /**
         * Follow the predefined path with smooth rotation
         * @param {number} delta - Time elapsed
         */
        followPath(delta) {
            // Get current target point
            const targetPoint = this.path.points[this.path.currentPointIndex];
            
            // Calculate direction to target
            const dx = targetPoint.x - this.container.x;
            const dy = targetPoint.y - this.container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we're close enough to the target, move to next point
            if (distance < 3) {
                this.path.currentPointIndex = (this.path.currentPointIndex + 1) % this.path.points.length;
                return;
            }
            
            // Calculate movement direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Move the boat very slowly for realistic effect
            this.container.x += dirX * this.path.speed * delta;
            this.container.y += dirY * this.path.speed * delta;
            
            // Update physics velocity (for wake effect)
            this.physics.velocity.x = dirX * this.path.speed;
            this.physics.velocity.y = dirY * this.path.speed;
            
            // Calculate target rotation (in radians)
            this.path.targetRotation = Math.atan2(dirY, dirX);
            
            // Smooth rotation with easing
            let rotationDifference = this.path.targetRotation - this.container.rotation;
            
            // Normalize angle difference (-PI to PI)
            while (rotationDifference > Math.PI) rotationDifference -= Math.PI * 2;
            while (rotationDifference < -Math.PI) rotationDifference += Math.PI * 2;
            
            // Apply rotation with smooth easing
            this.container.rotation += rotationDifference * this.path.rotationSpeed * delta;
        },
        
        /**
         * Apply realistic physics including buoyancy
         * @param {number} delta - Time elapsed
         */
        applyPhysics(delta) {
            // Update time-based buoyancy effect
            const time = state.time * this.physics.buoyancyFrequency + this.physics.buoyancyPhase;
            
            // Realistic buoyancy - combination of two sine waves for more natural motion
            const buoyancyOffset = 
                Math.sin(time) * this.physics.buoyancyAmplitude + 
                Math.sin(time * 1.5) * this.physics.buoyancyAmplitude * 0.3;
            
            // Apply buoyancy to Y position
            this.container.y = this.physics.originalY + buoyancyOffset;
            
            // Slight tilt with buoyancy (subtle roll)
            const tiltAmount = Math.sin(time * 1.2) * 0.03;
            this.boatSprite.rotation = tiltAmount;
            
            // Apply wind effects if there's wind
            if (state.weather && state.weather.windIntensity > 0) {
                const windForce = {
                    x: Math.cos(state.weather.windDirection) * state.weather.windIntensity * 0.01,
                    y: Math.sin(state.weather.windDirection) * state.weather.windIntensity * 0.01
                };
                
                this.container.x += windForce.x * delta;
                this.container.y += windForce.y * delta;
            }
        },
        
        /**
         * Update wake effect based on movement and speed
         * @param {number} delta - Time elapsed
         */
        updateWake(delta) {
            // Calculate speed
            const speed = Math.sqrt(
                Math.pow(this.physics.velocity.x, 2) + 
                Math.pow(this.physics.velocity.y, 2)
            );
            
            // Dynamic wake width based on speed
            const wakeWidth = 15 + speed * 20;
            
            // Recreate wake with dynamic size
            this.wake.clear();
            this.wake.beginFill(0xFFFFFF, 0.5);
            this.wake.drawPolygon([
                -15, 0,
                -wakeWidth, 10,
                -wakeWidth * 0.8, 0,
                -wakeWidth, -10
            ]);
            this.wake.endFill();
            
            // Update wake opacity based on speed
            this.wake.alpha = Math.min(0.6, speed * 3);
            
            // Position wake behind boat based on rotation
            const angle = this.container.rotation;
            this.wake.rotation = angle - Math.PI; // Opposite direction
        },
        
        /**
         * Create and update water particles around the boat
         * @param {number} delta - Time elapsed
         */
        updateWaterParticles(delta) {
            // Remove expired particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                
                // Update particle lifetime
                particle.lifetime -= delta;
                
                if (particle.lifetime <= 0) {
                    // Remove particle
                    this.particlesContainer.removeChild(particle.sprite);
                    this.particles.splice(i, 1);
                } else {
                    // Update particle position
                    particle.sprite.x += particle.velocity.x * delta;
                    particle.sprite.y += particle.velocity.y * delta;
                    
                    // Update alpha for fadeout
                    particle.sprite.alpha = particle.lifetime / particle.maxLifetime;
                    
                    // Update scale for shrinking effect
                    const scale = particle.sprite.scale.x - (0.01 * delta);
                    particle.sprite.scale.set(Math.max(0.1, scale));
                }
            }
            
            // Create new particles periodically
            this.lastParticleTime -= delta;
            
            if (this.lastParticleTime <= 0 && this.particles.length < MAX_PARTICLES) {
                // Reset timer (random interval)
                this.lastParticleTime = 5 + Math.random() * 5;
                
                // Create new particle
                this.createWaterParticle();
            }
        },
        
        /**
         * Create a new water particle
         */
        createWaterParticle() {
            // Create particle graphic
            const particleGraphic = new PIXI.Graphics();
            
            // Create water splash/bubble
            const size = 3 + Math.random() * 5;
            const blueShade = Math.floor(Math.random() * 3);
            
            // Different blue colors for variety
            const colors = [0x3A8ED4, 0x4682B4, 0x1E90FF];
            
            particleGraphic.beginFill(colors[blueShade], 0.6);
            particleGraphic.drawCircle(0, 0, size);
            particleGraphic.endFill();
            
            // Convert to sprite for better performance
            const texture = app.renderer.generateTexture(particleGraphic);
            const sprite = new PIXI.Sprite(texture);
            
            // Center anchor
            sprite.anchor.set(0.5);
            
            // Random position around boat
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 15;
            
            sprite.x = Math.cos(angle) * distance;
            sprite.y = Math.sin(angle) * distance;
            
            // Random velocity (slower than the boat)
            const speed = 0.1 + Math.random() * 0.2;
            const velocityAngle = this.container.rotation - Math.PI + (Math.random() - 0.5);
            
            const particle = {
                sprite,
                velocity: {
                    x: Math.cos(velocityAngle) * speed,
                    y: Math.sin(velocityAngle) * speed
                },
                lifetime: 30 + Math.random() * 60, // Random lifetime
                maxLifetime: 30 + Math.random() * 60
            };
            
            // Add to container
            this.particlesContainer.addChild(sprite);
            this.particles.push(particle);
        },
        
        /**
         * Update signal reception effects
         * @param {number} delta - Time elapsed
         */
        updateSignalEffects(delta) {
            // Handle signal reception
            if (this.isReceivingSignal) {
                this.signalTimer += delta;
                
                // Pulse the receiver halo
                this.receiverHalo.visible = true;
                this.receiverHalo.alpha = 0.5 + Math.sin(this.signalTimer * 0.2) * 0.3;
                
                // Create periodic pulse effect
                this.pulseTimer += delta;
                if (this.pulseTimer > 30) {
                    this.pulseTimer = 0;
                    this.createSignalPulse();
                }
                
                // Reset after some time without signals
                if (this.signalTimer > 120) {
                    this.isReceivingSignal = false;
                    this.receiverHalo.visible = false;
                }
            }
            
            // Update active pulse signals
            for (let i = this.activePulses.length - 1; i >= 0; i--) {
                const pulse = this.activePulses[i];
                if (pulse.update(delta)) {
                    // Pulse is complete, remove it
                    pulse.destroy();
                    this.activePulses.splice(i, 1);
                }
            }
        },
        
        /**
         * Create a pulse effect around the boat
         */
        createSignalPulse() {
            const pulse = new PulseSignal(0, 0, 0xFFFFFF, 60);
            this.container.addChild(pulse.container);
            this.activePulses.push(pulse);
        },
        
        /**
         * Handle receiving a signal
         */
        receiveSignal() {
            this.isReceivingSignal = true;
            this.signalTimer = 0;
            
            // Create immediate pulse effect
            this.createSignalPulse();
        },
        
        /**
         * Handle resize event
         * @param {number} width - New width
         * @param {number} height - New height 
         */
        resize(width, height) {
            // Update path points
            this.path.points = config.pathPoints.map(p => ({
                x: width * p.x,
                y: height * p.y
            }));
            
            // Update physics values
            this.physics.originalY = this.path.points[this.path.currentPointIndex].y;
            this.physics.buoyancyAmplitude = height * 0.005;
            
            // Rescale boat if needed
            const baseWidth = width * 0.08;
            const scale = baseWidth / this.boatSprite.width;
            this.boatSprite.scale.set(scale);
            
            // Update shadow
            shadow.clear();
            shadow.beginFill(0x000000, 0.3);
            shadow.drawEllipse(0, 5, this.boatSprite.width * 0.4 * scale, this.boatSprite.height * 0.1 * scale);
            shadow.endFill();
        },
        
        /**
         * Create detailed schematic view of boat
         * @returns {PIXI.Container} - Detailed view container
         */
        createDetailView() {
            const detailContainer = new PIXI.Container();
            
            // Background
            const bg = new PIXI.Graphics();
            bg.beginFill(0x333333);
            bg.drawRect(-200, -150, 400, 300);
            bg.endFill();
            
            // Title
            const title = new PIXI.Text(this.name, {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xFFFFFF,
                align: 'center'
            });
            title.anchor.set(0.5, 0);
            title.position.set(0, -130);
            
            // Boat schematic - placeholder for now
            const schematic = new PIXI.Container();
            
            // Add receiver equipment
            const receiver = new PIXI.Graphics();
            receiver.lineStyle(2, 0xFFFFFF);
            receiver.beginFill(0x666666);
            receiver.drawRect(-80, -50, 160, 100);
            receiver.endFill();
            
            // Add label
            const receiverLabel = new PIXI.Text('Signal Receiver System', {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xFFFFFF
            });
            receiverLabel.anchor.set(0.5, 0);
            receiverLabel.position.set(0, 60);
            
            // Add components - placeholders for the actual schematic
            const components = [
                { name: 'Antenna', x: -60, y: -30, width: 5, height: 60, color: 0x0000FF },
                { name: 'Receiver', x: -20, y: -10, width: 40, height: 20, color: 0x00FF00 },
                { name: 'Processor', x: 30, y: -10, width: 30, height: 30, color: 0xFF0000 },
                { name: 'Display', x: 70, y: -10, width: 25, height: 20, color: 0xFFFF00 }
            ];
            
            components.forEach(comp => {
                const component = new PIXI.Graphics();
                component.beginFill(comp.color);
                component.drawRect(comp.x - comp.width/2, comp.y - comp.height/2, comp.width, comp.height);
                component.endFill();
                
                const label = new PIXI.Text(comp.name, {
                    fontFamily: 'Arial',
                    fontSize: 10,
                    fill: 0xFFFFFF
                });
                label.anchor.set(0.5, 0);
                label.position.set(comp.x, comp.y + comp.height/2 + 5);
                
                schematic.addChild(component, label);
            });
            
            // Add description text
            const description = new PIXI.Text('This research vessel contains a signal receiver system\nthat processes timing signals from coastal lighthouses.', {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xFFFFFF,
                align: 'center'
            });
            description.anchor.set(0.5, 0);
            description.position.set(0, 100);
            
            // Combine all elements
            detailContainer.addChild(bg, title, receiver, receiverLabel, schematic, description);
            
            return detailContainer;
        }
    };
    
    // Set up click handler for zoom
    container.on('pointerdown', () => {
        if (!state.isZoomed) {
            zoomToBoat(boat, state);
        }
    });
    
    return boat;
}

/**
 * Creates a simple boat shape as fallback
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {PIXI.Container} - Boat sprite
 */
function createSimpleBoat(width, height) {
    const container = new PIXI.Container();
    
    // Base dimensions based on screen size
    const boatWidth = width * 0.08; // 8% of screen width
    const boatHeight = boatWidth * 0.6;
    
    // Hull
    const hull = new PIXI.Graphics();
    hull.beginFill(0xEB5E28); // Orange-red hull color
    
    // Draw hull shape
    hull.moveTo(-boatWidth/2, 0);
    hull.lineTo(-boatWidth/2 + boatWidth*0.15, -boatHeight/3);
    hull.lineTo(boatWidth/2 - boatWidth*0.15, -boatHeight/3);
    hull.lineTo(boatWidth/2, 0);
    hull.lineTo(-boatWidth/2, 0);
    
    hull.endFill();
    
    // Deck (top of hull)
    const deck = new PIXI.Graphics();
    deck.beginFill(0xF2E8DC); // Light cream color for deck
    deck.drawRect(-boatWidth/2 + boatWidth*0.15, -boatHeight/3, boatWidth*0.7, boatHeight/10);
    deck.endFill();
    
    // Main cabin structure
    const cabin = new PIXI.Graphics();
    cabin.beginFill(0xF2E8DC); // Light cream color
    
    // Draw cabin box
    cabin.drawRect(
        -boatWidth/3,
        -boatHeight/3 - boatHeight/2,
        boatWidth*2/3,
        boatHeight/2
    );
    cabin.endFill();
    
    // Windows on cabin
    const windows = new PIXI.Graphics();
    windows.beginFill(0x87CEEB); // Light sky blue
    
    // Draw windows on main cabin
    const windowSize = boatWidth * 0.06;
    const windowSpacing = boatWidth * 0.1;
    const windowY = -boatHeight/3 - boatHeight/4;
    
    // Draw 3 windows in a row
    for (let i = 0; i < 3; i++) {
        const windowX = -boatWidth/4 + (i * windowSpacing);
        windows.drawRect(windowX, windowY, windowSize, windowSize);
    }
    
    windows.endFill();
    
    container.addChild(hull, deck, cabin, windows);
    container.pivot.set(0, 0);
    
    return container;
}

/**
 * Handle zooming to the boat
 * @param {Object} boat - Boat to zoom to
 * @param {Object} state - Global state
 */
function zoomToBoat(boat, state) {
    console.log(`Zooming to ${boat.name}`);
    
    // Set zoom state
    state.isZoomed = true;
    state.currentDetailView = boat;
    
    // Store original position and properties
    boat.originalPosition = {
        x: boat.container.x,
        y: boat.container.y,
        scale: boat.container.scale.x,
        rotation: boat.container.rotation
    };
    
    // Fade out other elements
    state.app.stage.children.forEach(layer => {
        if (layer instanceof PIXI.Container) {
            layer.children.forEach(child => {
                if (child !== boat.container) {
                    gsap.to(child, { alpha: 0.2, duration: 0.5 });
                }
            });
        }
    });
    
    // Create zoomed view container
    const zoomedContainer = state.layers.zoomedView;
    zoomedContainer.removeChildren();
    
    // Create detailed view
    const detailView = boat.createDetailView();
    zoomedContainer.addChild(detailView);
    
    // Add back button
    const backButton = createBackButton(state);
    zoomedContainer.addChild(backButton);
    
    // Position zoomed view in center
    zoomedContainer.position.set(
        state.app.screen.width / 2 - detailView.width / 2,
        state.app.screen.height / 2 - detailView.height / 2
    );
    
    // Make zoomed view visible
    zoomedContainer.visible = true;
    zoomedContainer.alpha = 0;
    
    // Zoom animation
    gsap.to(boat.container, {
        x: state.app.screen.width / 2,
        y: state.app.screen.height / 2 - 50,
        scale: 2,
        rotation: 0, // Reset rotation for easier viewing
        duration: 1
    });
    
    gsap.to(zoomedContainer, {
        alpha: 1,
        duration: 0.5,
        delay: 0.8
    });
}

/**
 * Creates a back button for detailed views
 * @param {Object} state - Global state
 * @returns {PIXI.Container} - Back button container
 */
function createBackButton(state) {
    const button = new PIXI.Container();
    button.interactive = true;
    button.cursor = 'pointer';
    
    const bg = new PIXI.Graphics();
    bg.beginFill(0x333333, 0.7);
    bg.drawRoundedRect(0, 0, 80, 30, 5);
    bg.endFill();
    
    const text = new PIXI.Text('← Back', {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xFFFFFF
    });
    text.position.set(10, 5);
    
    button.addChild(bg, text);
    button.position.set(20, 20);
    
    // Handle click
    button.on('pointerdown', () => {
        exitDetailView(state);
    });
    
    return button;
}

/**
 * Exit the detailed boat view
 * @param {Object} state - Global state
 */
function exitDetailView(state) {
    if (!state.isZoomed || !state.currentDetailView) return;
    
    const entity = state.currentDetailView;
    const zoomedContainer = state.layers.zoomedView;
    
    // Fade out zoomed view
    gsap.to(zoomedContainer, {
        alpha: 0,
        duration: 0.5,
        onComplete: () => {
            zoomedContainer.visible = false;
            zoomedContainer.removeChildren();
        }
    });
    
    // Return boat to original position
    gsap.to(entity.container, {
        x: entity.originalPosition.x,
        y: entity.originalPosition.y,
        scale: entity.originalPosition.scale,
        rotation: entity.originalPosition.rotation,
        duration: 1
    });
    
    // Fade in other elements
    state.app.stage.children.forEach(layer => {
        if (layer instanceof PIXI.Container) {
            layer.children.forEach(child => {
                gsap.to(child, { alpha: 1, duration: 0.5 });
            });
        }
    });
    
    // Reset zoom state
    state.isZoomed = false;
    state.currentDetailView = null;
}