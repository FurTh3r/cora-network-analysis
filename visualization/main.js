/* global d3 */

/**
 * ============================================================================
 * CORE GRAPH INTELLIGENCE ENGINE - CORA NETWORK HUB
 * ============================================================================
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
 * Loads the JSON file, pre-processes node adjacency (Ego-Network) and initializes D3 components.
 */
async function loadNetworkDatabase() {
    try {
        initializeTooltip();

        if (DOM.canvasTitle) DOM.canvasTitle.innerText = "Loading Cora Database Framework...";
        const data = await d3.json("../cora_visualization_data.json");
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

        // Updating the sidebar data
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
 * Updates the current view engine used within the window context.
 * This function facilitates switching between different rendering engines or views dynamically,
 * enabling seamless transitions in the application's UI.
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

        if (viewDisplayName.includes('SIR'))
            DOM.panelContextTitle.innerText = "SIR Diffusion Parameters";
        else if (viewDisplayName.includes('HITS'))
            DOM.panelContextTitle.innerText = "HITS Centrality Profiles";
        else if (viewDisplayName.includes('Louvain'))
            DOM.panelContextTitle.innerText = "Community Analytics & Topology";
        else if (viewDisplayName.includes('Ties'))
            DOM.panelContextTitle.innerText = "Granovetter Structural Ties";
        else if (viewDisplayName.includes('Components'))
            DOM.panelContextTitle.innerText = "Connectivity Components";
        else
            DOM.panelContextTitle.innerText = "Global Network Metrics";

    } else if (engineType === 'ANALYTICS') {
        appState.activeView = viewDisplayName;
        DOM.graphWorkspace.style.display = 'none';
        DOM.analyticsWorkspace.style.display = 'grid';
        document.getElementById('analytics-workspace').style.display = 'grid';

        // Hide side panel when showing analytics view
        if (DOM.infoPanel) DOM.infoPanel.style.display = 'none';

        renderAnalyticsDashboards(viewDisplayName);
    }
};

// --- GLOBAL INTERACTION CONTROLLERS ---
/**
 * Hover interaction controller.
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
 * Drag interaction controller.
 */
window.setDragInteraction = function (isEnabled) {
    appState.dragInteractionEnabled = isEnabled;
};

/**
 * Main Layout Switcher.
 * @param mode - 'force', 'radial', 'hierarchy'.
 */
window.changeMainLayout = function (mode) {
    appState.mainViewLayoutMode = mode;
    updateGraphLayout(appState.activeView);
};

/**
 * Node Search Controller.
 */
window.applySearch = function () {
    const inputVal = document.getElementById('node-search-input').value;
    appState.searchedNodeId = inputVal.trim() !== '' ? inputVal.trim() : null;
    if (appState.globalNetworkData) renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
};

/**
 * Clear search input.
 */
window.clearSearch = function () {
    const inputEl = document.getElementById('node-search-input');
    if (inputEl) inputEl.value = '';
    appState.searchedNodeId = null;
    if (appState.globalNetworkData) renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
};

/**
 * Toggle side info panel visibility.
 */
window.togglePanelVisibility = function () {
    const isCollapsed = DOM.infoPanel.classList.toggle('panel-collapsed');
    DOM.toggleIcon.innerText = isCollapsed ? "+" : "−";
};

/**
 * Dynamically updates the Sidebar textual interface based on the selected view.
 */
