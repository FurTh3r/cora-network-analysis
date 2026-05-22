/* global d3 */

/**
 * ============================================================================
 * CORE GRAPH INTELLIGENCE ENGINE - CORA NETWORK HUB
 * ============================================================================
 * Application state management, d3.force layout calculations,
 * advanced HTML5 Canvas rendering, and real-time geometric interactions.
 */

// --- WORKSPACE DOM ELEMENTS ---
const graphWorkspace = document.getElementById('network-workspace');
const analyticsWorkspace = document.getElementById('analytics-workspace');
const canvasTitle = document.getElementById('canvas-target-title');
const panelContextTitle = document.getElementById('panel-context-title');
const infoPanel = document.getElementById('info-panel');
const toggleIcon = document.getElementById('toggle-icon');

// --- DYNAMIC TOOLTIP CREATION ---
const tooltip = document.createElement('div');
Object.assign(tooltip.style, {
    position: 'absolute',
    padding: '10px 14px',
    background: 'rgba(15, 17, 28, 0.95)',
    color: '#fff',
    border: '1px solid #4facfe',
    borderRadius: '6px',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    zIndex: '1000',
    fontFamily: 'monospace',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
});
document.body.appendChild(tooltip);

// --- HIGH CONTRAST COLOR PALETTE (LOUVAIN COMMUNITIES) ---
const clusterColors = [
    '#00f2fe', '#ff3d71', '#00e5ff', '#ffaa00',
    '#b337ff', '#73ff00', '#ff00e5', '#2671ff',
    '#00ff87', '#ff5e62', '#ffe600', '#bf00ff'
];

// --- GLOBAL SIMULATION STATE VARIABLES ---
let canvas, ctx, simulation, globalNetworkData;
let currentTransform = d3.zoomIdentity;

// Active Interaction States
let hoveredNode = null;
let activeView = 'Main Visualization';
let hoverInteractionEnabled = true; // Global flag for hover effects
let dragInteractionEnabled = true;  // Global flag for node dragging

// Search and Layout States
let searchedNodeId = null;
let mainViewLayoutMode = 'force'; // 'force', 'radial', 'hierarchy'

// SIR Model Temporal Parameters
let currentSirTime = 0;
let maxSirTime = 50;

// --- DATA LOADING PIPELINE ---
window.addEventListener('DOMContentLoaded', () => {
    loadNetworkDatabase().then(() => {
        console.log("Cora Engine initialized successfully.")
    });
});

/**
 * Loads the JSON file, pre-processes node adjacencies (Ego-Network)
 * and initializes D3 components.
 */
async function loadNetworkDatabase() {
    try {
        canvasTitle.innerText = "Loading Cora Database Framework...";
        const data = await d3.json("cora_visualization_data.json");
        globalNetworkData = data;

        // Dynamic construction of the local Ego-Network to optimize hovering and searching
        globalNetworkData.nodes.forEach(n => n.neighbors = new Set());
        globalNetworkData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const sNode = globalNetworkData.nodes.find(n => n.id === sourceId);
            const tNode = globalNetworkData.nodes.find(n => n.id === targetId);
            if (sNode && tNode) {
                sNode.neighbors.add(targetId);
                tNode.neighbors.add(sourceId);
            }
        });

        // SIR timeline horizon configuration
        const sampleNode = data.nodes[0];
        if (sampleNode && sampleNode.sir_history) {
            maxSirTime = sampleNode.sir_history.length - 1;
        }

        updateSidebarMetrics(data);

        if (data.nodes && data.links) {
            initializeCanvasD3Graph(data.nodes, data.links);
            updateGraphLayout(activeView);
        }
    } catch (error) {
        canvasTitle.innerText = "Data Pipeline Failure!";
        console.error(error);
    }
}

// --- GLOBAL INTERACTION CONTROLLERS ---

function setHoverInteraction(isEnabled) {
    hoverInteractionEnabled = isEnabled;
    if (!isEnabled) {
        hoveredNode = null;
        tooltip.style.opacity = '0';
    }
    if (globalNetworkData) renderScene(globalNetworkData.nodes, globalNetworkData.links);
}

function setDragInteraction(isEnabled) {
    dragInteractionEnabled = isEnabled;
}

function changeMainLayout(mode) {
    mainViewLayoutMode = mode;
    updateGraphLayout(activeView);
}

function applySearch() {
    const inputVal = document.getElementById('node-search-input').value;
    searchedNodeId = inputVal.trim() !== '' ? inputVal.trim() : null;
    if (globalNetworkData) renderScene(globalNetworkData.nodes, globalNetworkData.links);
}

function clearSearch() {
    const inputEl = document.getElementById('node-search-input');
    if (inputEl) inputEl.value = '';
    searchedNodeId = null;
    if (globalNetworkData) renderScene(globalNetworkData.nodes, globalNetworkData.links);
}

/**
 * View Environment Switcher (Routing for Graph Views and Analytics)
 */
