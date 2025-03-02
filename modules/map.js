// map.js - Handles terrain, water, and environmental effects

import { AssetCache } from './assetLoader.js';

/**
 * Creates the map with terrain, water, and environmental features
 * @param {Object} state - Global application state
 * @returns {Object} - Map instance with update methods
 */
export function createMap(state) {
    const { app, layers } = state;
    const { width, height } = app.screen;
    
    // Ensure config exists
    const config = state.config && state.config.map ? state.config.map : {
        terrain: { baseColor: 0x8B4513, accentColor: 0x6B8E23, pixelSize: 4 },
        water: { baseColor: 0x1E90FF, waveColors: [0x4682B4], waveAmplitude: 3, waveSpeed: 0.02 },
        weather: { rainChance: 0.002, rainDuration: 1800, windChangeChance: 0.001, maxWindIntensity: 5 }
    };
    
    // Create containers for different map elements
    const terrainContainer = new PIXI.Container();
    const waterContainer = new PIXI.Container();
    const weatherEffectsContainer = new PIXI.Container();
    
    layers.terrain.addChild(terrainContainer);
    layers.water.addChild(waterContainer);
    layers.effects.addChild(weatherEffectsContainer);
    
    // Create terrain
    const terrain = createTerrain(width, height, config.terrain, state);
    terrainContainer.addChild(terrain.container);
    
    // Create water
    const water = createWater(width, height, config.water);
    waterContainer.addChild(water.container);
    
    // Weather system
    const weather = createWeatherSystem(width, height, config.weather);
    weatherEffectsContainer.addChild(weather.container);
    
    // Expose public methods and properties
    const mapInstance = {
        terrain,
        water,
        weather,
        coastline: terrain.coastline,
        
        /**
         * Update map elements
         * @param {number} delta - Time elapsed since last update in frames
         */
        update(delta) {
            // Update water animations
            water.update(delta);
            
            // Update weather effects
            weather.update(delta, state.weather);
        },
        
        /**
         * Handle window resize
         * @param {number} width - New width
         * @param {number} height - New height
         */
        resize(width, height) {
            // Resize terrain
            terrain.resize(width, height);
            
            // Resize water
            water.resize(width, height);
            
            // Resize weather effects
            weather.resize(width, height);
        }
    };
    
    // Listen for resize events
    window.addEventListener('game-resize', (e) => {
        const { width, height } = e.detail;
        mapInstance.resize(width, height);
    });
    
    return mapInstance;
}

/**
 * Creates the terrain with coastline
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} config - Terrain configuration
 * @param {Object} state - Global state for accessing assets
 * @returns {Object} - Terrain object with container and methods
 */
