/* global d3 */

/**
 * ============================================================================
 * CORE GRAPH INTELLIGENCE ENGINE - CORA NETWORK HUB
 * ============================================================================
 * Application state management, d3.force layout calculations,
 * advanced HTML5 Canvas rendering, and real-time geometric interactions.
 */
import {appState, DOM, initializeTooltip} from './state.js';
import {initializeCanvasD3Graph, renderScene, updateGraphLayout} from './graph_view.js';
import {renderAnalyticsDashboards} from './analytics_view.js';

/**
 * Window Event Listener - DOMContentLoaded
 */
window.addEventListener('DOMContentLoaded', () => {
    loadNetworkDatabase().then(() => {
        console.log("Cora Engine initialized successfully.")
    });
});

/**
 * Loads the JSON file, pre-processes node adjacency (Ego-Network)
 * and initializes D3 components.
 */
async function loadNetworkDatabase() {
    try {
        initializeTooltip();

        if (DOM.canvasTitle) DOM.canvasTitle.innerText = "Loading Cora Database Framework...";
        const data = await d3.json("cora_visualization_data.json");
        appState.globalNetworkData = data;

        // Ego-Network construction
        appState.globalNetworkData.nodes.forEach(n => n.neighbors = new Set());
        appState.globalNetworkData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const sNode = appState.globalNetworkData.nodes.find(n => n.id === sourceId);
            const tNode = appState.globalNetworkData.nodes.find(n => n.id === targetId);
            if (sNode && tNode) {
                sNode.neighbors.add(targetId);
                tNode.neighbors.add(sourceId);
            }
        });

        if (data.nodes?.[0]?.sir_history) {
            appState.maxSirTime = data.nodes[0].sir_history.length - 1;
        }

        updateSidebarMetrics(data);

        if (data.nodes && data.links) {
            initializeCanvasD3Graph(data.nodes, data.links);
            updateGraphLayout(appState.activeView);
        }
    } catch (error) {
        if (DOM.canvasTitle) DOM.canvasTitle.innerText = "Data Pipeline Failure!";
        console.error(error);
    }
}

/**
 * View Environment Switcher (Routing for Graph Views and Analytics)
 */
window.switchViewEngine = function (engineType, viewDisplayName, menuElement) {
    let items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    menuElement.classList.add('active');

    appState.searchedNodeId = null;

    if (engineType === 'GRAPH') {
        appState.activeView = viewDisplayName;
        updateGraphLayout(viewDisplayName);
        updateSidebarMetrics(appState.globalNetworkData);

        DOM.analyticsWorkspace.style.display = 'none';
        DOM.graphWorkspace.style.display = 'flex';
        if (DOM.infoPanel) DOM.infoPanel.style.display = 'block';
        if (DOM.canvasTitle) {
            DOM.canvasTitle.innerText = viewDisplayName;
            DOM.canvasTitle.style.display = 'block';
        }
        if (DOM.canvas) DOM.canvas.style.display = 'block';

        if (viewDisplayName.includes('SIR')) DOM.panelContextTitle.innerText = "SIR Diffusion Parameters";
        else if (viewDisplayName.includes('HITS')) DOM.panelContextTitle.innerText = "HITS Centrality Profiles";
        else if (viewDisplayName.includes('Louvain')) DOM.panelContextTitle.innerText = "Community Analytics & Topology";
        else if (viewDisplayName.includes('Ties')) DOM.panelContextTitle.innerText = "Granovetter Structural Ties";
        else if (viewDisplayName.includes('Components')) DOM.panelContextTitle.innerText = "Connectivity Components";
        else DOM.panelContextTitle.innerText = "Global Network Metrics";

    } else if (engineType === 'ANALYTICS') {
        appState.activeView = viewDisplayName;
        DOM.graphWorkspace.style.display = 'none';
        DOM.analyticsWorkspace.style.display = 'grid';

        // Hide side panel when showing analytics view
        if (DOM.infoPanel) DOM.infoPanel.style.display = 'none';

        renderAnalyticsDashboards(viewDisplayName);
    }
};

// --- GLOBAL INTERACTION CONTROLLERS ---
/**
 * Hover interaction controller
 */
window.setHoverInteraction = function (isEnabled) {
    appState.hoverInteractionEnabled = isEnabled;
    if (!isEnabled) {
        appState.hoveredNode = null;
        if (DOM.tooltip) DOM.tooltip.style.opacity = '0';
    }
    if (appState.globalNetworkData) {
        renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
    }
};

/**
 * Drag interaction controller
 */
window.setDragInteraction = function (isEnabled) {
    appState.dragInteractionEnabled = isEnabled;
};

/**
 * Main Layout Switcher
 * @param mode - 'force', 'radial', 'hierarchy'
 */
