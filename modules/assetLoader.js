// assetLoader.js - Handles loading of all game assets from files

// Store reference to the app
let appInstance = null;

/**
 * Set the application instance for the asset loader
 * @param {PIXI.Application} app - The PixiJS application
 */
export function setAppInstance(app) {
    appInstance = app;
}

/**
 * Cache for storing loaded assets
 */
export const AssetCache = {
    textures: {},
    spritesheets: {},
    audio: {},
    
    /**
     * Get a texture by its key
     * @param {string} key - The texture key
     * @returns {PIXI.Texture} - The texture
     */
    getTexture(key) {
        if (!this.textures[key]) {
            console.warn(`Texture '${key}' not found in cache`);
            return PIXI.Texture.WHITE; // Return a placeholder
        }
        return this.textures[key];
    },
    
    /**
     * Get a spritesheet by its key
     * @param {string} key - The spritesheet key
     * @returns {PIXI.Spritesheet} - The spritesheet
     */
    getSpritesheet(key) {
        return this.spritesheets[key];
    },
    
    /**
     * Get audio by its key
     * @param {string} key - The audio key
     * @returns {HTMLAudioElement} - The audio element
     */
    getAudio(key) {
        return this.audio[key];
    }
};

/**
 * Load all assets needed for the game
 * @param {Object} assetConfig - Configuration for assets to load
 * @param {PIXI.Application} app - The PixiJS application instance
 * @returns {Promise} - Resolves when all assets are loaded
 */
