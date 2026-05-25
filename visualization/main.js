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
        document.getElementById('analytics-workspace').style.display = 'grid';

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
    <div class="widget-wrapper" style="margin-bottom: 18px; border-bottom: 1px solid #23263d; padding-bottom: 14px; display: flex; flex-direction: column; gap: 12px;">
            
            <label class="toggle-label" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; cursor: pointer; margin: 0; padding: 0;">
                <span style="color: #e2e8f0; font-size: 0.9em; user-select: none;">Enable Hover Effects</span>
                <div style="position: relative; width: 38px; height: 20px; min-width: 38px;">
                    <input type="checkbox" class="toggle-input" id="global-hover-toggle" 
                           ${appState.hoverInteractionEnabled ? 'checked' : ''} 
                           onchange="setHoverInteraction(this.checked)">
                    <span class="toggle-slider"></span>
                </div>
            </label>
            
            <label class="toggle-label" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; cursor: pointer; margin: 0; padding: 0;">
                <span style="color: #e2e8f0; font-size: 0.9em; user-select: none;">Enable Node Dragging</span>
                <div style="position: relative; width: 38px; height: 20px; min-width: 38px;">
                    <input type="checkbox" class="toggle-input" id="global-drag-toggle" 
                           ${appState.dragInteractionEnabled ? 'checked' : ''} 
                           onchange="setDragInteraction(this.checked)">
                    <span class="toggle-slider"></span>
                </div>
            </label>
            
        </div>
    `;

    // Search Bar & Layout Menu for graph view
    let mainViewControlsHTML = '';
    if (view === 'Main Visualization') {
        mainViewControlsHTML = `
            <div class="widget-wrapper" style="margin-bottom: 15px; border-bottom: 1px solid #23263d; padding-bottom: 12px;">
                <div style="margin-bottom: 15px; width: 100%;">
                    <label style="color: #e2e8f0; font-size: 0.9em; margin-bottom: 5px; display: block;">
                        Layout Engine
                    </label>
                    
                    <select id="layout-selector" onchange="changeMainLayout(this.value)" 
                            style="width: 100%; padding: 8px 12px; background: #11131c; color: #ffffff; border: 1px solid #2d3142; border-radius: 6px; font-size: 0.9em; cursor: pointer; outline: none; transition: all 0.3s ease; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);"
                            onfocus="this.style.borderColor='#4facfe'; this.style.boxShadow='0 0 8px rgba(79, 172, 254, 0.3), inset 0 1px 3px rgba(0,0,0,0.5)';"
                            onblur="this.style.borderColor='#2d3142'; this.style.boxShadow='inset 0 1px 3px rgba(0,0,0,0.5)';"
                            onmouseover="this.style.borderColor='#4facfe';">
                        
                        <option value="force" ${appState.mainViewLayoutMode === 'force' ? 'selected' : ''} style="background: #11131c; color: #fff;">
                            Force-Directed (Organic)
                        </option>
                        <option value="radial" ${appState.mainViewLayoutMode === 'radial' ? 'selected' : ''} style="background: #11131c; color: #fff;">
                            Radial (By In-Degree)
                        </option>
                        <option value="hierarchy" ${appState.mainViewLayoutMode === 'hierarchy' ? 'selected' : ''} style="background: #11131c; color: #fff;">
                            Hierarchy (Top-Down)
                        </option>
                        
                    </select>
                </div>

                <label style="color: #e2e8f0; font-size: 0.9em; margin-bottom: 5px; display: block;">Search Node ID:</label>
                <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                    <div style="position: relative; flex-grow: 1;">
                        <input type="text" id="node-search-input" list="node-id-suggestions" placeholder="e.g. 11438" 
                               style="width: 100%; padding: 8px 12px; background: #11131c; color: #ffffff; border: 1px solid #2d3142; border-radius: 6px; font-size: 0.9em; transition: all 0.3s ease; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);"
                               onfocus="this.style.borderColor='#4facfe'; this.style.boxShadow='0 0 8px rgba(79, 172, 254, 0.3), inset 0 1px 3px rgba(0,0,0,0.5)';"
                               onblur="this.style.borderColor='#2d3142'; this.style.boxShadow='inset 0 1px 3px rgba(0,0,0,0.5)';">
                        <datalist id="node-id-suggestions">
                            ${metrics.nodes.slice(0, 300).map(n => `<option value="${n.id}">`).join('')}
                        </datalist>
                    </div>
                
                    <button onclick="applySearch()" 
                            style="background: #4facfe; border: none; color: white; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9em; font-weight: bold; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(79, 172, 254, 0.2);" 
                            title="Search"
                            onmouseover="this.style.background='#00c6ff'; this.style.transform='scale(1.03)'; this.style.boxShadow='0 0 10px rgba(79, 172, 254, 0.5)';"
                            onmouseout="this.style.background='#4facfe'; this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(79, 172, 254, 0.2)';"
                            onmousedown="this.style.transform='scale(0.97)';">
                        🔍
                    </button>
                
                    <button onclick="clearSearch()" 
                            style="background: #231c26; border: 1px solid #ff3d71; color: #ff3d71; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9em; transition: all 0.2s ease;" 
                            title="Clear"
                            onmouseover="this.style.background='#ff3d71'; this.style.color='white'; this.style.transform='scale(1.03)'; this.style.boxShadow='0 0 10px rgba(255, 61, 113, 0.4)';"
                            onmouseout="this.style.background='#231c26'; this.style.color='#ff3d71'; this.style.transform='scale(1)'; this.style.boxShadow='none';"
                            onmousedown="this.style.transform='scale(0.97)';">
                        ✖
                    </button>
                </div>
            </div>
        `;
    }

    // Routing data to visualise
    if (view === 'Main Visualization') {
        const gradientLegendHTML = `
            <div class="gradient-legend-container" style="margin: 15px 0 20px 0; font-family: sans-serif;">
                <div class="metric-label" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #8b8d9b; font-weight: bold;">
                    Top 10 Papers Hierarchy
                </div>
                <div class="gradient-bar" style="
                    height: 14px; 
                    width: 100%; 
                    background: linear-gradient(to right, #ff4da6, #e653b6, #cc5ac6, #b360d6, #9967e6, #806df0, #737ef7, #668eff, #599eff, #4facfe); 
                    border-radius: 4px;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
                "></div>
                <div class="gradient-labels" style="
                    display: flex; 
                    justify-content: space-between; 
                    margin-top: 6px; 
                    font-size: 11px; 
                    font-weight: 600;
                ">
                    <span style="color: #ff4da6;">Rank #1 (Max Hub)</span>
                    <span style="color: #4facfe;">Rank #10 (Min Hub)</span>
                </div>
            </div>
            <hr style="border: 0; border-top: 1px solid #23263d; margin: 15px 0;">
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
            
            <div class="metric-row" title="The average number of steps along the shortest paths for all possible pairs of network nodes.">
                <span class="metric-label">Avg Path Length:</span>
                <span class="metric-value">${metrics.apl ? metrics.apl.toFixed(4) : '0'}</span>
            </div>
            
            <div class="metric-row" title="The ratio of actual edges to the total number of possible edges, measuring how interconnected the network is.">
                <span class="metric-label">Network Density:</span>
                <span class="metric-value">${metrics.density ? metrics.density.toFixed(5) : '0'}</span>
            </div>
            
            <div class="metric-row" title="The average number of total connections (both incoming citations and outgoing references) per paper.">
                <span class="metric-label">Average Degree:</span>
                <span class="metric-value">${metrics.avg_degree ? metrics.avg_degree.toFixed(2) : '0'}</span>
            </div>
            
            <div class="metric-row" title="A measure of the degree to which nodes in a graph tend to cluster together, forming tight citation triangles.">
                <span class="metric-label">Avg Clustering Coeff.:</span>
                <span class="metric-value">${metrics.acc ? metrics.acc.toFixed(4) : '0'}</span>
            </div>
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
        const giantCoreSize = metrics.scc_giant_size || 0;
        const mainBodySize = metrics.wcc_giant_size || 0;

        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row" style="margin-bottom: 8px;">
                <span class="metric-label">Strong Components (SCC):</span>
                <span class="metric-value">
                    ${metrics.scc || 'N/A'} 
                    <span style="color: #00ff87; font-size: 0.85em; font-weight: normal; margin-left: 5px;">
                        (Giant Core: ${giantCoreSize} nodes)
                    </span>
                </span>
            </div>
            
            <div class="metric-row" style="margin-bottom: 12px;">
                <span class="metric-label">Weak Components (WCC):</span>
                <span class="metric-value">
                    ${metrics.wcc || 'N/A'} 
                    <span style="color: #4facfe; font-size: 0.85em; font-weight: normal; margin-left: 5px;">
                        (Main Body: ~${mainBodySize} nodes)
                    </span>
                </span>
            </div>
            
            <div style="margin-top: 15px; font-size: 0.85em; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <div style="color: #00ff87; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span>■</span> SCC Giant Core (Mutual Reachability)
                </div>
                <div style="color: #888; font-size: 0.85em; margin-left: 14px; margin-bottom: 10px; font-style: italic;">
                    *Nota: Le restanti SCC sono i singoli nodi azzurri/rossi senza cicli di ritorno.
                </div>
                
                <div style="color: #4facfe; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span>■</span> WCC Main Network (Giant Component)
                </div>
                
                <div style="color: #ff3d71; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span>■</span> Isolated WCC (Disconnected Clusters)
                </div>
            </div>
        `;
    } else if (view.includes('SIR')) {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Current Step (t):</span><span class="metric-value" id="sir-time-display">${appState.currentSirTime}</span></div>
            <div class="widget-wrapper" style="margin-top: 20px;">
                <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #8b8d9b; font-weight: bold; display: block; margin-bottom: 10px;">Timeline Evolution</label>
                
                <input type="range" min="0" max="${appState.maxSirTime}" value="${appState.currentSirTime}" id="sir-slider" style="
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    background: #23263d;
                    border-radius: 8px;
                    outline: none;
                    cursor: pointer;
                    transition: background 0.3s ease;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
                    margin: 10px 0;
                ">
                
                <style>
                    #sir-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #ff3d71;
                        cursor: pointer;
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 8px rgba(255, 61, 113, 0.5);
                        transition: transform 0.1s ease, background-color 0.2s ease;
                    }
                    #sir-slider::-webkit-slider-thumb:hover {
                        transform: scale(1.2);
                        background: #ff5c8a;
                    }
                    #sir-slider::-moz-range-thumb {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: #ff3d71;
                        cursor: pointer;
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 8px rgba(255, 61, 113, 0.5);
                        transition: transform 0.1s ease;
                    }
                    #sir-slider::-moz-range-thumb:hover {
                        transform: scale(1.2);
                    }
                </style>
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
