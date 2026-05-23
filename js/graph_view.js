/**
 * ============================================================================
 * GRAPH TOPOLOGY & CANVAS RENDERING ENGINE
 * ============================================================================
 */
import {appState, clusterColors, DOM, transformState} from './state.js';

/**
 * Initializing the graph canvas for visualizing the graph
 * @param nodes - Nodes of the graph
 * @param links - Links of the graph
 */
export function initializeCanvasD3Graph(nodes, links) {
    const targetTitle = document.getElementById('canvas-target-title');
    if (targetTitle) {
        targetTitle.remove();
    }

    const width = DOM.graphWorkspace.clientWidth;
    const height = DOM.graphWorkspace.clientHeight;

    // Creation of canvas and context
    DOM.canvas = document.createElement('canvas');
    DOM.canvas.width = width;
    DOM.canvas.height = height;
    DOM.canvas.style.position = "absolute";
    DOM.canvas.style.top = "0";
    DOM.canvas.style.left = "0";
    DOM.graphWorkspace.appendChild(DOM.canvas);
    DOM.ctx = DOM.canvas.getContext('2d');

    // Initializing the D3 force engine
    DOM.simulation = d3.forceSimulation(nodes)
        .randomSource(d3.randomLcg(0.42))
        .force("link", d3.forceLink(links).id(d => d.id).distance(45).strength(0.4))
        .force("charge", d3.forceManyBody().strength(-60).distanceMax(500))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => Math.sqrt(d.in_deg) + 4).iterations(2));

    // Handling Zoom & Pan behaviors
    const zoomBehavior = d3.zoom()
        .scaleExtent([0.02, 8])
        .filter(event => {
            if (event.type === 'mousedown') {
                if (event.button === 1) return true; // Tasto centrale fa sempre Pan
                if (event.button === 0) {
                    const cx = transformState.current.invertX(event.offsetX);
                    const cy = transformState.current.invertY(event.offsetY);
                    const nodeHit = DOM.simulation.find(cx, cy, 30);
                    return !nodeHit; // Fa pan solo se non clicchi su un nodo
                }
                return false;
            }
            return !event.ctrlKey && event.button !== 2;
        })
        .on("zoom", (event) => {
            transformState.current = event.transform;
            renderScene(nodes, links);
        });

    // Handler for nodes dragging behavior
    const dragBehavior = d3.drag()
        .container(DOM.canvas)
        .filter(event => event.button === 0 && appState.dragInteractionEnabled)
        .subject((event) => {
            const [mx, my] = d3.pointer(event, DOM.canvas);
            return DOM.simulation.find(transformState.current.invertX(mx), transformState.current.invertY(my), 30);
        })
        .on("start", (event) => {
            if (!event.active) DOM.simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
            const [mx, my] = d3.pointer(event.sourceEvent, DOM.canvas);
            event.subject.fx = transformState.current.invertX(mx);
            event.subject.fy = transformState.current.invertY(my);
        })
        .on("end", (event) => {
            if (!event.active) DOM.simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        });

    // Mouse tracking for mouse-over
    d3.select(DOM.canvas).on("mousemove", (event) => {
        if (!DOM.tooltip) return;

        if (!appState.hoverInteractionEnabled) return;

        const [mx, my] = d3.pointer(event);
        const cx = transformState.current.invertX(mx);
        const cy = transformState.current.invertY(my);
        const node = DOM.simulation.find(cx, cy, 25);

        if (node !== appState.hoveredNode) {
            appState.hoveredNode = node;
            renderScene(appState.globalNetworkData.nodes, appState.globalNetworkData.links);
            updateTooltipContent(node)
        }

        if (appState.hoveredNode) {
            DOM.tooltip.style.left = (event.pageX + 16) + 'px';
            DOM.tooltip.style.top = (event.pageY + 16) + 'px';
        }
    });

    d3.select(DOM.canvas).on("mouseout", () => {
        appState.hoveredNode = null;
        DOM.tooltip.style.opacity = '0';
        renderScene(nodes, links);
    });

    d3.select(DOM.canvas)
        .call(zoomBehavior)
        .call(dragBehavior)
        .call(zoomBehavior.transform, d3.zoomIdentity);

    DOM.simulation.on("tick", () => renderScene(nodes, links));
}

