/**
 * Cora Network Intelligence Hub - Core JS UI Engine
 * Handles view state routing, contextual sidebar triggers, and floating panel collapsible states.
 */

// --- 1. GLOBAL WORKSPACE DOM ELEMENTS HANDLES ---
const graphWorkspace = document.getElementById('network-workspace');
const analyticsWorkspace = document.getElementById('analytics-workspace');
const canvasTitle = document.getElementById('canvas-target-title');
const panelContextTitle = document.getElementById('panel-context-title');
const infoPanel = document.getElementById('info-panel');
const toggleIcon = document.getElementById('toggle-icon');

/**
 * Orchestrates view switching between 2D network models and charting interfaces
 * @param {string} engineType - Choose either 'GRAPH' or 'ANALYTICS' layouts
 * @param {string} viewDisplayName - Text to print inside headers
 * @param {HTMLElement} menuElement - Selected sidebar DOM node for styling toggle
 */
function switchViewEngine(engineType, viewDisplayName, menuElement) {
    // Reset active visual states across all sidebar menu rows
    let items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    menuElement.classList.add('active');

    // Routing Engine State Machine
    if (engineType === 'GRAPH') {
        // Expose SVG Canvas area, remove analytical sub-grid matrix
        analyticsWorkspace.style.display = 'none';
        graphWorkspace.style.display = 'flex';
        canvasTitle.innerText = viewDisplayName;

        // Custom Header adaptation depending on chosen network layer properties
        if (viewDisplayName.includes('SIR')) {
            panelContextTitle.innerText = "SIR Diffusion Parameters";
        } else if (viewDisplayName.includes('HITS')) {
            panelContextTitle.innerText = "HITS Centrality Profiles";
        } else {
            panelContextTitle.innerText = "Global Network Metrics";
        }

    } else if (engineType === 'ANALYTICS') {
        // Expose Charts Sub-Grid Layout, hide network spatial topology view
        graphWorkspace.style.display = 'none';
        analyticsWorkspace.style.display = 'grid';
        panelContextTitle.innerText = "Statistical Analytics Suite";

        // Toggle sub-headers descriptions if viewing Null Models vs Empirical Distributions
        if (viewDisplayName.includes('Null')) {
            document.getElementById('c1-title').innerText = "Erdos-Renyi Degree Dist. (P=0.0014)";
            document.getElementById('c2-title').innerText = "Real Cora vs Random Cluster Coefficients";
            document.getElementById('c3-title').innerText = "Path Length Metric Short-Cut Variances";
            document.getElementById('c4-title').innerText = "Empirical Sigma (σ) Small-World Proof";
        } else {
            document.getElementById('c1-title').innerText = "In-Degree Distribution Histogram";
            document.getElementById('c2-title').innerText = "Out-Degree Scale Profiler";
            document.getElementById('c3-title').innerText = "Quantile Threshold Filtering Bounds";
            document.getElementById('c4-title').innerText = "Erdos-Renyi Random Convergence";
        }
    }
}

/**
 * Toggles collapsible open/closed dimensions of the floating inspector card
 */
function togglePanelVisibility() {
    const isCollapsed = infoPanel.classList.toggle('panel-collapsed');
    toggleIcon.innerText = isCollapsed ? "+" : "−";
}

// --- 2. PIPELINE PREPARATION FOR FUTURE REAL DATA RENDERING (D3.js integration ready) ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("Cora UI Layout Engine loaded. Awaiting NetworkX data connection...");

    // Check if real network graph data array structure has been supplied globally
    if (window.CORA_DATA) {
        initializeRealD3Graph(window.CORA_DATA);
    }
});

function initializeRealD3Graph(data) {
    // This functional scope remains open to plug in your standard d3.forceSimulation loop smoothly later.
    document.getElementById('canvas-target-title').style.display = 'none';
    console.log("Real Graph data intercepted. Initializing Canvas Forces Engine...", data);
}