function createTerrain(width, height, config, state) {
    const container = new PIXI.Container();
    let coastPoints = [];
    let land = null;
    let mapSprite = null;
    
    // Try to use the map texture from Image 3
    try {
        // Use the map image as background
        mapSprite = new PIXI.Sprite(AssetCache.getTexture('mapTexture'));
        
        // Set dimensions to fill screen
        mapSprite.width = width;
        mapSprite.height = height;
        
        container.addChild(mapSprite);
        
        // The coastline in Image 3 follows the green-blue transition
        // Create points along this transition for lighthouse placement
        coastPoints = [
            {x: 0, y: height},
            {x: 0, y: height * 0.7},
            {x: width * 0.2, y: height * 0.6},
            {x: width * 0.3, y: height * 0.5},
            {x: width * 0.32, y: height * 0.52}, // Constanta
            {x: width * 0.33, y: height * 0.75}, // Agigea
            {x: width * 0.35, y: height * 0.23}, // Navodari
            {x: width * 0.4, y: height * 0.3},
            {x: width * 0.45, y: height * 0.5},
            {x: width * 0.5, y: height * 0.55},
            {x: width, y: height * 0.8},
            {x: width, y: height}
        ];
        
        console.log("Using map texture for terrain");
        
    } catch (err) {
        console.warn("Map texture not loaded, creating pixel art map similar to Image 3", err);
        
        // Create pixel art map similar to Image 3
        land = new PIXI.Graphics();
        
        // Draw the water background first (blue gradient like in Image 3)
        land.beginFill(0x1E4D8C); // Dark blue for deep water
        land.drawRect(0, 0, width, height);
        land.endFill();
        
        // Draw intermediate water depth (medium blue)
        land.beginFill(0x2A6DB5);
        // Create a shape to represent the medium depth water
        land.moveTo(width * 0.4, 0);
        land.lineTo(width * 0.6, height);
        land.lineTo(width * 0.4, height);
        land.lineTo(width * 0.3, 0);
        land.endFill();
        
        // Draw shallow water (lighter blue)
        land.beginFill(0x3A8ED4);
        // Create a shape for shallow water along the coast
        land.moveTo(width * 0.3, 0);
        land.lineTo(width * 0.4, height);
        land.lineTo(width * 0.2, height);
        land.lineTo(width * 0.2, 0);
        land.endFill();
        
        // Draw land (green with pixel variations like in Image 3)
        land.beginFill(0x527B58); // Base green
        
        // Define coastline points - creating a shape similar to Image 3
        coastPoints = [
            {x: 0, y: height},
            {x: 0, y: 0},
            {x: width * 0.2, y: 0},
            {x: width * 0.2, y: height * 0.6},
            {x: width * 0.25, y: height * 0.5},
            {x: width * 0.3, y: height * 0.55},
            {x: width * 0.32, y: height * 0.52}, // Constanta
            {x: width * 0.33, y: height * 0.75}, // Agigea
            {x: width * 0.35, y: height * 0.23}, // Navodari
            {x: width * 0.25, y: height * 0.2},
            {x: width * 0.2, y: height * 0.1},
            {x: width * 0.2, y: height},
            {x: 0, y: height}
        ];
        
        // Draw the land
        land.moveTo(coastPoints[0].x, coastPoints[0].y);
        for (let i = 1; i < coastPoints.length; i++) {
            land.lineTo(coastPoints[i].x, coastPoints[i].y);
        }
        land.endFill();
        
        // Add pixel detail to the land (small variations in green)
        addPixelDetails(land, width, height, 0x527B58, 0x3F5B42, 0x6B9A73, 4);
        
        // Add some roads/paths (yellow lines like in Image 3)
        const roads = new PIXI.Graphics();
        roads.lineStyle(1, 0xF7D358, 0.8);
        
        // Main road
        roads.moveTo(width * 0.02, height * 0.5);
        roads.lineTo(width * 0.1, height * 0.45);
        roads.lineTo(width * 0.15, height * 0.4);
        roads.lineTo(width * 0.2, height * 0.3);
        roads.lineTo(width * 0.25, height * 0.2);
        
        // Branch road 1
        roads.moveTo(width * 0.15, height * 0.4);
        roads.lineTo(width * 0.2, height * 0.5);
        roads.lineTo(width * 0.25, height * 0.6);
        
        // Branch road 2
        roads.moveTo(width * 0.1, height * 0.45);
        roads.lineTo(width * 0.15, height * 0.6);
        roads.lineTo(width * 0.2, height * 0.8);
        
        // Add small settlements (white dots)
        roads.beginFill(0xFFFFFF);
        roads.drawCircle(width * 0.02, height * 0.5, 2); // Starting point
        roads.drawCircle(width * 0.25, height * 0.2, 2); // End point
        roads.drawCircle(width * 0.15, height * 0.4, 2); // Junction
        roads.drawCircle(width * 0.25, height * 0.6, 2); // End of branch 1
        roads.drawCircle(width * 0.2, height * 0.8, 2); // End of branch 2
        roads.endFill();
        
        land.addChild(roads);
        
        container.addChild(land);
    }
    
    return {
        container,
        coastline: coastPoints,
        
        /**
         * Handle resize event
         * @param {number} newWidth - New width
         * @param {number} newHeight - New height
         */
        resize(newWidth, newHeight) {
            if (mapSprite) {
                // If using map texture, just resize it
                mapSprite.width = newWidth;
                mapSprite.height = newHeight;
                
                // Recalculate coastline points for proper positioning
                const scaleX = newWidth / width;
                const scaleY = newHeight / height;
                
                this.coastline = coastPoints.map(point => ({
                    x: point.x * scaleX,
                    y: point.y * scaleY
                }));
            } else if (land) {
                // For generated terrain, we need to recreate it at the new size
                container.removeChildren();
                
                const newLand = createTerrain(newWidth, newHeight, config, state);
                container.addChild(newLand.container.children[0]);
                
                // Update coastline reference
                this.coastline = newLand.coastline;
            }
        }
    };
}

