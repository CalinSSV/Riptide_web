// main.js - Main entry point for the lighthouse visualization project

// Import configuration
// At the top of main.js
import { CONFIG } from './config.js';

// Import modules
import { initializeRenderer } from './modules/renderer.js';
import { createMap } from './modules/map.js';
import { createLighthouses } from './modules/lighthouse.js';
import { createBoat } from './modules/boat.js';
import { initializeDayNightCycle } from './modules/dayNightCycle.js';
import { setupEventListeners } from './modules/interactions.js';
import { loadAssets, setAppInstance } from './modules/assetLoader.js';

const state = {
    isLoading: true,
    isZoomed: false,
    currentDetailView: null,
    time: 0,
    dayTime: 0,
    isDay: true,
    weather: {
        isRaining: false,
        windIntensity: 0,
        windDirection: 0
    },
    entities: {
        map: null,
        boat: null,
        lighthouses: []
    },
    signals: [],
    app: null,
    layers: {},
    config: CONFIG  // Add CONFIG to state
};

// Initialize the application
async function initApp() {
    console.log('Initializing application...');
    
    // Show loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    try {
        // Initialize PixiJS renderer
        const { app, layers } = initializeRenderer(CONFIG.renderer);
        state.app = app;
        state.layers = layers;
        
        // Set app instance for asset loader
        setAppInstance(app);
        
        // Load assets - pass the app instance
        console.log('Loading assets...');
        await loadAssets(CONFIG.assets, app);
        console.log('Assets loaded successfully');
        
        // Create scene components
        console.log('Creating map...');
        state.entities.map = createMap(state);
        
        console.log('Creating lighthouses...');
        state.entities.lighthouses = createLighthouses(state);
        
        console.log('Creating boat...');
        state.entities.boat = createBoat(state);
        
        // Initialize day/night cycle
        console.log('Initializing day/night cycle...');
        initializeDayNightCycle(state);
        
        // Setup user interactions and event listeners
        console.log('Setting up event listeners...');
        setupEventListeners(state);
        
        // Start the game loop
        console.log('Starting game loop...');
        state.app.ticker.add(gameLoop);
        
        // Hide loading screen
        state.isLoading = false;
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        
        // Show error on loading screen
        if (loadingElement) {
            const loadingText = document.getElementById('loading-progress');
            if (loadingText) {
                loadingText.textContent = 'Error loading the application. Please refresh the page.';
                loadingText.style.color = 'red';
            }
        }
    }
}

// Main game loop
function gameLoop(delta) {
    state.time += delta;
    
    // Update all components
    updateMap(delta);
    updateLighthouses(delta);
    updateBoat(delta);
    updateSignals(delta);
    updateDayNightCycle(delta);
}

// Component update functions
function updateMap(delta) {
    if (state.entities.map && state.entities.map.update) {
        state.entities.map.update(delta);
    }
}

function updateLighthouses(delta) {
    if (state.entities.lighthouses) {
        state.entities.lighthouses.forEach(lighthouse => {
            if (lighthouse.update) {
                lighthouse.update(delta);
            }
        });
    }
}

function updateBoat(delta) {
    if (state.entities.boat && state.entities.boat.update) {
        state.entities.boat.update(delta);
    }
}

function updateSignals(delta) {
    // Update existing signals
    for (let i = state.signals.length - 1; i >= 0; i--) {
        const signal = state.signals[i];
        if (signal.update(delta)) {
            // Signal is finished, remove it
            signal.destroy();
            state.signals.splice(i, 1);
        }
    }
    
    // Create new signals if needed
    if (!state.isZoomed && Math.random() < 0.01) {
        const randomLighthouse = state.entities.lighthouses[
            Math.floor(Math.random() * state.entities.lighthouses.length)
        ];
        
        if (randomLighthouse && randomLighthouse.createSignal) {
            const newSignal = randomLighthouse.createSignal(state.entities.boat);
            if (newSignal) {
                state.signals.push(newSignal);
            }
        }
    }
}

function updateDayNightCycle(delta) {
    // Day/night cycle updates handled by the module
}

function handleResize() {
    const { width, height } = state.app.screen;
    
    // Update map dimensions
    if (state.entities.map && state.entities.map.resize) {
        state.entities.map.resize(width, height);
    }
    
    // Update lighthouses positions
    if (state.entities.lighthouses && state.entities.lighthouses.length > 0) {
        state.entities.lighthouses.forEach(lighthouse => {
            if (lighthouse.resize) {
                lighthouse.resize(width, height);
            }
        });
    }
    
    // Update boat path and position
    if (state.entities.boat && state.entities.boat.resize) {
        state.entities.boat.resize(width, height);
    }
    
    // Re-render everything
    state.app.renderer.render(state.app.stage);
}

// Make sure this function is called whenever the window is resized
window.addEventListener('resize', handleResize);

// Also call it immediately after all elements are initialized
window.addEventListener('game-loaded', handleResize);

// Dispatch a custom event when game is loaded (add this at the end of initApp function)
function notifyGameLoaded() {
    window.dispatchEvent(new CustomEvent('game-loaded'));
}
// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', initApp);