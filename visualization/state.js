/**
 * ============================================================================
 * APPLICATION STATE & CONFIGURATION CONFIG
 * ============================================================================
 */

// Color palette for Louvain Community detection
export const clusterColors = [
    '#4facfe',
    '#ff4da6',
    '#00ff87',
    '#ffaa00',
    '#a15eff',
    '#00e5ff',
    '#ff5e62',
    '#80e5ff',
    '#ffda44',
    '#38ef7d',
    '#e14eca',
    '#2575fc',
    '#ff7e40',
    '#1dd1a1',
    '#ff6b6b',
    '#a55eea',
    '#00d2d3',
    '#ff9ff3',
    '#feca57',
    '#54a0ff',
    '#10ac84',
    '#ee5253',
    '#05c46b',
    '#5758bb'
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

/**
 * Initializes a tooltip element and appends it to the document body.
 * The tooltip is styled with default properties to appear as a floating element.
 */
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