/**
 * Add pixel detail to mimic the style in Image 3
 * @param {PIXI.Graphics} graphics - Graphics object to add details to
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} baseColor - Base color
 * @param {number} darkColor - Darker variation
 * @param {number} lightColor - Lighter variation
 * @param {number} pixelSize - Size of the pixel details
 */
function addPixelDetails(graphics, width, height, baseColor, darkColor, lightColor, pixelSize) {
    // Add noise to the land to create a pixelated effect similar to Image 3
    // This will create small squares of varying green shades
    
    // Create a container for the pixels
    const pixelContainer = new PIXI.Container();
    graphics.addChild(pixelContainer);
    
    // Only add pixels to the land area (left side of the screen)
    for (let x = 0; x < width * 0.35; x += pixelSize) {
        for (let y = 0; y < height; y += pixelSize) {
            // Random chance to draw a pixel
            if (Math.random() < 0.2) {
                const pixel = new PIXI.Graphics();
                // Randomly choose from 3 colors to create variation
                const colorChoice = Math.random();
                let pixelColor;
                
                if (colorChoice < 0.3) {
                    pixelColor = darkColor; // Darker green
                } else if (colorChoice < 0.7) {
                    pixelColor = baseColor; // Base green
                } else {
                    pixelColor = lightColor; // Lighter green
                }
                
                pixel.beginFill(pixelColor);
                pixel.drawRect(x, y, pixelSize, pixelSize);
                pixel.endFill();
                
                pixelContainer.addChild(pixel);
            }
        }
    }
}

/**
 * Creates water with animated waves
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} config - Water configuration
 * @returns {Object} - Water object with container and methods
 */
