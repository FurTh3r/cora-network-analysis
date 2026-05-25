/**
 * ============================================================================
 * APPLICATION STATE & CONFIGURATION CONFIG
 * ============================================================================
 */

// Color palette for Louvain Community detection
export const clusterColors = [
    '#00f2fe', '#ff3d71', '#00e5ff', '#ffaa00', '#b337ff',
    '#73ff00', '#ff00e5', '#2671ff', '#00ff87', '#ff5e62',
    '#ffe600', '#bf00ff'
];

// Application state
export const appState = {
    globalNetworkData: null,
    activeView: 'Main Visualization',
    mainViewLayoutMode: 'force', // 'force', 'radial', 'hierarchy'

    // Active interaction states
    hoveredNode: null,
    searchedNodeId: null,
    hoverInteractionEnabled: true,
    dragInteractionEnabled: true,

    // SIR model temporal parameters
    currentSirTime: 0,
    maxSirTime: 50,
    currentSirS: 0,
    currentSirI: 0,
    currentSirR: 0
};

// Global matrix for transformations (Zoom e Pan)
export let transformState = {
    current: d3.zoomIdentity
};

// Reference to the DOM elements
export const DOM = {
    graphWorkspace: document.getElementById('network-workspace'),
    analyticsWorkspace: document.getElementById('analytics-workspace'),
    canvasTitle: document.getElementById('canvas-target-title'),
    panelContextTitle: document.getElementById('panel-context-title'),
    infoPanel: document.getElementById('info-panel'),
    toggleIcon: document.getElementById('toggle-icon'),
    canvas: null,
    ctx: null,
    simulation: null,
    tooltip: null
};

// Dynamically create tooltip element
export function initializeTooltip() {
    DOM.tooltip = document.createElement('div');
    Object.assign(DOM.tooltip.style, {
        position: 'absolute',
        padding: '10px 14px',
        background: 'rgba(15, 17, 28, 0.95)',
        color: '#fff',
        border: '1px solid #4facfe',
        borderRadius: '6px',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.15s ease',
        zIndex: '9999',
        fontFamily: 'monospace',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });
    document.body.appendChild(DOM.tooltip);
}