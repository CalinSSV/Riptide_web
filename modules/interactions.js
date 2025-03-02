// interactions.js - Handles user interactions and UI controls

/**
 * Sets up event listeners for user interactions
 * @param {Object} state - Global application state
 */
export function setupEventListeners(state) {
    // Set up event listeners for user interface
    setupKeyboardControls(state);
    setupUIControls(state);
    setupFullscreenButton();
    setupTouchControls(state);
}

/**
 * Sets up keyboard controls
 * @param {Object} state - Global application state
 */
function setupKeyboardControls(state) {
    // Add keyboard event listeners
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'Escape':
                // Exit detailed view if active
                if (state.isZoomed && state.currentDetailView) {
                    exitDetailView(state);
                }
                break;
                
            case 'd':
                // Debug mode toggle
                state.debug = !state.debug;
                console.log(`Debug mode: ${state.debug ? 'on' : 'off'}`);
                toggleDebugInfo(state);
                break;
                
            case 't':
                // Manually toggle time of day for testing
                if (state.dayNightCycle) {
                    state.isDay = !state.isDay;
                    state.dayNightCycle.setTimeOfDay(state.isDay ? 0.2 : 0.7);
                }
                break;
        }
    });
}

/**
 * Sets up UI controls
 * @param {Object} state - Global application state
 */
function setupUIControls(state) {
    // Add control buttons to UI layer if needed
    const { app, layers } = state;
    
    // Create debug button (if needed)
    if (state.debug) {
        createDebugControls(state);
    }
}

/**
 * Creates debug information display
 * @param {Object} state - Global application state
 */
function createDebugControls(state) {
    const { app, layers } = state;
    
    // Create debug container
    const debugContainer = new PIXI.Container();
    debugContainer.name = 'debugContainer';
    
    // Create debug panel
    const panel = new PIXI.Graphics();
    panel.beginFill(0x000000, 0.7);
    panel.drawRect(0, 0, 200, 120);
    panel.endFill();
    
    // Add FPS counter
    const fpsText = new PIXI.Text('FPS: 0', {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xFFFFFF
    });
    fpsText.position.set(10, 10);
    
    // Add entity count
    const entityText = new PIXI.Text('Entities: 0', {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xFFFFFF
    });
    entityText.position.set(10, 30);
    
    // Add time of day
    const timeText = new PIXI.Text('Time: Day', {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xFFFFFF
    });
    timeText.position.set(10, 50);
    
    // Add mouse position
    const mouseText = new PIXI.Text('Mouse: 0,0', {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xFFFFFF
    });
    mouseText.position.set(10, 70);
    
    // Add to container
    debugContainer.addChild(panel, fpsText, entityText, timeText, mouseText);
    
    // Position in top-right corner
    debugContainer.position.set(app.screen.width - 210, 10);
    
    // Add to UI layer
    layers.ui.addChild(debugContainer);
    
    // Update debug info
    let frameCount = 0;
    let fpsTimer = 0;
    let lastFps = 0;
    
    app.ticker.add((delta) => {
        if (!state.debug) return;
        
        // Update FPS counter
        frameCount++;
        fpsTimer += delta;
        
        if (fpsTimer >= 60) {
            // Update once per second
            lastFps = Math.round(frameCount / (fpsTimer / 60));
            frameCount = 0;
            fpsTimer = 0;
            
            fpsText.text = `FPS: ${lastFps}`;
        }
        
        // Update entity count
        let entityCount = 0;
        if (state.entities.lighthouses) entityCount += state.entities.lighthouses.length;
        if (state.entities.boat) entityCount++;
        if (state.signals) entityCount += state.signals.length;
        
        entityText.text = `Entities: ${entityCount}`;
        
        // Update time of day
        timeText.text = `Time: ${state.isDay ? 'Day' : 'Night'}`;
        
        // Update mouse position on movement
        app.stage.interactive = true;
        app.stage.on('pointermove', (e) => {
            const pos = e.data.global;
            mouseText.text = `Mouse: ${Math.round(pos.x)},${Math.round(pos.y)}`;
        });
    });
    
    return debugContainer;
}

/**
 * Toggles debug information display
 * @param {Object} state - Global application state
 */
function toggleDebugInfo(state) {
    const { layers } = state;
    
    // Find existing debug container
    let debugContainer = layers.ui.getChildByName('debugContainer');
    
    if (state.debug) {
        // Create debug container if it doesn't exist
        if (!debugContainer) {
            debugContainer = createDebugControls(state);
        }
        debugContainer.visible = true;
    } else if (debugContainer) {
        // Hide debug container
        debugContainer.visible = false;
    }
}

/**
 * Sets up fullscreen button
 */
function setupFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            toggleFullscreen();
        });
    }
}

/**
 * Toggles fullscreen mode
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

/**
 * Sets up touch controls for mobile devices
 * @param {Object} state - Global application state
 */
function setupTouchControls(state) {
    // Add touch events if needed
    const { app } = state;
    
    // Track pinch gestures for zoom
    let initialDistance = 0;
    let isPinching = false;
    let touchPoints = [];
    
    app.view.addEventListener('touchstart', (e) => {
        // Store touch points
        touchPoints = [];
        for (let i = 0; i < e.touches.length; i++) {
            touchPoints.push({
                x: e.touches[i].clientX,
                y: e.touches[i].clientY
            });
        }
        
        // If two touch points, start pinch
        if (touchPoints.length === 2) {
            initialDistance = getDistance(
                touchPoints[0].x, touchPoints[0].y,
                touchPoints[1].x, touchPoints[1].y
            );
            isPinching = true;
        }
    });
    
    app.view.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            // Calculate new distance
            const currentDistance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
            );
            
            // Calculate zoom factor
            const zoomFactor = currentDistance / initialDistance;
            
            // Apply zoom (use with caution - this is just a simple example)
            // In a real app you would probably want to limit the zoom range
            // and handle the zoom in a more sophisticated way
            if (zoomFactor > 1.05 || zoomFactor < 0.95) {
                initialDistance = currentDistance;
                
                // Apply zoom to stage (example only)
                // app.stage.scale.x = Math.min(2, Math.max(0.5, app.stage.scale.x * zoomFactor));
                // app.stage.scale.y = Math.min(2, Math.max(0.5, app.stage.scale.y * zoomFactor));
            }
        }
    });
    
    app.view.addEventListener('touchend', (e) => {
        isPinching = false;
    });
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} - Distance
 */
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Exit detailed view for lighthouse or boat
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
    
    // Return entity to original position
    if (entity.container && entity.originalPosition) {
        gsap.to(entity.container, {
            x: entity.originalPosition.x,
            y: entity.originalPosition.y,
            scale: entity.originalPosition.scale,
            rotation: entity.originalPosition.rotation || 0,
            duration: 1
        });
    }
    
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