function createWater(width, height, config) {
    const container = new PIXI.Container();
    
    // Create waves (will be animated)
    const waves = [];
    const waveContainer = new PIXI.Container();
    
    // For better performance, only add waves to the right side (water area)
    const waterStartX = width * 0.3; // Start waves at 30% of screen width
    
    // Create several wave lines
    for (let i = 0; i < 3; i++) {
        const wave = new PIXI.Graphics();
        const waveColor = config.waveColors[i % config.waveColors.length];
        wave.lineStyle(2, waveColor, 0.3); // More transparent to match Image 3
        
        // Store wave properties
        const waveProps = {
            y: height * (0.3 + i * 0.2), // Distribute waves vertically
            amplitude: config.waveAmplitude * (1 + i * 0.2), // Vary amplitude
            frequency: config.waveSpeed * (1 - i * 0.1), // Vary frequency
            phase: 0, // Current phase (will be animated)
            startX: waterStartX // Start position
        };
        
        waves.push({ graphics: wave, props: waveProps });
        waveContainer.addChild(wave);
    }
    
    container.addChild(waveContainer);
    
    // Create water reflections for day/night cycle
    const reflectionOverlay = new PIXI.Graphics();
    reflectionOverlay.beginFill(0xFFFFFF, 0.1);
    reflectionOverlay.drawRect(waterStartX, 0, width - waterStartX, height);
    reflectionOverlay.endFill();
    reflectionOverlay.alpha = 0.1; // Subtle reflection
    
    container.addChild(reflectionOverlay);
    
    return {
        container,
        waves,
        reflectionOverlay,
        
        /**
         * Update water animation
         * @param {number} delta - Time elapsed
         */
        update(delta) {
            // Animate each wave
            waves.forEach(wave => {
                const { graphics, props } = wave;
                
                // Update phase
                props.phase += props.frequency * delta * 0.01;
                
                // Redraw wave
                graphics.clear();
                graphics.lineStyle(1, config.waveColors[0], 0.3);
                
                graphics.moveTo(props.startX, props.y);
                
                // Draw wave points
                for (let x = props.startX; x <= width; x += 4) { // Step by 4 for pixel look
                    const y = props.y + Math.sin(x * 0.02 + props.phase) * props.amplitude;
                    graphics.lineTo(x, y);
                }
            });
        },
        
        /**
         * Set water reflection based on time of day
         * @param {number} intensity - Reflection intensity (0-1)
         * @param {number} color - Reflection color
         */
        setReflection(intensity, color) {
            reflectionOverlay.clear();
            reflectionOverlay.beginFill(color, 0.1);
            reflectionOverlay.drawRect(width * 0.3, 0, width * 0.7, height);
            reflectionOverlay.endFill();
            reflectionOverlay.alpha = intensity * 0.2; // Keep subtle
        },
        
        /**
         * Handle resize event
         * @param {number} newWidth - New width
         * @param {number} newHeight - New height
         */
        resize(newWidth, newHeight) {
            const waterStartX = newWidth * 0.3;
            
            // Resize waves (will be redrawn in next update)
            waves.forEach((wave, i) => {
                wave.props.y = newHeight * (0.3 + i * 0.2);
                wave.props.startX = waterStartX;
            });
            
            // Resize reflection overlay
            reflectionOverlay.clear();
            reflectionOverlay.beginFill(0xFFFFFF, 0.1);
            reflectionOverlay.drawRect(waterStartX, 0, newWidth - waterStartX, newHeight);
            reflectionOverlay.endFill();
        }
    };
}

/**
 * Creates a weather effects system
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} config - Weather configuration
 * @returns {Object} - Weather object with container and methods
 */
function createWeatherSystem(width, height, config) {
    const container = new PIXI.Container();
    
    // Wind indicator (invisible, only for debug)
    const windIndicator = new PIXI.Graphics();
    windIndicator.lineStyle(2, 0xFFFFFF, 0.5);
    windIndicator.moveTo(0, 0);
    windIndicator.lineTo(20, 0);
    windIndicator.visible = false; // Hide by default
    windIndicator.x = width * 0.9;
    windIndicator.y = height * 0.1;
    
    container.addChild(windIndicator);
    
    return {
        container,
        windIndicator,
        
        /**
         * Update weather effects
         * @param {number} delta - Time elapsed
         * @param {Object} weather - Current weather state
         */
        update(delta, weather) {
            // Update wind indicator
            if (weather) {
                windIndicator.rotation = weather.windDirection || 0;
                windIndicator.scale.x = (weather.windIntensity || 0) / config.maxWindIntensity;
            }
        },
        
        /**
         * Set weather conditions
         * @param {boolean} isRaining - Whether it's raining
         * @param {number} windIntensity - Wind intensity
         * @param {number} windDirection - Wind direction in radians
         */
        setWeather(windIntensity, windDirection) {
            // Just update wind for now, since we're not using rain
            this.windIntensity = windIntensity;
            this.windDirection = windDirection;
        },
        
        /**
         * Handle resize event
         * @param {number} newWidth - New width
         * @param {number} newHeight - New height
         */
        resize(newWidth, newHeight) {
            // Update wind indicator position
            windIndicator.x = newWidth * 0.9;
            windIndicator.y = newHeight * 0.1;
        }
    };
}