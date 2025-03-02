// config.js - Central configuration for the application

export const CONFIG = {
    renderer: {
        width: 640,
        height: 360,
        backgroundColor: 0x87CEEB, // Sky blue
        resolution: window.devicePixelRatio || 1,
        antialias: false, // Disabled for pixel art
        autoResize: true,
        pixelArt: true // Enable pixel art mode
    },
    
    dayNightCycle: {
        dayDuration: 4 * 60 * 60, // 4 minutes in frames (at 60fps)
        nightDuration: 1 * 60 * 60, // 1 minute in frames (at 60fps)
        transitionDuration: 30 * 60, // 30 seconds for sunrise/sunset
        dayColor: 0x87CEEB, // Sky blue
        nightColor: 0x0C1445, // Dark blue
        sunriseColor: 0xFF9933, // Orange
        sunsetColor: 0xFF6347 // Tomato red
    },
    
    map: {
        terrain: {
            baseColor: 0x8B4513, // Brown
            accentColor: 0x6B8E23, // Olive green
            pixelSize: 4,
            treeCount: 30,
            rockCount: 20
        },
        water: {
            baseColor: 0x1E90FF, // Blue
            waveColors: [0x4682B4, 0x1E90FF, 0x4169E1],
            waveAmplitude: 3,
            waveSpeed: 0.02
        },
        weather: {
            rainChance: 0.002, // Chance of rain starting each frame
            rainDuration: 30 * 60, // 30 seconds
            windChangeChance: 0.001, // Chance of wind changing
            maxWindIntensity: 5
        }
    },
    
    lighthouse: {
        count: 3,
        positions: [
            { x: 0.45, y: 0.18, name: "Navodari Lighthouse" },     // Top X mark in your image
            { x: 0.43, y: 0.60, name: "Constanta Lighthouse" },    // Middle X mark in your image
            { x: 0.38, y: 0.86, name: "Agigea Lighthouse" }        // Bottom X mark in your image
        ],
        colors: [0xFF0000, 0x00FF00, 0x0000FF],
        blinkRate: 60,
        signalRate: 120,
        signalSpeed: 0.01
    },
    
    boat: {
        startPosition: { x: 0.5, y: 0.4 },
        speed: 0.5,
        rotationSpeed: 0.02,
        physics: {
            mass: 10,
            buoyancy: 12,
            dragCoefficient: 0.05
        },
        pathPoints: [
            { x: 0.5, y: 0.4 },
            { x: 0.6, y: 0.35 },
            { x: 0.7, y: 0.4 },
            { x: 0.65, y: 0.5 },
            { x: 0.55, y: 0.45 },
            { x: 0.4, y: 0.35 },
            { x: 0.3, y: 0.4 },
            { x: 0.35, y: 0.3 }
        ]
    },
    
    // Asset paths - UPDATED to include map.png
    assets: {
        images: {
            mapTexture: 'assets/images/map.png',
            boatTexture: 'assets/images/boat.png',
            lighthouseTexture: 'assets/images/lighthouse.png',
            treeTexture: 'assets/images/tree.png',
            rockTexture: 'assets/images/rock.png',
            sunTexture: 'assets/images/sun.png',
            moonTexture: 'assets/images/moon.png',
            rainTexture: 'assets/images/rain.png'
        },
        spritesheets: {

        },
        audio: {
            dayAmbience: 'assets/audio/day.mp3',
            nightAmbience: 'assets/audio/night.mp3',
            rainSound: 'assets/audio/rain.mp3',
            waveSound: 'assets/audio/waves.mp3'
        }
    },
    
    // User interface settings
    ui: {
        zoomDuration: 1, // seconds
        buttonStyle: {
            fill: 0xFFFFFF,
            fontSize: 16,
            fontFamily: 'Arial',
            stroke: 0x000000,
            strokeThickness: 4,
            padding: 10
        }
    }
};