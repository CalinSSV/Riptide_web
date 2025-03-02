// dayNightCycle.js - Handles day/night cycle transitions

import { AssetCache } from './assetLoader.js';

/**
 * Initializes the day/night cycle system
 * @param {Object} state - Global application state
 * @returns {Object} - Day/night system
 */
export function initializeDayNightCycle(state) {
    const { app, layers } = state;
    const { width, height } = app.screen;
    const config = state.config.dayNightCycle;
    
    // Create sky overlay for color transitions
    const skyOverlay = new PIXI.Graphics();
    skyOverlay.beginFill(0x000000);
    skyOverlay.drawRect(0, 0, width, height);
    skyOverlay.endFill();
    skyOverlay.alpha = 0; // Start with full day
    
    // Create sun and moon
    const sun = createSun();
    const moon = createMoon();
    
    // Add to sky layer
    layers.sky.addChild(skyOverlay, sun, moon);
    
    // Set initial positions
    sun.position.set(width * 0.8, height * 0.2);
    moon.position.set(width * 0.2, height * 0.2);
    moon.alpha = 0; // Hide moon initially
    
    // Create stars (visible at night)
    const stars = createStars(width, height);
    stars.alpha = 0; // Hide stars initially
    layers.sky.addChildAt(stars, 0); // Add behind sun/moon
    
    // Track time
    let timeOfDay = 0; // 0 to 1 representing day cycle
    let totalTime = 0;
    let isDay = true;
    
    // Duration constants
    const totalDuration = config.dayDuration + config.nightDuration;
    
    // Create and return day/night system
    const dayNightSystem = {
        timeOfDay,
        isDay,
        
        /**
         * Update day/night cycle
         * @param {number} delta - Time elapsed
         */
        update(delta) {
            // Update total time
            totalTime += delta;
            
            // Calculate time of day (0 to 1)
            timeOfDay = (totalTime % totalDuration) / totalDuration;
            
            // Determine if it's day or night
            const dayTransitionPoint = config.dayDuration / totalDuration;
            const newIsDay = timeOfDay < dayTransitionPoint;
            
            // Handle day/night transitions
            if (newIsDay !== isDay) {
                isDay = newIsDay;
                state.isDay = isDay;
                console.log(`Transitioning to ${isDay ? 'day' : 'night'}`);
            }
            
            // Update sky color
            this.updateSkyColor(timeOfDay, dayTransitionPoint);
            
            // Update sun and moon positions
            this.updateCelestialBodies(timeOfDay, width, height);
            
            // Update star visibility
            stars.alpha = isDay ? 0 : 0.8;
            
            // Update water reflections in the map
            if (state.entities.map && state.entities.map.water) {
                const waterReflectionColor = isDay ? config.dayColor : config.nightColor;
                const reflectionIntensity = isDay ? 0.2 : 0.5;
                state.entities.map.water.setReflection(reflectionIntensity, waterReflectionColor);
            }
        },
        
        /**
         * Update sky color based on time of day
         * @param {number} time - Current time (0-1)
         * @param {number} dayTransitionPoint - Point where day transitions to night
         */
        updateSkyColor(time, dayTransitionPoint) {
            // Calculate day position (0 to 1 within day)
            const dayPosition = time < dayTransitionPoint 
                ? time / dayTransitionPoint 
                : (time - dayTransitionPoint) / (1 - dayTransitionPoint);
            
            // Handle transitions (dawn, day, dusk, night)
            let targetAlpha;
            
            if (isDay) {
                // Day to night transition
                const transitionDuration = config.transitionDuration / config.dayDuration;
                
                if (dayPosition < transitionDuration) {
                    // Dawn - getting brighter
                    targetAlpha = 0.5 - dayPosition / transitionDuration * 0.5;
                } else if (dayPosition > (1 - transitionDuration)) {
                    // Dusk - getting darker
                    const duskPosition = (dayPosition - (1 - transitionDuration)) / transitionDuration;
                    targetAlpha = duskPosition * 0.5;
                    
                    // Set sky color to sunset
                    skyOverlay.tint = config.sunsetColor;
                } else {
                    // Full day
                    targetAlpha = 0;
                }
            } else {
                // Night time
                targetAlpha = 0.7; // Darkness level
                skyOverlay.tint = config.nightColor;
            }
            
            // Apply change to sky overlay
            skyOverlay.alpha = targetAlpha;
        },
        
        /**
         * Update sun and moon positions
         * @param {number} time - Current time (0-1)
         * @param {number} width - Canvas width
         * @param {number} height - Canvas height 
         */
        updateCelestialBodies(time, width, height) {
            // Calculate position along circular path
            const angle = time * Math.PI * 2 - Math.PI/2;
            const radius = Math.min(width, height) * 0.4;
            
            // Sun position (opposite of moon)
            const sunX = width/2 + Math.cos(angle) * radius;
            const sunY = height * 0.5 + Math.sin(angle) * radius * 0.7;
            
            // Moon position (opposite of sun)
            const moonX = width/2 + Math.cos(angle + Math.PI) * radius;
            const moonY = height * 0.5 + Math.sin(angle + Math.PI) * radius * 0.7;
            
            // Update positions
            sun.position.set(sunX, sunY);
            moon.position.set(moonX, moonY);
            
            // Update visibility based on height
            sun.alpha = sunY < height * 0.8 ? 1 : 0;
            moon.alpha = moonY < height * 0.8 ? 1 : 0;
            
            // Update water reflection
            if (state.entities.map && state.entities.map.water) {
                // TODO: Add sun/moon reflection on water
            }
        },
        
        /**
         * Handle resize
         * @param {number} newWidth - New width
         * @param {number} newHeight - New height
         */
        resize(newWidth, newHeight) {
            // Resize sky overlay
            skyOverlay.clear();
            skyOverlay.beginFill(0x000000);
            skyOverlay.drawRect(0, 0, newWidth, newHeight);
            skyOverlay.endFill();
            
            // Regenerate stars
            layers.sky.removeChild(stars);
            stars = createStars(newWidth, newHeight);
            stars.alpha = isDay ? 0 : 0.8;
            layers.sky.addChildAt(stars, 0);
            
            // Update positions
            this.updateCelestialBodies(timeOfDay, newWidth, newHeight);
        },
        
        /**
         * Force a specific time of day
         * @param {number} time - Time of day (0-1)
         */
        setTimeOfDay(time) {
            timeOfDay = time;
            totalTime = time * totalDuration;
            
            // Force update
            this.update(0);
        }
    };
    
    // Listen for resize events
    window.addEventListener('game-resize', (e) => {
        const { width, height } = e.detail;
        dayNightSystem.resize(width, height);
    });
    
    // Add to ticker
    app.ticker.add(delta => {
        dayNightSystem.update(delta);
    });
    
    return dayNightSystem;
}

