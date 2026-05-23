/**
 * ============================================================================
 * STATISTICAL DASHBOARDS & D3 CHARTS ENGINE
 * ============================================================================
 */
import {appState} from './state.js';

/**
 * Renders analytics dashboards based on the specified view name. Updates the display of
 * different dashboard sections and renders corresponding visualizations using network data.
 *
 * @param {string} viewName - The name of the view to be rendered. Possible values are
 *                            'Empirical Degree Distributions' or 'Null Models Validation'.
 * @return {void} Does not return a value. Modifies the DOM to update and render analytics dashboards.
 */
export function renderAnalyticsDashboards(viewName) {
    d3.select("#degree-histogram-canvas").selectAll("svg").remove();
    d3.select("#out-degree-scatter-canvas").selectAll("svg").remove();
    d3.select("#cdf-bounds-canvas").selectAll("svg").remove();
    d3.select("#random-convergence-canvas").selectAll("svg").remove();

    const data = appState.globalNetworkData;
    if (!data) return;

    const cardHist =
        document.getElementById("degree-histogram-canvas")?.closest('.analytics-card');
    const cardScatter =
        document.getElementById("out-degree-scatter-canvas")?.closest('.analytics-card');
    const cardCdf =
        document.getElementById("cdf-bounds-canvas")?.closest('.analytics-card');
    const cardRand =
        document.getElementById("random-convergence-canvas")?.closest('.analytics-card');

    if (viewName === 'Empirical Degree Distributions') {
        if (cardHist) cardHist.style.display = "flex";
        if (cardScatter) cardScatter.style.display = "flex";
        if (cardCdf) cardCdf.style.display = "none";
        if (cardRand) cardRand.style.display = "none";

        setTimeout(() => {
            drawDegreeHistogram("#degree-histogram-canvas", data.nodes);
            drawOutDegreeScatter("#out-degree-scatter-canvas", data.nodes);
        }, 25);
        updatePanelForDegrees(data);

    } else if (viewName === 'Null Models Validation') {
        if (cardHist) cardHist.style.display = "none";
        if (cardScatter) cardScatter.style.display = "none";
        if (cardCdf) cardCdf.style.display = "flex";
        if (cardRand) cardRand.style.display = "flex";

        setTimeout(() => {
            drawCCDFPlot("#cdf-bounds-canvas", data.ccdf_in, data.ccdf_out);
            drawRandomConvergence("#random-convergence-canvas", data.metrics_erdos);
        }, 25);
        updatePanelForNullModels(data);
    }
}

/**
 * Draws a degree histogram for a network graph by visualizing the distribution of node in-degrees.
 * Creates an SVG element within the container specified by the selector and plots the histogram.
 *
 * @param {string} selector - The CSS selector string used to select the container element for appending the SVG.
 * @param {Array<Object>} nodes - An array of objects representing the nodes of a graph. Each node object must have an
 * `in_deg` property, which represents the in-degree of the node.
 * @return {void} No return value. The function directly renders the histogram within the container specified.
 */
function drawDegreeHistogram(selector, nodes) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const degrees = nodes.map(d => d.in_deg);
    const x = d3.scaleLinear().domain([0, d3.max(degrees)]).range([0, plotWidth]);
    const bins = d3.bin().domain(x.domain()).thresholds(x.ticks(25))(degrees);
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([plotHeight, 0]);

    svg.append("g").attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5)).style("color", "#8b8d9b");
    svg.append("g").call(d3.axisLeft(y).ticks(5)).style("color", "#8b8d9b");

    svg.selectAll("rect").data(bins).enter().append("rect")
        .attr("x", d => x(d.x0) + 1).attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1)).attr("height", d => plotHeight - y(d.length))
        .style("fill", "#4facfe").style("opacity", 0.8);
}

function drawOutDegreeScatter(selector, nodes) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nodes.length]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(nodes, d => d.out_deg)]).range([plotHeight, 0]);

    svg.append("g").attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5)).style("color", "#8b8d9b");
    svg.append("g").call(d3.axisLeft(y).ticks(5)).style("color", "#8b8d9b");

    svg.selectAll("circle").data(nodes).enter().append("circle")
        .attr("cx", (d, i) => x(i)).attr("cy", d => y(d.out_deg)).attr("r", 2)
        .style("fill", "#00ff87").style("opacity", 0.6);
}

/**
 * Draws a Complementary Cumulative Distribution Function (CCDF) plot within a specified container.
 * The plot visualizes two sets of CCDF data using D3.js.
 *
 * @param {string} selector - The CSS selector of the container where the plot will be rendered.
 * @param {number[]} ccdfIn - An array of numeric values representing the first CCDF data to be plotted.
 * @param {number[]} ccdfOut - An array of numeric values representing the second CCDF data to be plotted.
 * @return {void} Does not return a value, directly renders the plot in the specified container.
 */
function drawCCDFPlot(selector, ccdfIn, ccdfOut) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, Math.max(ccdfIn.length, ccdfOut.length)]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([plotHeight, 0]);

    svg.append("g").attr("transform", `translate(0,${plotHeight})`).call(d3.axisBottom(x).ticks(5)).style("color", "#8b8d9b");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#8b8d9b");

    const lineGenerator = d3.line().x((d, i) => x(i)).y(d => y(d));
    svg.append("path").datum(ccdfIn).attr("fill", "none")
        .attr("stroke", "#ff3d71").attr("stroke-width", 2).attr("d", lineGenerator);
    svg.append("path").datum(ccdfOut).attr("fill", "none")
        .attr("stroke", "#b337ff").attr("stroke-width", 2).attr("d", lineGenerator);
}

