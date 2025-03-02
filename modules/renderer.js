// renderer.js - Handles PixiJS initialization and rendering layers

/**
 * Initializes the PixiJS renderer and creates the layer structure
 * @param {Object} config - Renderer configuration
 * @returns {Object} - The PixiJS application and layers
 */
export function initializeRenderer(config) {
    // Use the entire window size
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Create PixiJS Application with full screen dimensions
    const app = new PIXI.Application({
        width: width,
        height: height,
        backgroundColor: config.backgroundColor,
        resolution: config.resolution,
        antialias: config.antialias,
        autoDensity: true
    });
    
    // Add canvas to the DOM
    const container = document.getElementById('canvas-container');
    if (!container) {
        throw new Error('Canvas container not found');
    }
    container.appendChild(app.view);
    
    // Set up for pixel art if needed
    if (config.pixelArt) {
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        app.renderer.resolution = config.resolution;
        app.renderer.view.style.imageRendering = 'pixelated';
    }
    
    // Create rendering layers for z-ordering
    const layers = {
        sky: new PIXI.Container(), // Sky, sun, moon, clouds
        background: new PIXI.Container(), // Far background elements
        terrain: new PIXI.Container(), // Land, trees, rocks
        water: new PIXI.Container(), // Water, waves
        structures: new PIXI.Container(), // Lighthouses, buildings
        entities: new PIXI.Container(), // Boat, other movable entities
        effects: new PIXI.Container(), // Signals, weather effects
        ui: new PIXI.Container(), // User interface elements
        tooltip: new PIXI.Container(), // Tooltips and popups
        zoomedView: new PIXI.Container() // Container for zoomed-in views
    };
    
    // Add layers to stage in correct order
    app.stage.addChild(
        layers.sky,
        layers.background,
        layers.terrain,
        layers.water,
        layers.structures,
        layers.entities,
        layers.effects,
        layers.ui,
        layers.tooltip,
        layers.zoomedView
    );
    
    // Initially hide the zoomed view layer
    layers.zoomedView.visible = false;
    
    // Set up resize handler
    setupResizeHandler(app, config);
    
    return { app, layers };
}

/**
 * Sets up event handler for window resizing
 * @param {PIXI.Application} app - The PixiJS application
 * @param {Object} config - Renderer configuration
 */
function setupResizeHandler(app, config) {
    const onResize = () => {
        // Get window dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Resize the renderer to full window size
        app.renderer.resize(width, height);
        
        // Dispatch custom event for game components to respond
        window.dispatchEvent(new CustomEvent('game-resize', { 
            detail: { width, height }
        }));
    };
    
    // Set initial size
    onResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', onResize);
}

/**
 * Creates a new rendering container with the correct transformation 
 * @param {PIXI.Container} parent - The parent container
 * @returns {PIXI.Container} - A new container
 */
export function createRenderContainer(parent) {
    const container = new PIXI.Container();
    parent.addChild(container);
    return container;
}

/**
 * Helper function to convert between screen and world coordinates
 * @param {Object} position - {x, y} in screen coordinates
 * @returns {Object} - {x, y} in world coordinates
 */
export function screenToWorld(position) {
    // Implement coordinate conversion if you have a camera system
    return position;
}

/**
 * Helper function to convert between world and screen coordinates
 * @param {Object} position - {x, y} in world coordinates
 * @returns {Object} - {x, y} in screen coordinates
 */
export function worldToScreen(position) {
    // Implement coordinate conversion if you have a camera system
    return position;
}