/**
 * Updates the tooltip content based on the current application state and node properties.
 *
 * @param {Object} node - The node object containing relevant properties to display in the tooltip.
 * The properties include:
 * - `id` (string): The unique identifier of the node.
 * - `field` (string): The field or category associated with the node.
 * - `in_deg` (number): The in-degree of the node.
 * - `out_deg` (number): The out-degree of the node.
 * - `cluster` (number|string): The community module or structural cluster of the node.
 * - `pagerank` (number): The pagerank score of the node.
 * - `auth` (number): The HITS authority score of the node.
 * - `hub` (number): The HITS hub score of the node.
 *
 * @return {void} This function does not return a value and directly updates the content of the tooltip.
 */
function updateTooltipContent(node) {
    if (node) {
        const view = appState.activeView;

        if (view === 'Main Visualization' || view.includes('SIR')) {
            DOM.tooltip.innerHTML = `ID: ${node.id}<br>Field: ${node.field}<br>In-Degree: ${node.in_deg}<br>Out-Degree: ${node.out_deg}`;
        } else if (view === 'Louvain Structural Communities') {
            DOM.tooltip.innerHTML = `Community Module: ${node.cluster}<br>ID: ${node.id}<br>PageRank: ${(node.pagerank || 0).toFixed(5)}`;
        } else if (view === 'HITS Authority & Hub Profiles') {
            DOM.tooltip.innerHTML = `ID: ${node.id}<br>Authority Score: ${(node.auth || 0).toFixed(5)}<br>Hub Score: ${(node.hub || 0).toFixed(5)}`;
        } else if (view === 'Weak & Strong Ties Analysis') {
            DOM.tooltip.innerHTML = `ID: ${node.id}<br>Cross-Field Node: ${node.in_deg > 5 ? 'Global Interconnector' : 'Local Clusterer'}`;
        } else if (view === 'Connected Components (SCC / WCC)') {
            const componentType = node.in_deg > 1 ? "SCC Core Engine" : "WCC Periphery Leaf";
            DOM.tooltip.innerHTML = `ID: ${node.id}<br>Component Classification: ${componentType}`;
        }
        DOM.tooltip.style.opacity = '1';
    } else {
        DOM.tooltip.style.opacity = '0';
    }
}

/**
 * Renders the network scene on the canvas using the provided nodes and links.
 *
 * @param {Array} nodes - An array of nodes representing elements in the network.
 * @param {Array} links - An array of links representing connections between nodes.
 * @return {void} This method does not return a value.
 */
export function renderScene(nodes, links) {
    DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    if (!DOM.ctx) return;
    DOM.ctx.save();
    DOM.ctx.translate(transformState.current.x, transformState.current.y);
    DOM.ctx.scale(transformState.current.k, transformState.current.k);
    drawNetwork(nodes, links);
    DOM.ctx.restore();
}

/**
 * Renders convex hulls around clusters of nodes in a 2D space based on their positions.
 *
 * @param {Array<Object>} nodes - An array of node objects where each node contains coordinates (x, y) and a cluster
 * identifier.
 * @return {void} This method does not return any value; it performs rendering on the canvas.
 */
function drawCommunityHulls(nodes) {
    const communities = d3.group(nodes, d => d.cluster);
    communities.forEach((members, clusterId) => {
        if (members.length < 3) return;
        const points = members.map(d => [d.x, d.y]);
        const hull = d3.polygonHull(points);

        // Drawing the cluster hull
        if (hull) {
            DOM.ctx.save();
            let alpha = 0.05;
            if (appState.hoveredNode && appState.hoveredNode.cluster === clusterId) alpha = 0.25;

            const color = clusterColors[clusterId % clusterColors.length];
            DOM.ctx.fillStyle = color;
            DOM.ctx.strokeStyle = color;
            DOM.ctx.globalAlpha = alpha;
            DOM.ctx.lineWidth = 45;
            DOM.ctx.lineJoin = "round";

            DOM.ctx.beginPath();
            DOM.ctx.moveTo(hull[0][0], hull[0][1]);
            for (let i = 1; i < hull.length; i++) DOM.ctx.lineTo(hull[i][0], hull[i][1]);
            DOM.ctx.closePath();
            DOM.ctx.fill();
            DOM.ctx.stroke();
            DOM.ctx.restore();
        }
    });
}