/**
 * Creates the sun
 * @returns {PIXI.Container} - Sun container
 */
function createSun() {
    // Try to use loaded texture if available
    let sun;
    
    try {
        sun = new PIXI.Sprite(AssetCache.getTexture('sunTexture'));
        sun.anchor.set(0.5, 0.5);
    } catch (err) {
        // Fallback to creating a simple sun
        sun = new PIXI.Container();
        
        // Create sun disk
        const disk = new PIXI.Graphics();
        disk.beginFill(0xFFDD00); // Yellow
        disk.drawCircle(0, 0, 20);
        disk.endFill();
        
        // Add sun rays
        const rays = new PIXI.Graphics();
        rays.beginFill(0xFFDD00, 0.5);
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            rays.moveTo(0, 0);
            rays.lineTo(
                Math.cos(angle) * 30,
                Math.sin(angle) * 30
            );
            rays.lineTo(
                Math.cos(angle + Math.PI/8) * 5,
                Math.sin(angle + Math.PI/8) * 5
            );
            rays.lineTo(0, 0);
        }
        
        rays.endFill();
        
        sun.addChild(rays, disk);
    }
    
    return sun;
}

/**
 * Creates the moon
 * @returns {PIXI.Container} - Moon container
 */
function createMoon() {
    // Try to use loaded texture if available
    let moon;
    
    try {
        moon = new PIXI.Sprite(AssetCache.getTexture('moonTexture'));
        moon.anchor.set(0.5, 0.5);
    } catch (err) {
        // Fallback to creating a simple moon
        moon = new PIXI.Graphics();
        moon.beginFill(0xDDDDFF); // Light blue-white
        moon.drawCircle(0, 0, 15);
        moon.endFill();
        
        // Add some simple craters
        const craters = new PIXI.Graphics();
        craters.beginFill(0xCCCCEE);
        craters.drawCircle(5, -3, 3);
        craters.drawCircle(-4, 5, 4);
        craters.drawCircle(2, 6, 2);
        craters.endFill();
        
        moon.addChild(craters);
    }
    
    return moon;
}

/**
 * Creates a starfield
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {PIXI.Container} - Stars container
 */
function createStars(width, height) {
    const container = new PIXI.Container();
    
    // Create stars
    const starCount = Math.floor((width * height) / 2000); // Adjust density as needed
    
    for (let i = 0; i < starCount; i++) {
        const star = new PIXI.Graphics();
        
        // Random star properties
        const size = Math.random() * 2 + 1;
        const x = Math.random() * width;
        const y = Math.random() * (height * 0.6); // Only in the sky portion
        const brightness = 0.5 + Math.random() * 0.5;
        
        // Draw star
        star.beginFill(0xFFFFFF, brightness);
        star.drawCircle(0, 0, size);
        star.endFill();
        
        star.position.set(x, y);
        
        // Add twinkle animation
        if (Math.random() < 0.3) { // Only some stars twinkle
            const twinkleSpeed = 0.05 + Math.random() * 0.1;
            const initialPhase = Math.random() * Math.PI * 2;
            
            star.twinkle = {
                speed: twinkleSpeed,
                phase: initialPhase,
                original: {
                    alpha: star.alpha
                }
            };
            
            app.ticker.add(delta => {
                star.twinkle.phase += star.twinkle.speed * delta;
                star.alpha = star.twinkle.original.alpha * (0.7 + Math.sin(star.twinkle.phase) * 0.3);
            });
        }
        
        container.addChild(star);
    }
    
    return container;
}