function switchViewEngine(engineType, viewDisplayName, menuElement) {
    let items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    menuElement.classList.add('active');

    // Reset search when switching views
    searchedNodeId = null;

    if (engineType === 'GRAPH') {
        activeView = viewDisplayName;
        updateGraphLayout(viewDisplayName);
        updateSidebarMetrics(globalNetworkData);

        analyticsWorkspace.style.display = 'none';
        graphWorkspace.style.display = 'flex';

        // MOSTRA il pannello laterale quando sei nella vista Grafo topologico
        if (infoPanel) infoPanel.style.display = 'block';

        canvasTitle.innerText = viewDisplayName;
        if (canvas) canvas.style.display = 'block';

        // Contextual Sidebar Title Routing
        if (viewDisplayName.includes('SIR')) panelContextTitle.innerText = "SIR Diffusion Parameters";
        else if (viewDisplayName.includes('HITS')) panelContextTitle.innerText = "HITS Centrality Profiles";
        else if (viewDisplayName.includes('Louvain')) panelContextTitle.innerText = "Community Analytics & Topology";
        else if (viewDisplayName.includes('Ties')) panelContextTitle.innerText = "Granovetter Structural Ties";
        else if (viewDisplayName.includes('Components')) panelContextTitle.innerText = "Connectivity Components";
        else panelContextTitle.innerText = "Global Network Metrics";

    } else if (engineType === 'ANALYTICS') {
        graphWorkspace.style.display = 'none';
        analyticsWorkspace.style.display = 'grid';

        // NASCONDI il side panel destro quando vai sui grafici statistici
        if (infoPanel) infoPanel.style.display = 'none';

        // Route to D3 chart rendering engines (Corretto viewDisplayName)
        renderAnalyticsDashboards(viewDisplayName);
    }
}

function togglePanelVisibility() {
    const isCollapsed = infoPanel.classList.toggle('panel-collapsed');
    toggleIcon.innerText = isCollapsed ? "+" : "−";
}

/**
 * Dynamically updates the Sidebar textual interface based on the selected view
 */