/**
 * Renders a network visualization consisting of nodes and links on a canvas element.
 *
 * @param {Array} nodes - The array of node objects, each containing properties such as `id`, `x`, `y`, and optional
 * attributes like `in_deg`, `cluster`, or `auth`.
 * @param {Array} links - The array of link objects, each defined with `source` and `target` references to node IDs or
 * objects, as well as optional attributes like `is_local_bridge`.
 * @return {void} This method does not return a value. It performs rendering directly on the canvas context.
 */
function drawNetwork(nodes, links) {
    const searchedNode = appState.searchedNodeId ? nodes
        .find(n => String(n.id) === appState.searchedNodeId) : null;

    if (appState.activeView === 'Louvain Structural Communities') {
        drawCommunityHulls(nodes);
    }

    // Drawing the graph Links
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        let src = typeof link.source === "object" ? link.source : nodes.find(n => n.id === link.source);
        let tgt = typeof link.target === "object" ? link.target : nodes.find(n => n.id === link.target);

        if (!src || !tgt || src.x === undefined || tgt.x === undefined) continue;

        let linkOpacity = 0.12;
        let strokeStyle = "rgba(90, 93, 120, ";

        if (appState.activeView === 'Weak & Strong Ties Analysis') {
            if (link.is_local_bridge || link.is_cross_field) {
                strokeStyle = "rgba(255, 170, 0, ";
                linkOpacity = 0.22;
            } else {
                strokeStyle = "rgba(79, 172, 254, ";
                linkOpacity = 0.08;
            }
        }

        if (searchedNode && appState.activeView === 'Main Visualization') {
            linkOpacity = (src.id === searchedNode.id || tgt.id === searchedNode.id) ? 0.85 : 0.02;
        } else if (appState.hoveredNode) {
            if (appState.activeView === 'Main Visualization' || appState.activeView.includes('SIR') ||
                appState.activeView === 'HITS Authority & Hub Profiles') {
                linkOpacity = (src.id === appState.hoveredNode.id || tgt.id === appState.hoveredNode.id) ? 0.85 : 0.01;
            } else if (appState.activeView === 'Louvain Structural Communities') {
                linkOpacity = (src.cluster === appState.hoveredNode.cluster &&
                    tgt.cluster === appState.hoveredNode.cluster) ? 0.70 : 0.01;
            } else if (appState.activeView === 'Weak & Strong Ties Analysis') {
                linkOpacity = (src.id === appState.hoveredNode.id || tgt.id === appState.hoveredNode.id) ? 0.90 : 0.01;
            } else if (appState.activeView === 'Connected Components (SCC / WCC)') {
                linkOpacity = (src.id === appState.hoveredNode.id || tgt.id === appState.hoveredNode.id) ? 0.70 : 0.01;
            }
        }

        DOM.ctx.strokeStyle = strokeStyle + linkOpacity + ")";
        DOM.ctx.lineWidth = (appState.hoveredNode && (src.id === appState.hoveredNode.id ||
            tgt.id === appState.hoveredNode.id)) || (searchedNode && (src.id === searchedNode.id ||
            tgt.id === searchedNode.id)) ? 1.2 : 0.6;

        DOM.ctx.beginPath();
        DOM.ctx.moveTo(src.x, src.y);
        DOM.ctx.lineTo(tgt.x, tgt.y);
        DOM.ctx.stroke();
    }

    // Drawing nodes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.x === undefined || node.y === undefined) continue;

        const radius = Math.min(Math.sqrt(node.in_deg || 1) * 1.3 + 2.5, 18);
        let fill = "#8b8d9b";

        if (appState.activeView === 'Main Visualization') {
            fill = node.top10 ? "#00f2fe" : "#4facfe";
            if (searchedNode && node.id === searchedNode.id) fill = "#ff3d71";
        } else if (appState.activeView === 'Louvain Structural Communities') {
            fill = clusterColors[node.cluster % clusterColors.length];
        } else if (appState.activeView === 'HITS Authority & Hub Profiles') {
            const auth = node.auth || 0;
            const hub = node.hub || 0;
            if (auth > 0.005 && hub > 0.005) fill = "#ff00e5";
            else if (auth > 0.002) fill = "#ffaa00";
            else if (hub > 0.002) fill = "#00f2fe";
            else fill = "#23263d";
        } else if (appState.activeView === 'Weak & Strong Ties Analysis') {
            fill = node.is_local_bridge || node.in_deg > 12 ? "#ffaa00" : "#4facfe";
        } else if (appState.activeView === 'Connected Components (SCC / WCC)') {
            fill = node.in_deg > 1 ? "#00ff87" : "#ff3d71";
        } else if (appState.activeView.includes('SIR')) {
            let state = 'S';
            if (node.sir_history && node.sir_history[appState.currentSirTime]) state = node
                .sir_history[appState.currentSirTime];
            fill = state === 'S' ? "#4facfe" : state === 'I' ? "#ff3d71" : "#73ff00";
        }

        // Focus & Fade Alpha Effects
        if (searchedNode && appState.activeView === 'Main Visualization') {
            DOM.ctx.globalAlpha = (node.id === searchedNode.id || searchedNode.neighbors.has(node.id)) ? 1.0 : 0.08;
        } else if (appState.hoveredNode) {
            DOM.ctx.globalAlpha = 0.08;
            if (appState.activeView === 'Main Visualization' || appState.activeView.includes('SIR') ||
                appState.activeView === 'Weak & Strong Ties Analysis') {
                if (node.id === appState.hoveredNode.id || appState.hoveredNode.neighbors.has(node.id))
                    DOM.ctx.globalAlpha = 1.0;
            } else if (appState.activeView === 'Louvain Structural Communities') {
                if (node.cluster === appState.hoveredNode.cluster) DOM.ctx.globalAlpha = 1.0;
            } else if (appState.activeView === 'HITS Authority & Hub Profiles' ||
                appState.activeView === 'Connected Components (SCC / WCC)') {
                if (node.id === appState.hoveredNode.id) DOM.ctx.globalAlpha = 1.0;
            }
        } else {
            DOM.ctx.globalAlpha = 1.0;
        }

        DOM.ctx.fillStyle = fill;
        DOM.ctx.beginPath();
        DOM.ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        DOM.ctx.fill();

        if (DOM.ctx.globalAlpha === 1.0 && (node.top10 || (searchedNode && node.id === searchedNode.id) ||
            (appState.activeView === 'HITS Authority & Hub Profiles' && (node.auth || 0) > 0.01))) {
            DOM.ctx.strokeStyle = "#ffffff";
            DOM.ctx.lineWidth = 1.8;
            DOM.ctx.stroke();
        }
    }
    DOM.ctx.globalAlpha = 1.0;
}

