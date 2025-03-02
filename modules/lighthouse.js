// lighthouse.js - Handles lighthouse creation, logic, and signals

import { AssetCache } from './assetLoader.js';
import { Signal } from './signal.js';

/**
 * Creates lighthouses at specified positions
 * @param {Object} state - Global application state
 * @returns {Array} - Array of lighthouse objects
 */
export function createLighthouses(state) {
    const { app, layers } = state;
    const { width, height } = app.screen;
    const config = state.config.lighthouse;
    
    const lighthouses = [];
    
    // Create each lighthouse
    config.positions.forEach((pos, index) => {
        const lighthouse = createLighthouse(
            width * pos.x,
            height * pos.y,
            pos.name,
            config.colors[index % config.colors.length],
            config,
            state
        );
        
        layers.structures.addChild(lighthouse.container);
        lighthouses.push(lighthouse);
    });
    
    return lighthouses;
}

/**
 * Creates a single lighthouse
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} name - Lighthouse name
 * @param {number} color - Light color
 * @param {Object} config - Lighthouse configuration
 * @param {Object} state - Global application state
 * @returns {Object} - Lighthouse object
 */
function createLighthouse(x, y, name, color, config, state) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.interactive = true;
    container.cursor = 'pointer';
    
    // Try to use loaded texture if available
    let lighthouseSprite;
    
    try {
        lighthouseSprite = new PIXI.Sprite(AssetCache.getTexture('lighthouseTexture'));
        
        // Adjust anchor point and scale
        lighthouseSprite.anchor.set(0.5, 1); // Bottom center
        
        // Scale the lighthouse image to a reasonable size
        const scale = 0.3; // Adjust this value as needed for your image
        lighthouseSprite.scale.set(scale);
        
        console.log(`Lighthouse texture loaded for ${name}`);
    } catch (err) {
        console.warn(`Could not load lighthouse texture for ${name}, creating placeholder`, err);
        
        // Fallback to creating a simple lighthouse
        lighthouseSprite = new PIXI.Container();
        
        // Base/Tower
        const tower = new PIXI.Graphics();
        tower.beginFill(0xFFFFFF); // White
        tower.drawRect(-10, -60, 20, 60); // Tower
        tower.endFill();
        
        // Add stripes
        for (let i = 0; i < 4; i++) {
            const stripe = new PIXI.Graphics();
            stripe.beginFill(0xFF0000); // Red
            stripe.drawRect(-10, -55 + i * 15, 20, 5); // Horizontal stripes
            stripe.endFill();
            tower.addChild(stripe);
        }
        
        // Top/lantern room
        const top = new PIXI.Graphics();
        top.beginFill(0x333333); // Dark gray
        top.drawRect(-12, -70, 24, 10);
        top.endFill();
        
        lighthouseSprite.addChild(tower, top);
    }
    
    // Light source
    const light = new PIXI.Graphics();
    light.beginFill(color);
    
    // Position the light at the top of the lighthouse
    // For the sprite, we'll position it relative to the sprite's dimensions
    const lightY = lighthouseSprite instanceof PIXI.Sprite ? 
        -lighthouseSprite.height * lighthouseSprite.anchor.y : -65;
    
    light.drawCircle(0, lightY, 5);
    light.endFill();
    
    // Add light glow effect
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.3);
    glow.drawCircle(0, lightY, 10);
    glow.endFill();
    
    // Add shadow
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.3);
    shadow.drawEllipse(5, 0, 15, 5);
    shadow.endFill();
    
    // Combine all elements
    container.addChild(shadow, lighthouseSprite, light, glow);
    
    // Store references
    const lighthouse = {
        container,
        light,
        glow,
        name,
        color,
        signalTimer: Math.floor(Math.random() * config.signalRate),
        blinkTimer: 0,
        lightY, // Store light Y position for signal creation
        
        /**
         * Update lighthouse animations
         * @param {number} delta - Time elapsed
         */
        update(delta) {
            // Blink the light
            this.blinkTimer += delta;
            if (this.blinkTimer >= config.blinkRate) {
                this.blinkTimer = 0;
            }
            
            // Pulse the light intensity
            const blinkPhase = this.blinkTimer / config.blinkRate;
            const intensity = 0.7 + Math.sin(blinkPhase * Math.PI * 2) * 0.3;
            
            light.alpha = intensity;
            glow.alpha = intensity * 0.5;
            
            // Handle signal creation
            this.signalTimer += delta;
            if (this.signalTimer >= config.signalRate && !state.isZoomed) {
                this.signalTimer = 0;
                this.createSignal(state.entities.boat);
            }
        },
        
        /**
         * Create a signal from this lighthouse to the boat
         * @param {Object} boat - The boat object
         * @returns {Object} - New signal object
         */
        createSignal(boat) {
            if (!boat) return null;
            
            // Create a sine wave signal
            const signal = new Signal(
                this.container.x,
                this.container.y + this.lightY, // Use stored light Y position
                boat.container.x,
                boat.container.y - 20, // Boat receiver position
                this.color,
                config.signalSpeed
            );
            
            // Add to effects layer
            state.layers.effects.addChild(signal.container);
            
            return signal;
        },
        
        /**
         * Handle resize
         * @param {number} width - New width
         * @param {number} height - New height
         */
        resize(width, height) {
            // Update position based on config
            const pos = config.positions.find(p => p.name === this.name);
            if (pos) {
                this.container.x = width * pos.x;
                this.container.y = height * pos.y;
            }
        },
        
        /**
         * Create detailed view of lighthouse internals
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
            
            // Lighthouse schematic - placeholder for now
            const schematic = new PIXI.Container();
            
            // Add transmitter equipment
            const transmitter = new PIXI.Graphics();
            transmitter.lineStyle(2, 0xFFFFFF);
            transmitter.beginFill(0x666666);
            transmitter.drawRect(-80, -50, 160, 100);
            transmitter.endFill();
            
            // Add label
            const transmitterLabel = new PIXI.Text('Transmitter System', {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xFFFFFF
            });
            transmitterLabel.anchor.set(0.5, 0);
            transmitterLabel.position.set(0, 60);
            
            // Add components - placeholders for the actual schematic
            const components = [
                { name: 'Oscillator', x: -60, y: -30, width: 40, height: 30, color: 0xFF0000 },
                { name: 'Amplifier', x: 0, y: -30, width: 40, height: 30, color: 0x00FF00 },
                { name: 'Antenna', x: 60, y: -30, width: 10, height: 60, color: 0x0000FF }
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
            const description = new PIXI.Text('This lighthouse contains a signal transmitter system\nthat sends precise timing signals to nearby vessels.', {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xFFFFFF,
                align: 'center'
            });
            description.anchor.set(0.5, 0);
            description.position.set(0, 100);
            
            // Combine all elements
            detailContainer.addChild(bg, title, transmitter, transmitterLabel, schematic, description);
            
            return detailContainer;
        }
    };
    
    // Set up click handler for zoom
    container.on('pointerdown', () => {
        if (!state.isZoomed) {
            zoomToLighthouse(lighthouse, state);
        }
    });
    
    return lighthouse;
}

/**
 * Handle zooming to a lighthouse
 * @param {Object} lighthouse - Lighthouse to zoom to
 * @param {Object} state - Global state
 */
function zoomToLighthouse(lighthouse, state) {
    console.log(`Zooming to ${lighthouse.name}`);
    
    // Set zoom state
    state.isZoomed = true;
    state.currentDetailView = lighthouse;
    
    // Store original position
    lighthouse.originalPosition = {
        x: lighthouse.container.x,
        y: lighthouse.container.y,
        scale: lighthouse.container.scale.x
    };
    
    // Fade out other elements
    state.app.stage.children.forEach(layer => {
        if (layer instanceof PIXI.Container) {
            layer.children.forEach(child => {
                if (child !== lighthouse.container) {
                    gsap.to(child, { alpha: 0.2, duration: 0.5 });
                }
            });
        }
    });
    
    // Create zoomed view container
    const zoomedContainer = state.layers.zoomedView;
    zoomedContainer.removeChildren();
    
    // Create detailed view
    const detailView = lighthouse.createDetailView();
    zoomedContainer.addChild(detailView);
    
    // Add back button
    const backButton = createBackButton(state);
    zoomedContainer.addChild(backButton);
    
    // Make zoomed view visible
    zoomedContainer.visible = true;
    zoomedContainer.alpha = 0;
    
    // Zoom animation
    gsap.to(lighthouse.container, {
        x: state.app.screen.width / 2,
        y: state.app.screen.height / 2 - 50,
        scale: lighthouse.container.scale.x * 2,
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
 * Exit the detailed lighthouse view
 * @param {Object} state - Global state
 */
function exitDetailView(state) {
    if (!state.isZoomed || !state.currentDetailView) return;
    
    const lighthouse = state.currentDetailView;
    const zoomedContainer = state.layers.zoomedView;
    
    // Fade out zoomed view
    gsap.to(zoomedContainer, {
        alpha: 0,
        duration: 0.5,
        onComplete: () => {
            zoomedContainer.visible = false;
        }
    });
    
    // Return lighthouse to original position
    gsap.to(lighthouse.container, {
        x: lighthouse.originalPosition.x,
        y: lighthouse.originalPosition.y,
        scale: lighthouse.originalPosition.scale,
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