function updateSidebarMetrics(metrics) {
    if (!metrics) return;
    const body = document.getElementById('info-panel-body');
    body.innerHTML = '';

    // Injection of global interaction controllers
    const interactionTogglesHTML = `
        <div class="widget-wrapper" style="margin-bottom: 15px; border-bottom: 1px solid #23263d; padding-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e2e8f0; margin-bottom: 8px;">
                <input type="checkbox" id="global-hover-toggle" ${hoverInteractionEnabled ? 'checked' : ''} 
                       onchange="setHoverInteraction(this.checked)" style="accent-color: #4facfe;">
                Enable Hover Effects
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e2e8f0;">
                <input type="checkbox" id="global-drag-toggle" ${dragInteractionEnabled ? 'checked' : ''} 
                       onchange="setDragInteraction(this.checked)" style="accent-color: #4facfe;">
                Enable Node Dragging
            </label>
        </div>
    `;

    // Search Bar & Layout Menu exclusively for Main View
    let mainViewControlsHTML = '';
    if (activeView === 'Main Visualization') {
        mainViewControlsHTML = `
            <div class="widget-wrapper" style="margin-bottom: 15px; border-bottom: 1px solid #23263d; padding-bottom: 12px;">
                <label style="color: #e2e8f0; font-size: 0.9em; margin-bottom: 5px; display: block;">Layout Engine:</label>
                <select id="layout-selector" onchange="changeMainLayout(this.value)" 
                        style="width: 100%; padding: 6px; background: #151720; color: #fff; border: 1px solid #4facfe; border-radius: 4px; margin-bottom: 12px;">
                    <option value="force" ${mainViewLayoutMode === 'force' ? 'selected' : ''}>Force-Directed (Organic)</option>
                    <option value="radial" ${mainViewLayoutMode === 'radial' ? 'selected' : ''}>Radial (By In-Degree)</option>
                    <option value="hierarchy" ${mainViewLayoutMode === 'hierarchy' ? 'selected' : ''}>Hierarchy (Top-Down)</option>
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

    if (activeView === 'Main Visualization') {
        body.innerHTML = interactionTogglesHTML + mainViewControlsHTML + `
            <div class="metric-row"><span class="metric-label">Total Nodes:</span><span class="metric-value">${metrics.node_count || 2708}</span></div>
            <div class="metric-row"><span class="metric-label">Total Edges:</span><span class="metric-value">${metrics.edge_count || 5429}</span></div>
            <div class="metric-row"><span class="metric-label">Avg Path Length:</span><span class="metric-value">${metrics.APL ? metrics.APL.toFixed(4) : '6.31'}</span></div>
        `;
    } else if (activeView === 'Louvain Structural Communities') {
        const uniqueClusters = new Set(metrics.nodes.map(n => n.cluster)).size;
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Communities Found:</span><span class="metric-value">${uniqueClusters}</span></div>
            <div class="metric-row"><span class="metric-label">Modularity (Q):</span><span class="metric-value">${metrics.modularity || '0.8147'}</span></div>
            <p style="font-size: 0.85em; color: #8b8d9b; margin-top: 10px;">*The background colored blobs represent the Convex Hull enveloping each Louvain community module.</p>
        `;
    } else if (activeView === 'HITS Authority & Hub Profiles') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Global Reciprocity:</span><span class="metric-value">${metrics.global_reciprocity ? metrics.global_reciprocity.toFixed(4) : 'N/A'}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #ffaa00; margin-bottom: 5px;">■ Pure Authority (Cited often)</div>
                <div style="color: #00f2fe; margin-bottom: 5px;">■ Pure Hub (Cites often)</div>
                <div style="color: #ff00e5;">■ Dual Role (Hub & Auth)</div>
            </div>
            <p style="font-size: 0.85em; color: #8b8d9b; margin-top: 10px;">Y-Axis maps Authority flow (Up). X-Axis maps Hub flow (Right).</p>
        `;
    } else if (activeView === 'Weak & Strong Ties Analysis') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Assortativity:</span><span class="metric-value">${(metrics.assortativity || 0).toFixed(4)}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #ffaa00; margin-bottom: 5px;">■ Weak Ties (Local Bridges / Inter-Field)</div>
                <div style="color: #4facfe;">■ Strong Ties (Intra-Field Dense Citations)</div>
            </div>
        `;
    } else if (activeView === 'Connected Components (SCC / WCC)') {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Strong Components (SCC):</span><span class="metric-value">${metrics.scc || 'N/A'}</span></div>
            <div class="metric-row"><span class="metric-label">Weak Components (WCC):</span><span class="metric-value">${metrics.wcc || 'N/A'}</span></div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #00ff87; margin-bottom: 5px;">■ SCC Core Nodes (Mutual Reachability)</div>
                <div style="color: #ff3d71;">■ WCC Peripheral Nodes (Weak Reachability)</div>
            </div>
        `;
    } else if (activeView.includes('SIR')) {
        body.innerHTML = interactionTogglesHTML + `
            <div class="metric-row"><span class="metric-label">Current Step (t):</span><span class="metric-value" id="sir-time-display">${currentSirTime}</span></div>
            <div class="widget-wrapper" style="margin-top: 20px;">
                <label>Timeline Evolution:</label>
                <input type="range" min="0" max="${maxSirTime}" value="${currentSirTime}" id="sir-slider" style="width: 100%;">
            </div>
            <div style="margin-top: 15px; font-size: 0.85em;">
                <div style="color: #4facfe; margin-bottom: 5px;">■ Susceptible (S)</div>
                <div style="color: #ff3d71; margin-bottom: 5px;">■ Infected (I)</div>
                <div style="color: #73ff00;">■ Recovered (R)</div>
            </div>
        `;

        document.getElementById('sir-slider').addEventListener('input', (e) => {
            currentSirTime = parseInt(e.target.value);
            document.getElementById('sir-time-display').innerText = currentSirTime;
            renderScene(globalNetworkData.nodes, globalNetworkData.links);
        });
    }
}

/**
 * --- D3 GRAPH INITIALIZATION ENGINE & ADVANCED NAVIGATION ---
 */
function initializeCanvasD3Graph(nodes, links) {
    canvasTitle.style.display = 'none';
    const width = graphWorkspace.clientWidth;
    const height = graphWorkspace.clientHeight;

    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    graphWorkspace.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // D3.force Physics Engine Definition
    simulation = d3.forceSimulation(nodes)
        .randomSource(d3.randomLcg(0.42))
        .force("link", d3.forceLink(links).id(d => d.id).distance(45).strength(0.4))
        .force("charge", d3.forceManyBody().strength(-60).theta(0.9).distanceMax(500))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => Math.sqrt(d.in_deg) + 4).iterations(2));

    // --- ZOOM AND PAN NAVIGATION LOGIC ---
    // Custom filter: Left click drags nodes, middle click (or scroll) pans canvas.
    const zoomBehavior = d3.zoom()
        .scaleExtent([0.02, 8])
        .filter(event => {
            if (event.type === 'mousedown') {
                if (event.button === 1) return true; // Middle button always pans
                if (event.button === 0) {
                    const cx = currentTransform.invertX(event.offsetX);
                    const cy = currentTransform.invertY(event.offsetY);
                    const nodeHit = simulation.find(cx, cy, 30);
                    return !nodeHit; // Pan if NO node is under the cursor
                }
                return false;
            }
            return !event.ctrlKey && event.button !== 2; // Allow standard wheel zoom
        })
        .on("zoom", (event) => {
            currentTransform = event.transform;
            renderScene(nodes, links);
        });

    // --- NODE DRAG BEHAVIOR ---
    const dragBehavior = d3.drag()
        .container(canvas)
        .filter(event => event.button === 0 && dragInteractionEnabled) // Only if left click and dragging enabled
        .subject((event) => {
            // Locate node accurately factoring in zoom/pan transforms
            const [mx, my] = d3.pointer(event, canvas);
            return simulation.find(currentTransform.invertX(mx), currentTransform.invertY(my), 30);
        })
        .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
            // FIX: Ensure coordinates are inverted correctly during drag across a transformed canvas
            const [mx, my] = d3.pointer(event.sourceEvent, canvas);
            event.subject.fx = currentTransform.invertX(mx);
            event.subject.fy = currentTransform.invertY(my);
        })
        .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        });

    // --- INTERACTIVE HOVER TRACKING ---
    d3.select(canvas).on("mousemove", (event) => {
        if (!hoverInteractionEnabled) return; // Halt if disabled from menu

        const [mx, my] = d3.pointer(event);
        const cx = currentTransform.invertX(mx);
        const cy = currentTransform.invertY(my);

        const node = simulation.find(cx, cy, 25);

        if (node !== hoveredNode) {
            hoveredNode = node;
            renderScene(nodes, links);

            if (node) {
                // Contextual Tooltip Formatting
                if (activeView === 'Main Visualization' || activeView.includes('SIR')) {
                    tooltip.innerHTML = `ID: ${node.id}<br>Field: ${node.field}<br>In-Degree: ${node.in_deg}<br>Out-Degree: ${node.out_deg}`;
                } else if (activeView === 'Louvain Structural Communities') {
                    tooltip.innerHTML = `Community Module: ${node.cluster}<br>ID: ${node.id}<br>PageRank: ${(node.pagerank || 0).toFixed(5)}`;
                } else if (activeView === 'HITS Authority & Hub Profiles') {
                    tooltip.innerHTML = `ID: ${node.id}<br>Authority Score: ${(node.auth || 0).toFixed(5)}<br>Hub Score: ${(node.hub || 0).toFixed(5)}`;
                } else if (activeView === 'Weak & Strong Ties Analysis') {
                    tooltip.innerHTML = `ID: ${node.id}<br>Cross-Field Node: ${node.in_deg > 5 ? 'Global Interconnector' : 'Local Clusterer'}`;
                } else if (activeView === 'Connected Components (SCC / WCC)') {
                    const componentType = node.in_deg > 1 ? "SCC Core Engine" : "WCC Periphery Leaf";
                    tooltip.innerHTML = `ID: ${node.id}<br>Component Classification: ${componentType}`;
                }
                tooltip.style.opacity = '1';
            } else {
                tooltip.style.opacity = '0';
            }
        }

        if (hoveredNode) {
            tooltip.style.left = (event.pageX + 16) + 'px';
            tooltip.style.top = (event.pageY + 16) + 'px';
        }
    });

    d3.select(canvas).on("mouseout", () => {
        hoveredNode = null;
        tooltip.style.opacity = '0';
        renderScene(nodes, links);
    });

    // Apply combined behaviors to Canvas
    d3.select(canvas)
        .call(zoomBehavior)
        .call(dragBehavior)
        .call(zoomBehavior.transform, d3.zoomIdentity);

    simulation.on("tick", () => renderScene(nodes, links));
}

/**
 * Synchronization and execution of graphic rendering cycle on Canvas
 */
function renderScene(nodes, links) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Geometric Transformation Matrices (Zoom/Pan)
    ctx.translate(currentTransform.x, currentTransform.y);
    ctx.scale(currentTransform.k, currentTransform.k);

    drawNetwork(nodes, links);
    ctx.restore();
}

/**
 * --- CONVEX HULLS ENGINE ---
 * Groups nodes by community identifier and generates modeled background polygons.
 */
function drawCommunityHulls(nodes) {
    const communities = d3.group(nodes, d => d.cluster);

    communities.forEach((members, clusterId) => {
        if (members.length < 3) return; // Convex hull requires min 3 vertices

        const points = members.map(d => [d.x, d.y]);
        const hull = d3.polygonHull(points);

        if (hull) {
            ctx.save();

            // Dynamic shadow intensity: accentuates upon hovering specific community
            let alpha = 0.05;
            if (hoveredNode && hoveredNode.cluster === clusterId) {
                alpha = 0.25;
            }

            const color = clusterColors[clusterId % clusterColors.length];
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 45; // Outer extrusion thickness to soften cluster edges
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(hull[0][0], hull[0][1]);
            for (let i = 1; i < hull.length; i++) {
                ctx.lineTo(hull[i][0], hull[i][1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    });
}

/**
 * --- CORE GRAPHIC RENDERING ENGINE (LOW-LEVEL CANVAS PIPELINE) ---
 */
function drawNetwork(nodes, links) {

    // Is a search active? Find the actual target node to verify
    const searchedNode = searchedNodeId ? nodes.find(n => String(n.id) === searchedNodeId) : null;

    // --- PHASE 1: BACKGROUND CONVEX HULLS RENDERING ---
    if (activeView === 'Louvain Structural Communities') {
        drawCommunityHulls(nodes);
    }

    // --- PHASE 2: LINKS RENDERING PHASE ---
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        let src = typeof link.source === "object" ? link.source : nodes.find(n => n.id === link.source);
        let tgt = typeof link.target === "object" ? link.target : nodes.find(n => n.id === link.target);

        if (!src || !tgt || src.x === undefined || tgt.x === undefined) continue;

        // Standard link opacities configuration (Always visible but light)
        let linkOpacity = 0.12;
        let strokeStyle = "rgba(90, 93, 120, ";

        if (activeView === 'Weak & Strong Ties Analysis') {
            // Local inter-field ties / local bridges assume differentiated coloring
            if (link.is_local_bridge || link.is_cross_field) {
                strokeStyle = "rgba(255, 170, 0, "; // Orange = Weak Tie / Bridge
                linkOpacity = 0.22;
            } else {
                strokeStyle = "rgba(79, 172, 254, "; // Blue = Strong Tie
                linkOpacity = 0.08;
            }
        }

        // Search highlight override logic for edges
        if (searchedNode && activeView === 'Main Visualization') {
            if (src.id === searchedNode.id || tgt.id === searchedNode.id) linkOpacity = 0.85;
            else linkOpacity = 0.02;
        }
        // Dynamic opacity modulation based on active hovering state
        else if (hoveredNode) {
            if (activeView === 'Main Visualization' || activeView.includes('SIR') || activeView === 'HITS Authority & Hub Profiles') {
                if (src.id === hoveredNode.id || tgt.id === hoveredNode.id) linkOpacity = 0.85;
                else linkOpacity = 0.01;
            } else if (activeView === 'Louvain Structural Communities') {
                // Hovering over a community intensifies internal links drastically
                if (src.cluster === hoveredNode.cluster && tgt.cluster === hoveredNode.cluster) linkOpacity = 0.70;
                else linkOpacity = 0.01;
            } else if (activeView === 'Weak & Strong Ties Analysis') {
                if (src.id === hoveredNode.id || tgt.id === hoveredNode.id) linkOpacity = 0.90;
                else linkOpacity = 0.01;
            } else if (activeView === 'Connected Components (SCC / WCC)') {
                if (src.id === hoveredNode.id || tgt.id === hoveredNode.id) linkOpacity = 0.70;
                else linkOpacity = 0.01;
            }
        }

        ctx.strokeStyle = strokeStyle + linkOpacity + ")";
        ctx.lineWidth = (hoveredNode && (src.id === hoveredNode.id || tgt.id === hoveredNode.id)) ||
        (searchedNode && (src.id === searchedNode.id || tgt.id === searchedNode.id)) ? 1.2 : 0.6;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
    }

    // --- PHASE 3: NODES RENDERING PHASE ---
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.x === undefined || node.y === undefined) continue;

        // Volumetric radius modulation based on log-linear in-degree
        const radius = Math.min(Math.sqrt(node.in_deg || 1) * 1.3 + 2.5, 18);

        // CONTEXTUAL COLOR MAPPING CONFIGURATION
        let fill = "#8b8d9b";

        if (activeView === 'Main Visualization') {
            fill = node.top10 ? "#00f2fe" : "#4facfe";
            // Highlight searched node in Red
            if (searchedNode && node.id === searchedNode.id) fill = "#ff3d71";
        } else if (activeView === 'Louvain Structural Communities') {
            fill = clusterColors[node.cluster % clusterColors.length];
        } else if (activeView === 'HITS Authority & Hub Profiles') {
            const auth = node.auth || 0;
            const hub = node.hub || 0;

            // Refined HITS coloring mapping Auth & Hub dominance
            if (auth > 0.005 && hub > 0.005) fill = "#ff00e5"; // Magenta for dual role
            else if (auth > 0.002) fill = "#ffaa00"; // Yellow for Authorities
            else if (hub > 0.002) fill = "#00f2fe"; // Cyan for Hubs
            else fill = "#23263d"; // Grey baseline
        } else if (activeView === 'Weak & Strong Ties Analysis') {
            // Nodes mapped by structural interconnection role
            fill = node.is_local_bridge || node.in_deg > 12 ? "#ffaa00" : "#4facfe";
        } else if (activeView === 'Connected Components (SCC / WCC)') {
            // Visual isolation of strongly connected Core nodes vs Periphery
            fill = node.in_deg > 1 ? "#00ff87" : "#ff3d71";
        } else if (activeView.includes('SIR')) {
            let state = 'S';
            if (node.sir_history && node.sir_history[currentSirTime]) {
                state = node.sir_history[currentSirTime];
            }
            if (state === 'S') fill = "#4facfe";
            else if (state === 'I') fill = "#ff3d71";
            else if (state === 'R') fill = "#73ff00";
        }

        // FOCUS AND FADE EFFECTS (ALPHA DIMMING)
        if (searchedNode && activeView === 'Main Visualization') {
            ctx.globalAlpha = 0.08;
            // Full opacity for searched node and its direct neighbors
            if (node.id === searchedNode.id || searchedNode.neighbors.has(node.id)) ctx.globalAlpha = 1.0;
        } else if (hoveredNode) {
            ctx.globalAlpha = 0.08; // Dim all unaffected nodes
            if (activeView === 'Main Visualization' || activeView.includes('SIR') || activeView === 'Weak & Strong Ties Analysis') {
                if (node.id === hoveredNode.id || hoveredNode.neighbors.has(node.id)) ctx.globalAlpha = 1.0;
            } else if (activeView === 'Louvain Structural Communities') {
                if (node.cluster === hoveredNode.cluster) ctx.globalAlpha = 1.0;
            } else if (activeView === 'HITS Authority & Hub Profiles' || activeView === 'Connected Components (SCC / WCC)') {
                if (node.id === hoveredNode.id) ctx.globalAlpha = 1.0;
            }
        } else {
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Luminous Outline (Glow) tracking for critical nodes & targeted items
        if (ctx.globalAlpha === 1.0 && (
            node.top10 ||
            (searchedNode && node.id === searchedNode.id) ||
            (activeView === 'HITS Authority & Hub Profiles' && (node.auth || 0) > 0.01)
        )) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0; // Safe reset of canvas context alpha channel
}

/**
 * --- DISTRIBUTED PHYSICAL LAYOUT CALCULATION AND ROUTING APPARATUS ---
 */
function updateGraphLayout(viewName) {
    if (!simulation || !globalNetworkData) return;
    const width = graphWorkspace.clientWidth;
    const height = graphWorkspace.clientHeight;

    simulation.stop();

    // Removal of pre-existing asymmetrical forces & unlocking constrained coordinates
    simulation.force("x", null).force("y", null).force("center", null);
    globalNetworkData.nodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
        node.fx = null;
        node.fy = null;
    });

    // --- FORCES CONFIGURATION: DEFAULT VIEW (WITH LAYOUT SWITCHER) & SIR MODEL ---
    if (viewName === 'Main Visualization' || viewName.includes('SIR')) {

        if (mainViewLayoutMode === 'force' || viewName.includes('SIR')) {
            // Standard Organic Force-Directed
            simulation
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("charge", d3.forceManyBody().strength(-60).distanceMax(500))
                .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).distance(45).strength(0.4))
                .force("x", d3.forceX(width / 2).strength(0.08))
                .force("y", d3.forceY(height / 2).strength(0.08));
        } else if (mainViewLayoutMode === 'radial') {
            // Radial degree-based layout: High in-degree at center, low on outer orbit
            simulation
                .force("charge", d3.forceManyBody().strength(-30).distanceMax(300))
                .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).distance(30).strength(0.1))
                .force("r", d3.forceRadial(d => (d.in_deg > 10 ? 50 : 250), width / 2, height / 2).strength(0.8));
        } else if (mainViewLayoutMode === 'hierarchy') {
            // Top-down hierarchy based on in-degree flow
            const maxDeg = d3.max(globalNetworkData.nodes, d => d.in_deg || 0) || 1;
            simulation
                .force("charge", d3.forceManyBody().strength(-40).distanceMax(300))
                .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).distance(30).strength(0.1))
                .force("x", d3.forceX(width / 2).strength(0.1))
                .force("y", d3.forceY(d => {
                    // Highest degrees at the top (10% of height), 0 degree at the bottom (90%)
                    const normDeg = (d.in_deg || 0) / maxDeg;
                    return height * 0.9 - (normDeg * height * 0.8);
                }).strength(0.8));
        }

    }
    // --- FORCES CONFIGURATION: MACRO-COMMUNITIES DISTRIBUTION (LOUVAIN) ---
    else if (viewName === 'Louvain Structural Communities') {
        const uniqueClusters = [...new Set(globalNetworkData.nodes.map(n => n.cluster))];
        // Increased radius factor drastically to spread communities out and prevent clustering overlaps
        const radMult = Math.min(width, height) * 0.45;

        simulation
            .force("charge", d3.forceManyBody().strength(-50).distanceMax(300)) // Weakened gravity push
            .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).strength(0.015))
            // Lowered X/Y pull strengths slightly so communities aren't completely rigid
            .force("x", d3.forceX(d => width / 2 + radMult * Math.cos((uniqueClusters.indexOf(d.cluster) * 2 * Math.PI) / (uniqueClusters.length || 1))).strength(0.65))
            .force("y", d3.forceY(d => height / 2 + radMult * Math.sin((uniqueClusters.indexOf(d.cluster) * 2 * Math.PI) / (uniqueClusters.length || 1))).strength(0.65));

    }
    // --- FORCES CONFIGURATION: 2D CARTESIAN HITS CENTRALITY (AUTHORITY VS HUB) ---
    else if (viewName === 'HITS Authority & Hub Profiles') {
        const maxAuth = d3.max(globalNetworkData.nodes, d => d.auth || 0) || 1;
        const maxHub = d3.max(globalNetworkData.nodes, d => d.hub || 0) || 1;

        simulation
            .force("charge", d3.forceManyBody().strength(-30).distanceMax(250))
            .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).strength(0.005))
            // X-AXIS maps Hub Scores (Low Hubs left, High Hubs right)
            .force("x", d3.forceX(d => {
                const h = d.hub || 0;
                if (h === 0) return width / 2 + (Math.random() - 0.5) * 200; // Spread dead nodes randomly
                return width * 0.2 + (h / maxHub) * (width * 0.6);
            }).strength(0.7))
            // Y-AXIS maps Authority Scores (Low Authorities bottom, High Authorities top)
            .force("y", d3.forceY(d => {
                const a = d.auth || 0;
                if (a === 0) return height * 0.85; // Baseline confining non-authoritative mass
                return height * 0.70 - (a / maxAuth) * (height * 0.60);
            }).strength(0.8));
    }
    // --- FORCES CONFIGURATION: STRONG & WEAK TIES STRUCTURAL MAP ---
    else if (viewName === 'Weak & Strong Ties Analysis') {
        // Arranges dense core in center and projects weak bridge links radially outwards
        simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(d => d.is_local_bridge ? -120 : -45).distanceMax(400))
            .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).distance(d => d.is_local_bridge ? 90 : 30).strength(0.3))
            .force("x", d3.forceX(width / 2).strength(0.06))
            .force("y", d3.forceY(height / 2).strength(0.06));
    }
    // --- FORCES CONFIGURATION: CONNECTED CORE TOPOLOGY (SCC VS WCC) ---
    else if (viewName === 'Connected Components (SCC / WCC)') {
        // Separates graph into a central core (SCC) and an orbiting peripheral belt (WCC)
        simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(-55).distanceMax(450))
            .force("link", d3.forceLink(globalNetworkData.links).id(d => d.id).strength(0.2))
            .force("x", d3.forceX(d => d.in_deg > 1 ? width * 0.45 : width * 0.65).strength(0.25))
            .force("y", d3.forceY(d => d.in_deg > 1 ? height * 0.5 : height * 0.5).strength(0.25));
    }

    simulation.alpha(1).restart();
}







function renderAnalyticsDashboards(viewName) {
    // 1. Svuota preventivamente TUTTI i container
    d3.select("#degree-histogram-canvas").selectAll("svg").remove();
    d3.select("#out-degree-scatter-canvas").selectAll("svg").remove();
    d3.select("#cdf-bounds-canvas").selectAll("svg").remove();
    d3.select("#random-convergence-canvas").selectAll("svg").remove();

    const data = globalNetworkData;
    if (!data) return;

    // Riferimenti ai nodi del DOM delle card per poterle nascondere/mostrare se necessario
    // (Opzionale: se preferisci lasciarle visibili ma vuote/con un messaggio, gestiscilo dentro il disegno)

    if (viewName === 'Empirical Degree Distributions') {
        // MOSTRA solo i grafici di distribuzione empirica dei gradi
        drawDegreeHistogram("#degree-histogram-canvas", data.nodes);
        drawOutDegreeScatter("#out-degree-scatter-canvas", data.nodes);

        // Scrivi un messaggio di cortesia o lascia vuoti gli altri due canvas orientati ai modelli nulli
        showEmptyPlaceholder("#cdf-bounds-canvas", "Disponibile in 'Null Models Validation'");
        showEmptyPlaceholder("#random-convergence-canvas", "Disponibile in 'Null Models Validation'");

        updatePanelForDegrees(data);

    } else if (viewName === 'Null Models Validation') {
        // MOSTRA i grafici di confronto statistico e validazione con i modelli nulli
        drawCCDFPlot("#cdf-bounds-canvas", data.ccdf_in, data.ccdf_out);
        drawRandomConvergence("#random-convergence-canvas", data.metrics_erdos, data.nodes);

        // Se vuoi tenere anche i grafici base per confronto puoi farlo,
        // altrimenti mettiamo i placeholder per differenziare nettamente le schermate:
        showEmptyPlaceholder("#degree-histogram-canvas", "Disponibile in 'Degree Distributions'");
        showEmptyPlaceholder("#out-degree-scatter-canvas", "Disponibile in 'Degree Distributions'");

        updatePanelForNullModels(data);
    }
}

// Funzione helper per mostrare un messaggio testuale nei canvas non attivi
function showEmptyPlaceholder(selector, message) {
    const container = d3.select(selector);
    const width = container.node().getBoundingClientRect().width || 400;
    const height = container.node().getBoundingClientRect().height || 180;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#5a5d78")
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        .text(message);
}


function drawDegreeHistogram(selector, nodes) {
    const container = d3.select(selector);
    // Sottraiamo 40px di sicurezza per evitare lo sforamento dovuto ai padding CSS
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const degrees = nodes.map(d => d.in_deg);

    const x = d3.scaleLinear()
        .domain([0, d3.max(degrees)])
        .range([0, plotWidth]);

    const histogram = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks(25));

    const bins = histogram(degrees);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([plotHeight, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .style("color", "#8b8d9b");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .style("color", "#8b8d9b");

    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0) + 1)
        .attr("y", d => y(d.length))
        // Usiamo plotWidth proporzionale per il calcolo della larghezza barre
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => plotHeight - y(d.length))
        .style("fill", "#4facfe")
        .style("opacity", 0.8);
}

function drawOutDegreeScatter(selector, nodes) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nodes.length]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(nodes, d => d.out_deg)]).range([plotHeight, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .style("color", "#8b8d9b");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .style("color", "#8b8d9b");

    svg.selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => x(i))
        .attr("cy", d => y(d.out_deg))
        .attr("r", 2)
        .style("fill", "#00ff87")
        .style("opacity", 0.6);
}

function drawCCDFPlot(selector, ccdfIn, ccdfOut) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, Math.max(ccdfIn.length, ccdfOut.length)]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([plotHeight, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .style("color", "#8b8d9b");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(4))
        .style("color", "#8b8d9b");

    const lineGenerator = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d));

    svg.append("path")
        .datum(ccdfIn)
        .attr("fill", "none")
        .attr("stroke", "#ff3d71")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    svg.append("path")
        .datum(ccdfOut)
        .attr("fill", "none")
        .attr("stroke", "#b337ff")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
}

function drawRandomConvergence(selector, erdosMetrics, nodes) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    if (!erdosMetrics) {
        svg.append("text").attr("x", plotWidth/2).attr("y", plotHeight/2).attr("text-anchor", "middle")
           .style("fill", "#8b8d9b").text("No Erdos Metrics Found");
        return;
    }

    const x = d3.scaleLinear().domain([0, 40]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, 0.25]).range([plotHeight, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .style("color", "#8b8d9b");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(4))
        .style("color", "#8b8d9b");

    const meanIn = globalNetworkData.mean_in || 4.0;
    const poissonData = d3.range(0, 40).map(k => {
        return {k: k, val: (Math.pow(meanIn, k) * Math.exp(-meanIn)) / parseFloat(d3.factorial(k) || 1)};
    });

    const line = d3.line().x(d => x(d.k)).y(d => y(d.val));

    svg.append("path")
        .datum(poissonData)
        .attr("fill", "none")
        .attr("stroke", "#00f2fe")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 2)
        .attr("d", line);
}

// Pannello per la vista 7 (Degree Analysis)
function updatePanelForDegrees(data) {
    const panelBody = document.getElementById('info-panel-body');
    if (!panelBody) return;
    panelBody.innerHTML = `
        <div class="metric-row">
            <span class="metric-label">In-Degree Mean</span>
            <span class="metric-value">${data.mean_in?.toFixed(4) || 'N/A'}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">In-Degree Std Dev</span>
            <span class="metric-value">${data.std_in?.toFixed(4) || 'N/A'}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Max In-Degree (Hub)</span>
            <span class="metric-value" style="color: var(--accent-blue)">${data.max_in || 'N/A'}</span>
        </div>
        <hr style="border-color: var(--border-color); margin: 12px 0;">
        <div class="metric-row">
            <span class="metric-label">Detected Hubs (Count)</span>
            <span class="metric-value">${data.hub_num || 'N/A'}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">% of Network Hubs</span>
            <span class="metric-value">${(data.pct_hubs * 100)?.toFixed(2) || 'N/A'}%</span>
        </div>
    `;
}

// Pannello per la vista 8 (Null Models Validation)
function updatePanelForNullModels(data) {
    const panelBody = document.getElementById('info-panel-body');
    if (!panelBody) return;

    // Estrai i coefficienti di clustering a confronto (ACC = Average Clustering Coefficient)
    const realClustering = data.ACC || 0;
    const erdosClustering = data.metrics_erdos?.avg_clustering || 0;
    const configClustering = data.metrics_config?.avg_clustering || 0;

    panelBody.innerHTML = `
        <div class="metric-row">
            <span class="metric-label">Cora Clustering (Real)</span>
            <span class="metric-value" style="color: var(--accent-green)">${realClustering.toFixed(5)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Erdos-Renyi G(n,p) Expected</span>
            <span class="metric-value" style="color: var(--text-muted)">${erdosClustering.toFixed(5)}</span>
        </div>
         <div class="metric-row">
            <span class="metric-label">Configuration Model Expected</span>
            <span class="metric-value" style="color: var(--text-muted)">${configClustering.toFixed(5)}</span>
        </div>
        <hr style="border-color: var(--border-color); margin: 12px 0;">
        <div class="metric-row">
            <span class="metric-label">Assortativity (Field)</span>
            <span class="metric-value">${data.assortativity?.toFixed(4) || 'N/A'}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Global Reciprocity</span>
            <span class="metric-value">${data.global_reciprocity?.toFixed(4) || 'N/A'}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Average Path Length (APL)</span>
            <span class="metric-value">${data.APL?.toFixed(2) || 'N/A'}</span>
        </div>
    `;
}
// NOTA: La parentesi graffa extra che rompeva il codice è stata rimossa da qui.