/**
 * Updates the layout of a graph visualization based on the specified view name and related configuration settings.
 * This method modifies the forces acting on the graph simulation to adjust the positioning of nodes and links according
 * to the selected layout or analysis type.
 *
 * @param {string} viewName - The name of the view determining the type of layout or analysis to apply to the graph.
 *                            Possible values include:
 *                            - 'Main Visualization'
 *                            - 'Louvain Structural Communities'
 *                            - 'HITS Authority & Hub Profiles'
 *                            - 'Weak & Strong Ties Analysis'
 *                            - 'Connected Components (SCC / WCC)', etc.
 *
 * @return {void} This method does not return any value as it directly updates the graph simulation and layout.
 */
export function updateGraphLayout(viewName) {
    if (!DOM.simulation || !appState.globalNetworkData) return;
    const width = DOM.graphWorkspace.clientWidth;
    const height = DOM.graphWorkspace.clientHeight;

    const targetTitle = document.getElementById('canvas-target-title');
    if (targetTitle) {
        targetTitle.remove();
    }

    DOM.simulation.stop();
    DOM.simulation.force("x", null).force("y", null).force("center", null).force("r", null);

    appState.globalNetworkData.nodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
        node.fx = null;
        node.fy = null;
    });

    if (viewName === 'Main Visualization' || viewName.includes('SIR')) {
        if (appState.mainViewLayoutMode === 'force' || viewName.includes('SIR')) {
            DOM.simulation
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("charge", d3.forceManyBody().strength(-60).distanceMax(500))
                .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id).distance(45).strength(0.4))
                .force("x", d3.forceX(width / 2).strength(0.08))
                .force("y", d3.forceY(height / 2).strength(0.08));
        } else if (appState.mainViewLayoutMode === 'radial') {
            DOM.simulation
                .force("charge", d3.forceManyBody().strength(-30).distanceMax(300))
                .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id).distance(30).strength(0.1))
                .force("r", d3.forceRadial(d => (d.in_deg > 10 ? 50 : 250), width / 2, height / 2).strength(0.8));
        } else if (appState.mainViewLayoutMode === 'hierarchy') {
            const maxDeg = d3.max(appState.globalNetworkData.nodes, d => d.in_deg || 0) || 1;
            DOM.simulation
                .force("charge", d3.forceManyBody().strength(-40).distanceMax(300))
                .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id).distance(30).strength(0.1))
                .force("x", d3.forceX(width / 2).strength(0.1))
                .force("y", d3.forceY(d => {
                    const normDeg = (d.in_deg || 0) / maxDeg;
                    return height * 0.9 - (normDeg * height * 0.8);
                }).strength(0.8));
        }
    } else if (viewName === 'Louvain Structural Communities') {
        const uniqueClusters = [...new Set(appState.globalNetworkData.nodes.map(n => n.cluster))];
        const numClusters = uniqueClusters.length || 1;
        const radMult = Math.min(width, height) * 0.38;

        DOM.simulation
            .force("charge", d3.forceManyBody().strength(-35).distanceMax(200))
            .force("link", d3.forceLink(appState.globalNetworkData.links)
                .id(d => d.id)
                .strength(link => {
                    let srcCluster = typeof link.source === 'object' ? link.source.cluster : appState.globalNetworkData.nodes.find(n => n.id === link.source)?.cluster;
                    let tgtCluster = typeof link.target === 'object' ? link.target.cluster : appState.globalNetworkData.nodes.find(n => n.id === link.target)?.cluster;
                    return (srcCluster !== undefined && srcCluster === tgtCluster) ? 0.25 : 0.001;
                })
                .distance(25)
            )
            .force("x", d3.forceX(d => {
                const clusterIndex = uniqueClusters.indexOf(d.cluster);
                const angle = (clusterIndex * 2 * Math.PI) / numClusters;
                return width / 2 + radMult * Math.cos(angle);
            }).strength(0.85))
            .force("y", d3.forceY(d => {
                const clusterIndex = uniqueClusters.indexOf(d.cluster);
                const angle = (clusterIndex * 2 * Math.PI) / numClusters;
                return height / 2 + radMult * Math.sin(angle);
            }).strength(0.85))
            .force("collide", d3.forceCollide().radius(d => Math.min(Math.sqrt(d.in_deg || 1) * 1.3 + 2.5, 18) + 3).iterations(3));
    } else if (viewName === 'HITS Authority & Hub Profiles') {
        const maxAuth = d3.max(appState.globalNetworkData.nodes, d => d.auth || 0) || 1;
        const maxHub = d3.max(appState.globalNetworkData.nodes, d => d.hub || 0) || 1;
        DOM.simulation
            .force("charge", d3.forceManyBody().strength(-30).distanceMax(250))
            .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id).strength(0.005))
            .force("x", d3.forceX(d => d.hub === 0 ? width / 2 + (Math.random() - 0.5) * 200 : width * 0.2 +
                (d.hub / maxHub) * (width * 0.6)).strength(0.7))
            .force("y", d3.forceY(d => d.auth === 0 ? height * 0.85 : height * 0.70 - (d.auth / maxAuth) *
                (height * 0.60)).strength(0.8));
    } else if (viewName === 'Weak & Strong Ties Analysis') {
        DOM.simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(d => d.is_local_bridge ? -120 : -45).distanceMax(400))
            .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id)
                .distance(d => d.is_local_bridge ? 90 : 30).strength(0.3))
            .force("x", d3.forceX(width / 2).strength(0.06))
            .force("y", d3.forceY(height / 2).strength(0.06));
    } else if (viewName === 'Connected Components (SCC / WCC)') {
        DOM.simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(-55).distanceMax(450))
            .force("link", d3.forceLink(appState.globalNetworkData.links).id(d => d.id).strength(0.2))
            .force("x", d3.forceX(d => d.in_deg > 1 ? width * 0.45 : width * 0.65).strength(0.25))
            .force("y", d3.forceY(() => height * 0.5).strength(0.25));
    }
    DOM.simulation.alpha(1).restart();
}