export async function loadAssets(assetConfig, app) {
    // Store app reference
    appInstance = app;
    
    return new Promise(async (resolve, reject) => {
        try {
            // Update loading progress (if you have a progress bar)
            const updateProgress = (progress) => {
                const loadingText = document.getElementById('loading-progress');
                if (loadingText) {
                    loadingText.textContent = `Loading: ${Math.floor(progress * 100)}%`;
                }
                
                // Update loading bar if it exists
                const loadingBar = document.getElementById('loading-bar-fill');
                if (loadingBar) {
                    loadingBar.style.width = `${Math.floor(progress * 100)}%`;
                }
            };
            
            // Get total assets to load
            const imageKeys = Object.keys(assetConfig.images || {});
            const spritesheetKeys = Object.keys(assetConfig.spritesheets || {});
            const audioKeys = Object.keys(assetConfig.audio || {});
            
            const totalAssets = imageKeys.length + spritesheetKeys.length + audioKeys.length;
            let loadedCount = 0;
            
            // If no assets to load, resolve immediately
            if (totalAssets === 0) {
                console.warn("No assets to load");
                resolve();
                return;
            }
            
            // Helper function to update progress
            const onAssetLoaded = () => {
                loadedCount++;
                updateProgress(loadedCount / totalAssets);
                
                if (loadedCount === totalAssets) {
                    console.log("All assets loaded successfully");
                    resolve();
                }
            };
            
            // Use PIXI Loader if available (for compatibility with different PIXI versions)
            if (PIXI.Loader) {
                // PIXI v5+ approach
                const loader = PIXI.Loader.shared;
                
                // Add image resources
                imageKeys.forEach(key => {
                    const path = assetConfig.images[key];
                    loader.add(key, path);
                });
                
                // Add spritesheet resources
                spritesheetKeys.forEach(key => {
                    const path = assetConfig.spritesheets[key];
                    loader.add(key, path);
                });
                
                // Load everything and cache the results
                loader.load((loader, resources) => {
                    // Cache loaded textures
                    imageKeys.forEach(key => {
                        if (resources[key] && resources[key].texture) {
                            AssetCache.textures[key] = resources[key].texture;
                        } else {
                            console.warn(`Failed to load texture: ${key}`);
                        }
                    });
                    
                    // Cache loaded spritesheets
                    spritesheetKeys.forEach(key => {
                        if (resources[key] && resources[key].spritesheet) {
                            AssetCache.spritesheets[key] = resources[key].spritesheet;
                        } else {
                            console.warn(`Failed to load spritesheet: ${key}`);
                        }
                    });
                    
                    // Load audio separately (PIXI loader doesn't handle audio)
                    loadAudioFiles(audioKeys, assetConfig.audio, onAssetLoaded);
                    
                    // If no audio to load, resolve now
                    if (audioKeys.length === 0) {
                        resolve();
                    }
                });
                
                // Add progress handler
                loader.onProgress.add(() => {
                    const progress = (loader.progress / 100) * ((totalAssets - audioKeys.length) / totalAssets);
                    updateProgress(progress);
                });
                
                // Handle errors
                loader.onError.add((error) => {
                    console.error("Error loading assets:", error);
                });
            } else if (PIXI.Assets) {
                // PIXI v7+ approach using Assets
                
                // Load images
                const imagePromises = imageKeys.map(key => {
                    return PIXI.Assets.load(assetConfig.images[key])
                        .then(texture => {
                            AssetCache.textures[key] = texture;
                            onAssetLoaded();
                        })
                        .catch(error => {
                            console.error(`Error loading image ${key}:`, error);
                            onAssetLoaded(); // Still count as loaded to avoid hanging
                        });
                });
                
                // Load spritesheets
                const spritesheetPromises = spritesheetKeys.map(key => {
                    return PIXI.Assets.load(assetConfig.spritesheets[key])
                        .then(spritesheet => {
                            AssetCache.spritesheets[key] = spritesheet;
                            onAssetLoaded();
                        })
                        .catch(error => {
                            console.error(`Error loading spritesheet ${key}:`, error);
                            onAssetLoaded(); // Still count as loaded to avoid hanging
                        });
                });
                
                // Load audio files
                loadAudioFiles(audioKeys, assetConfig.audio, onAssetLoaded);
                
                // If there are no image or spritesheet assets, resolve once audio is done
                if (imageKeys.length === 0 && spritesheetKeys.length === 0 && audioKeys.length === 0) {
                    resolve();
                }
            } else {
                // Manual loading approach (fallback)
                console.warn("Using manual asset loading (PIXI.Loader and PIXI.Assets not available)");
                
                // Load images manually
                for (const key of imageKeys) {
                    loadImageManually(key, assetConfig.images[key])
                        .then(texture => {
                            AssetCache.textures[key] = texture;
                            onAssetLoaded();
                        })
                        .catch(error => {
                            console.error(`Error loading image ${key}:`, error);
                            onAssetLoaded(); // Still count as loaded to avoid hanging
                        });
                }
                
                // Spritesheets are more complex to load manually - this is a basic implementation
                for (const key of spritesheetKeys) {
                    console.warn(`Manual loading of spritesheet ${key} not fully implemented`);
                    // For now, just mark as loaded
                    onAssetLoaded();
                }
                
                // Load audio files
                loadAudioFiles(audioKeys, assetConfig.audio, onAssetLoaded);
                
                // If there are no assets, resolve immediately
                if (totalAssets === 0) {
                    resolve();
                }
            }
            
        } catch (error) {
            console.error('Error in loadAssets:', error);
            reject(error);
        }
    });
}

/**
 * Load audio files manually
 * @param {Array} keys - Array of audio keys to load
 * @param {Object} audioConfig - Audio configuration with paths
 * @param {Function} onLoaded - Callback when an asset is loaded
 */
function loadAudioFiles(keys, audioConfig, onLoaded) {
    for (const key of keys) {
        const audio = new Audio();
        audio.src = audioConfig[key];
        
        // Mark as loaded when ready or on error
        audio.addEventListener('canplaythrough', () => {
            AssetCache.audio[key] = audio;
            onLoaded();
        }, { once: true });
        
        audio.addEventListener('error', () => {
            console.error(`Error loading audio: ${key}`);
            onLoaded(); // Still count as loaded to avoid hanging
        }, { once: true });
        
        // Start loading
        audio.load();
    }
}

/**
 * Load an image manually and convert to PIXI texture
 * @param {string} key - Asset key
 * @param {string} path - Asset path
 * @returns {Promise<PIXI.Texture>} - Promise resolving to a PIXI texture
 */
function loadImageManually(key, path) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        
        image.onload = () => {
            const texture = PIXI.Texture.from(image);
            resolve(texture);
        };
        
        image.onerror = (error) => {
            reject(error || new Error(`Failed to load image: ${path}`));
        };
        
        // Start loading the image
        image.src = path;
    });
}