window.changeMainLayout = function (mode) {
    appState.mainViewLayoutMode = mode;
    updateGraphLayout(appState.activeView);
};

/**
 * Node Search Controller
 */
window.applySearch = function () {
    const inputVal = document.getElementById('node-search-input').value;
    appState.searchedNodeId = inputVal.trim() !== '' ? inputVal.trim() : null;
    if (appState.globalNetworkData) renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
};

/**
 * Clear search input
 */
window.clearSearch = function () {
    const inputEl = document.getElementById('node-search-input');
    if (inputEl) inputEl.value = '';
    appState.searchedNodeId = null;
    if (appState.globalNetworkData) renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
};

/**
 * Toggle side info panel visibility
 */
window.togglePanelVisibility = function () {
    const isCollapsed = DOM.infoPanel.classList.toggle('panel-collapsed');
    DOM.toggleIcon.innerText = isCollapsed ? "+" : "−";
};

/**
 * Dynamically updates the Sidebar textual interface based on the selected view
 */
function updateSidebarMetrics(metrics) {
    if (!metrics) return;
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = '';

    updateSIRSidebarMetrics(appState.globalNetworkData);

    // Getting appState properties
    const view = appState.activeView;

    // Injection general controls
    const interactionTogglesHTML = `
        <div class="widget-wrapper" style="margin-bottom: 15px; border-bottom: 1px solid #23263d; padding-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e2e8f0; margin-bottom: 8px;">
                <input type="checkbox" id="global-hover-toggle" ${appState.hoverInteractionEnabled ? 'checked' : ''} 
                       onchange="setHoverInteraction(this.checked)" style="accent-color: #4facfe;">
                Enable Hover Effects
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e2e8f0;">
                <input type="checkbox" id="global-drag-toggle" ${appState.dragInteractionEnabled ? 'checked' : ''} 
                       onchange="setDragInteraction(this.checked)" style="accent-color: #4facfe;">
                Enable Node Dragging
            </label>
        </div>
    `;

    // Search Bar & Layout Menu for graph view
    let mainViewControlsHTML = '';
    if (view === 'Main Visualization') {
        mainViewControlsHTML = `
            <div class="widget-wrapper" style="margin-bottom: 15px; border-bottom: 1px solid #23263d; padding-bottom: 12px;">
                <label style="color: #e2e8f0; font-size: 0.9em; margin-bottom: 5px; display: block;">Layout Engine:</label>
                <select id="layout-selector" onchange="changeMainLayout(this.value)" 
                        style="width: 100%; padding: 6px; background: #151720; color: #fff; border: 1px solid #4facfe; border-radius: 4px; margin-bottom: 12px;">
                    <option value="force" ${appState.mainViewLayoutMode === 'force' ? 'selected' : ''}>Force-Directed (Organic)</option>
                    <option value="radial" ${appState.mainViewLayoutMode === 'radial' ? 'selected' : ''}>Radial (By In-Degree)</option>
                    <option value="hierarchy" ${appState.mainViewLayoutMode === 'hierarchy' ? 'selected' : ''}>Hierarchy (Top-Down)</option>
                </select>

                <label style="color: #e2e8f0; font-size: 0.9em; margin-bottom: 5px; display: block;">Search Node ID:</label>
                <div style="display: flex; gap: 5px;">
                    <input type="text" id="node-search-input" list="node-id-suggestions" placeholder="e.g. 11438" 
                           style="width: 100%; padding: 6px; background: #151720; color: #fff; border: 1px solid #4facfe; border-radius: 4px;">
                    <datalist id="node-id-suggestions">
                        ${metrics.nodes.slice(0, 300).map(n => `<option value="${n.id}">`).join('')}
                    </datalist>
                    <button onclick="applySearch()" style="background: #4facfe; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer;" title="Search">🔍</button>
                    <button onclick="clearSearch()" style="background: #ff3d71; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer;" title="Clear">✖</button>
                </div>
            </div>
        `;
    }

    // Routing data to visualise
    if (view === 'Main Visualization') {
        body.innerHTML = interactionTogglesHTML + mainViewControlsHTML + `
            <div class="metric-row"><span class="metric-label">Total Nodes:</span><span class="metric-value">${metrics.node_count || 2708}</span></div>
            <div class="metric-row"><span class="metric-label">Total Edges:</span><span class="metric-value">${metrics.edge_count || 5429}</span></div>
            <div class="metric-row"><span class="metric-label">Avg Path Length:</span><span class="metric-value">${metrics.APL ? metrics.APL.toFixed(4) : '6.31'}</span></div>
        `;
    } else if (view === 'Louvain Structural Communities') {
        const uniqueClusters = new Set(metrics.nodes.map(n => n.cluster)).size;
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Communities Found:</span><span class="metric-value">${uniqueClusters}</span></div>
            <div class="metric-row"><span class="metric-label">Modularity (Q):</span><span class="metric-value">${metrics.modularity || '0.8147'}</span></div>
            <p style="font-size: 0.85em; color: #8b8d9b; margin-top: 10px;">*The background colored blobs represent the Convex Hull enveloping each Louvain community module.</p>
        `;
    } else if (view === 'HITS Authority & Hub Profiles') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Global Reciprocity:</span><span class="metric-value">${metrics.global_reciprocity ? metrics.global_reciprocity.toFixed(4) : 'N/A'}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #ffaa00; margin-bottom: 5px;">■ Pure Authority (Cited often)</div>
                <div style="color: #00f2fe; margin-bottom: 5px;">■ Pure Hub (Cites often)</div>
                <div style="color: #ff00e5;">■ Dual Role (Hub & Auth)</div>
            </div>
            <p style="font-size: 0.85em; color: #8b8d9b; margin-top: 10px;">Y-Axis maps Authority flow (Up). X-Axis maps Hub flow (Right).</p>
        `;
    } else if (view === 'Weak & Strong Ties Analysis') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Assortativity:</span><span class="metric-value">${(metrics.assortativity || 0).toFixed(4)}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #ffaa00; margin-bottom: 5px;">■ Weak Ties (Local Bridges / Inter-Field)</div>
                <div style="color: #4facfe;">■ Strong Ties (Intra-Field Dense Citations)</div>
            </div>
        `;
    } else if (view === 'Connected Components (SCC / WCC)') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Strong Components (SCC):</span><span class="metric-value">${metrics.scc || 'N/A'}</span></div>
            <div class="metric-row"><span class="metric-label">Weak Components (WCC):</span><span class="metric-value">${metrics.wcc || 'N/A'}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #00ff87; margin-bottom: 5px;">■ SCC Core Nodes (Mutual Reachability)</div>
                <div style="color: #ff3d71;">■ WCC Peripheral Nodes (Weak Reachability)</div>
            </div>
        `;
    } else if (view.includes('SIR')) {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Current Step (t):</span><span class="metric-value" id="sir-time-display">${appState.currentSirTime}</span></div>
            <div class="widget-wrapper" style="margin-top: 20px;">
                <label>Timeline Evolution:</label>
                <input type="range" min="0" max="${appState.maxSirTime}" value="${appState.currentSirTime}" id="sir-slider" style="width: 100%;">
            </div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #4facfe; margin-bottom: 5px;">■ Susceptible (S): <span class="metric-value" id="sir-S-display">${appState.currentSirS}</span></div>
                <div style="color: #ff3d71; margin-bottom: 5px;">■ Infected (I): <span class="metric-value" id="sir-I-display">${appState.currentSirI}</span></div>
                <div style="color: #73ff00;">■ Recovered (R): <span class="metric-value" id="sir-R-display">${appState.currentSirR}</span></div>
            </div>
        `;

        // Note: delay added to be sure that the DOM is fully rendered
        setTimeout(() => {
            updateSIRSidebarMetrics(metrics);
        }, 10);
    }
}

function updateSIRSidebarMetrics(metrics) {

    if (!metrics?.sir_history_summary) return;

    const applySIRState = (timeIndex, shouldRender = true) => {

        const currentMetrics = metrics.sir_history_summary[timeIndex];
        if (!currentMetrics) return;

        appState.currentSirTime = timeIndex;
        appState.currentSirS = currentMetrics.S;
        appState.currentSirI = currentMetrics.I;
        appState.currentSirR = currentMetrics.R;

        const timeEl = document.getElementById('sir-time-display');
        const sEl = document.getElementById('sir-S-display');
        const iEl = document.getElementById('sir-I-display');
        const rEl = document.getElementById('sir-R-display');

        if (timeEl) timeEl.textContent = timeIndex;
        if (sEl) sEl.textContent = appState.currentSirS;
        if (iEl) iEl.textContent = appState.currentSirI;
        if (rEl) rEl.textContent = appState.currentSirR;

        // render SOLO se richiesto e se canvas esiste
        if (shouldRender && appState.globalNetworkData) {
            requestAnimationFrame(() => {
                renderScene(
                    appState.globalNetworkData.nodes,
                    appState.globalNetworkData.links
                );
            });
        }
    };

    const slider = document.getElementById('sir-slider');

    if (slider && !slider.dataset.listenerAttached) {

        slider.addEventListener('input', (e) => {
            const timeIndex = Number(e.target.value);
            applySIRState(timeIndex, true);
        });

        slider.dataset.listenerAttached = "true";
    }

    const startTime = appState.currentSirTime ?? 0;
    applySIRState(startTime, false);
}