function updateSidebarMetrics(metrics) {
    if (!metrics) return;
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = '';

    updateSIRSidebarMetrics(appState.globalNetworkData);

    const view = appState.activeView;

    // General Toggles
    const interactionTogglesHTML = `
        <div class="widget-wrapper-toggle">
            <label class="toggle-label-custom">
                <span class="toggle-label-text">Enable Hover Effects</span>
                <div class="toggle-container-box">
                    <input type="checkbox" class="toggle-input" id="global-hover-toggle" 
                           ${appState.hoverInteractionEnabled ? 'checked' : ''} 
                           onchange="setHoverInteraction(this.checked)">
                    <span class="toggle-slider"></span>
                </div>
            </label>
            
            <label class="toggle-label-custom">
                <span class="toggle-label-text">Enable Node Dragging</span>
                <div class="toggle-container-box">
                    <input type="checkbox" class="toggle-input" id="global-drag-toggle" 
                           ${appState.dragInteractionEnabled ? 'checked' : ''} 
                           onchange="setDragInteraction(this.checked)">
                    <span class="toggle-slider"></span>
                </div>
            </label>
        </div>
    `;

    // Search and layout controls
    let mainViewControlsHTML = '';
    if (view === 'Main Visualization') {
        mainViewControlsHTML = `
            <div class="widget-wrapper-layout">
                <div class="layout-container-box">
                    <label class="layout-title-label">Layout Engine</label>
                    <select id="layout-selector" onchange="changeMainLayout(this.value)" class="custom-select">
                        <option value="force" ${appState.mainViewLayoutMode === 'force' ? 'selected' : ''}>
                            Force-Directed (Organic)
                        </option>
                        <option value="radial" ${appState.mainViewLayoutMode === 'radial' ? 'selected' : ''}>
                            Radial (By In-Degree)
                        </option>
                        <option value="hierarchy" ${appState.mainViewLayoutMode === 'hierarchy' ? 'selected' : ''}>
                            Hierarchy (Top-Down)
                        </option>
                    </select>
                </div>

                <label class="layout-title-label">Search Node ID:</label>
                <div class="search-container-box">
                    <div class="search-input-wrapper">
                        <input type="text" id="node-search-input" list="node-id-suggestions" placeholder="e.g. 11438" 
                        class="custom-search-input">
                        <datalist id="node-id-suggestions">
                            ${metrics.nodes.slice(0, 300).map(n => `<option value="${n.id}">`).join('')}
                        </datalist>
                    </div>
                
                    <button onclick="applySearch()" class="btn-search-apply" title="Search">🔍</button>
                    <button onclick="clearSearch()" class="btn-search-clear" title="Clear">✖</button>
                </div>
            </div>
        `;
    }

    // Rendering based on active view (without extractedStylesHTML +)
    if (view === 'Main Visualization') {
        const gradientLegendHTML = `
            <div class="gradient-legend-container">
                <div class="gradient-metric-label">Top 10 Papers Hierarchy</div>
                <div class="gradient-bar"></div>
                <div class="gradient-labels">
                    <span style="color: #ff4da6;">Rank #1 (Max Hub)</span>
                    <span style="color: #4facfe;">Rank #10 (Min Hub)</span>
                </div>
            </div>
            <hr class="separator-line">
        `;

        body.innerHTML = interactionTogglesHTML + mainViewControlsHTML + gradientLegendHTML + `
            <div class="metric-row" title="The total number of unique papers (vertices) within the network dataset.">
                <span class="metric-label">Total Nodes:</span>
                <span class="metric-value">${metrics.node_count || 2708}</span>
            </div>
            <div class="metric-row" title="The total number of citation links (directed edges) connecting the papers.">
                <span class="metric-label">Total Edges:</span>
                <span class="metric-value">${metrics.edge_count || 5429}</span>
            </div>
            <div class="metric-row" title="The average number of steps along the shortest paths for all 
                possible pairs of network nodes.">
                <span class="metric-label">Avg Path Length:</span>
                <span class="metric-value">${metrics.benchmark_metrics.apl ? metrics.benchmark_metrics.apl
            .toFixed(4) : '0'}</span>
            </div>
            <div class="metric-row" title="The ratio of actual edges to the total number of possible edges, measuring 
                how interconnected the network is.">
                <span class="metric-label">Network Density:</span>
                <span class="metric-value">${metrics.density ? metrics.density.toFixed(5) : '0'}</span>
            </div>
            <div class="metric-row" title="The average number of total connections (both incoming citations and 
                outgoing references) per paper.">
                <span class="metric-label">Average Degree:</span>
                <span class="metric-value">${metrics.avg_degree ? metrics.avg_degree.toFixed(2) : '0'}</span>
            </div>
            <div class="metric-row" title="A measure of the degree to which nodes in a graph tend to cluster together, 
                forming tight citation triangles.">
                <span class="metric-label">Avg Clustering Coeff.:</span>
                <span class="metric-value">${metrics.benchmark_metrics.cora_clustering ? metrics.benchmark_metrics
            .cora_clustering.toFixed(4) : '0'}</span>
            </div>
        `;
    } else if (view === 'Louvain Structural Communities') {
        const uniqueClusters = new Set(metrics.nodes.map(n => n.cluster)).size;
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Communities Found:</span>
            <span class="metric-value">${uniqueClusters}</span></div>
            <div class="metric-row"><span class="metric-label">Modularity (Q):</span>
            <span class="metric-value">${metrics.modularity || '0.8147'}</span></div>
            <p class="community-comment">*The background colored blobs represent the Convex Hull enveloping each 
                Louvain community module.</p>
        `;
    } else if (view === 'HITS Authority & Hub Profiles') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row">
                <span class="metric-label">Global Reciprocity:</span>
                <span class="metric-value">${metrics.benchmark_metrics.cora_reciprocity ? metrics.benchmark_metrics
            .cora_reciprocity.toFixed(4) : 'N/A'}</span>
            </div>
            <div class="hits-legend-container">
                <div class="hits-color-auth">■ Pure Authority (Cited often)</div>
                <div class="hits-color-hub">■ Pure Hub (Cites often)</div>
                <div class="hits-color-dual">■ Dual Role (Hub & Auth)</div>
            </div>
            <p class="hits-axis-comment">Y-Axis maps Authority flow (Up). X-Axis maps Hub flow (Right).</p>
        `;
    } else if (view === 'Weak & Strong Ties Analysis') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Assortativity:</span>
            <span class="metric-value">${(metrics.assortativity || 0).toFixed(4)}</span></div>
            <div class="hits-legend-container">
                <div class="ties-color-weak">■ Weak Ties (Local Bridges / Inter-Field)</div>
                <div class="ties-color-strong">■ Strong Ties (Intra-Field Dense Citations)</div>
            </div>
        `;
    } else if (view === 'Connected Components (SCC / WCC)') {
        const giantCoreSize = metrics.scc_giant_size || 0;
        const mainBodySize = metrics.wcc_giant_size || 0;

        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row scc-row">
                <span class="metric-label">Strong Components (SCC):</span>
                <span class="metric-value">
                    ${metrics.scc_count || 'N/A'} 
                    <span class="scc-span-highlight">(Giant Core: ${giantCoreSize} nodes)</span>
                </span>
            </div>
            <div class="metric-row wcc-row">
                <span class="metric-label">Weak Components (WCC):</span>
                <span class="metric-value">
                    ${metrics.wcc_count || 'N/A'} 
                    <span class="wcc-span-highlight">(Main Body: ~${mainBodySize} nodes)</span>
                </span>
            </div>
            <div class="components-legend">
                <div class="comp-bullet-scc"><span>■</span> SCC Giant Core (Mutual Reachability)</div>
                <div class="comp-desc-scc">*Nota: Le restanti SCC sono i singoli nodi azzurri/rossi senza cicli 
                    di ritorno.</div>
                <div class="comp-bullet-wcc"><span>■</span> WCC Main Network (Giant Component)</div>
                <div class="comp-bullet-isolated"><span>■</span> Isolated WCC (Disconnected Clusters)</div>
            </div>
        `;
    } else if (view.includes('SIR')) {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row">
                <span class="metric-label">Current Step (t):</span>
                <span class="metric-value" id="sir-time-display">${appState.currentSirTime}</span>
            </div>
            <div class="widget-wrapper sir-timeline-wrapper">
                <label class="sir-timeline-label">Timeline Evolution</label>
                <input type="range" min="0" max="${appState.maxSirTime}" value="${appState.currentSirTime}" 
                    id="sir-slider" class="sir-custom-slider">
            </div>
            <div class="sir-legend-container">
                <div class="sir-bullet-s">■ Susceptible (S): <span class="metric-value" id="sir-S-display">
                    ${appState.currentSirS}</span></div>
                <div class="sir-bullet-i">■ Infected (I): <span class="metric-value" id="sir-I-display">
                    ${appState.currentSirI}</span></div>
                <div class="sir-bullet-r">■ Recovered (R): <span class="metric-value" id="sir-R-display">
                    ${appState.currentSirR}</span></div>
            </div>
        `;

        setTimeout(() => {
            updateSIRSidebarMetrics(metrics);
        }, 10);
    }
}

/**
 * Updates the SIR (Susceptible, Infected, Recovered) metrics displayed in the sidebar and sets up
 * the necessary event listeners for user interaction, such as the slider input for time-based adjustments.
 */
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
        if (sEl) sEl.textContent = appState.currentSirS.toString();
        if (iEl) iEl.textContent = appState.currentSirI.toString();
        if (rEl) rEl.textContent = appState.currentSirR.toString();

        // Render only if requested
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