/**
 * Draws a convergence plot based on random data and specified metrics.
 *
 * @param {string} selector - A CSS selector used to identify the container element where the plot will be rendered.
 * @param {Object} erdosMetrics - An object containing the relevant metrics for generating the convergence plot.
 * If not provided, a placeholder message will be displayed.
 * @return {void} Does not return a value; generates and appends an SVG element to the specified container.
 */
function drawRandomConvergence(selector, erdosMetrics) {
    const container = d3.select(selector);
    const width = (container.node().getBoundingClientRect().width || 400) - 40;
    const height = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 15, bottom: 35, left: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    if (!erdosMetrics) {
        svg.append("text").attr("x", plotWidth / 2).attr("y", plotHeight / 2)
            .attr("text-anchor", "middle").style("fill", "#8b8d9b").text("No Erdos Metrics Found");
        return;
    }

    const x = d3.scaleLinear().domain([0, 40]).range([0, plotWidth]);
    const y = d3.scaleLinear().domain([0, 0.25]).range([plotHeight, 0]);

    svg.append("g").attr("transform", `translate(0,${plotHeight})`)
        .call(d3.axisBottom(x).ticks(5)).style("color", "#8b8d9b");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#8b8d9b");

    const meanIn = appState.globalNetworkData.mean_in || 4.0;
    const poissonData = d3.range(0, 40).map(k => ({
        k: k, val: (Math.pow(meanIn, k) * Math.exp(-meanIn)) / parseFloat(d3.factorial(k) || 1)
    }));

    svg.append("path")
        .datum(poissonData)
        .attr("fill", "none")
        .attr("stroke", "#00f2fe")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.k)).y(d => y(d.val)));
}

/**
 * Updates the content of the information panel with statistical degree data.
 *
 * @param {Object} data - An object containing statistical metrics for degree analysis.
 * @param {number} [data.mean_in] - The mean of in-degrees. Displays 'N/A' if not provided.
 * @param {number} [data.std_in] - The standard deviation of in-degrees. Displays 'N/A' if not provided.
 * @param {number} [data.max_in] - The maximum in-degree value. Displays 'N/A' if not provided.
 * @param {number} [data.hub_num] - The number of hubs in the network. Displays 'N/A' if not provided.
 * @param {number} [data.pct_hubs] - The percentage of hubs in the network. Displays 'N/A' if not provided.
 * @return {void} This method does not return a value.
 */
function updatePanelForDegrees(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">In-Degree Mean</span><span class="metric-value">${data.mean_in?.toFixed(4) || 'N/A'}</span></div>
        <div class="metric-row"><span class="metric-label">In-Degree Std Dev</span><span class="metric-value">${data.std_in?.toFixed(4) || 'N/A'}</span></div>
        <div class="metric-row"><span class="metric-label">Max In-Degree</span><span class="metric-value" style="color:var(--accent-blue)">${data.max_in || 'N/A'}</span></div>
        <hr style="border-color:var(--border-color);margin:12px 0;">
        <div class="metric-row"><span class="metric-label">Hubs Count</span><span class="metric-value">${data.hub_num || 'N/A'}</span></div>
        <div class="metric-row"><span class="metric-label">% Network Hubs</span><span class="metric-value">${(data.pct_hubs * 100)?.toFixed(2) || 'N/A'}%</span></div>`;
}

/**
 * Updates the content of the 'info-panel-body' element with various metrics derived from the provided data.
 *
 * @param {Object} data - The data object containing metrics and values to display in the panel.
 * @param {number} [data.ACC=0] - The ACC value used for "Cora Clustering", defaulting to 0 if not provided.
 * @param {Object} [data.metrics_erdos] - The object containing metrics for the Erdős-Rényi (G(n, p)) model.
 * @param {number} [data.metrics_erdos.avg_clustering=0] - The average clustering coefficient for the Erdős-Rényi model, defaulting to 0 if not provided.
 * @param {Object} [data.metrics_config] - The object containing metrics for the Configuration model.
 * @param {number} [data.metrics_config.avg_clustering=0] - The average clustering coefficient for the Configuration model, defaulting to 0 if not provided.
 * @param {number} [data.assortativity] - The assortativity coefficient, or `N/A` if not provided.
 * @param {number} [data.global_reciprocity] - The global reciprocity, or `N/A` if not provided.
 * @return {void}
 */
function updatePanelForNullModels(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">Cora Clustering</span><span class="metric-value" style="color:var(--accent-green)">${(data.ACC || 0).toFixed(5)}</span></div>
        <div class="metric-row"><span class="metric-label">Erdos G(n,p) Expected</span><span class="metric-value">${(data.metrics_erdos?.avg_clustering || 0).toFixed(5)}</span></div>
        <div class="metric-row"><span class="metric-label">Config Model Expected</span><span class="metric-value">${(data.metrics_config?.avg_clustering || 0).toFixed(5)}</span></div>
        <hr style="border-color:var(--border-color);margin:12px 0;">
        <div class="metric-row"><span class="metric-label">Assortativity</span><span class="metric-value">${data.assortativity?.toFixed(4) || 'N/A'}</span></div>
        <div class="metric-row"><span class="metric-label">Reciprocity</span><span class="metric-value">${data.global_reciprocity?.toFixed(4) || 'N/A'}</span></div>`;
}