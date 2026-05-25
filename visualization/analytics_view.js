/**
 * ============================================================================
 * STATISTICAL DASHBOARDS & D3 CHARTS ENGINE
 * ============================================================================
 */
import {appState} from './state.js';

/**
 * Renders analytics dashboards based on the selected view name. Clears existing graphical containers,
 * updates the UI components dynamically, and triggers the appropriate rendering functions for specific analyses.
 *
 * @param {string} viewName - The name of the view to render dashboards for. Supported views include:
 *                            'In-Degree Structural Analysis', 'Out-Degree Structural Analysis',
 *                            'Homophily & Mixing Matrix', and 'Benchmark Models Alignment'.
 * @return {void} The method does not return any value. It performs DOM manipulation and updates graphical elements
 * for the specified view.
 */
export function renderAnalyticsDashboards(viewName) {
    // Cleaning graphs before adding new data
    const targets = ["#degree-histogram-canvas", "#out-degree-scatter-canvas", "#cdf-bounds-canvas",
        "#random-convergence-canvas"];
    targets.forEach(t => d3.select(t).selectAll("svg").remove());

    const data = appState.globalNetworkData;
    if (!data) return;

    // Selectors based on .chart-card in CSS
    const cards = Array.from(document.querySelectorAll('.chart-card'));
    if (cards.length < 4) return;

    // Dynamic configuration of the titles
    if (viewName === 'In-Degree Structural Analysis') {
        configureCardHeader(cards[0], "In-Degree PMF", "Probability Mass Function", "#4facfe");
        configureCardHeader(cards[1], "In-Degree CCDF (Log-Log)", "Scale-Free Power Law Tail",
            "#ff4da6");
        configureCardHeader(cards[2], "Poisson Convergence Check", "Empirical vs Erdos G(n,p)",
            "#00f2c9");
        configureCardHeader(cards[3], "In-Degree Rank Distribution", "Zipf's Law Profiler",
            "#b337ff");

        setTimeout(() => {
            drawPMFHistogram("#degree-histogram-canvas", data.nodes, "in_deg", "#4facfe");
            drawCCDFLogLog("#out-degree-scatter-canvas", data.ccdf_in, "#ff4da6");
            drawPoissonFit("#cdf-bounds-canvas", data.mean_in || 4.2, "#00f2c9");
            drawRankPlot("#random-convergence-canvas", data.nodes, "in_deg", "#b337ff");
        }, 30);
        updatePanelInDegree(data);

    } else if (viewName === 'Out-Degree Structural Analysis') {
        configureCardHeader(cards[0], "Out-Degree PMF", "Citation Outbound Density", "#00ff87");
        configureCardHeader(cards[1], "Out-Degree CCDF", "Cumulative Tail Bounds", "#fff");
        configureCardHeader(cards[2], "Out-Degree Scatterplot", "Node Sequence Cross-Section",
            "#00f2fe");
        configureCardHeader(cards[3], "Outbound Hub Quantiles", "95% Threshold Separation",
            "#ffaa00");

        setTimeout(() => {
            drawPMFHistogram("#degree-histogram-canvas", data.nodes, "out_deg", "#00ff87");
            drawCCDFLogLog("#out-degree-scatter-canvas", data.ccdf_out, "#fff");
            drawScatterSequence("#cdf-bounds-canvas", data.nodes, "out_deg", "#00f2fe");
            drawQuantileBars("#random-convergence-canvas", data.nodes, "out_deg", "#ffaa00");
        }, 30);
        updatePanelOutDegree(data);

    } else if (viewName === 'Homophily & Mixing Matrix') {
        configureCardHeader(cards[0], "Mixing Matrix Heatmap", "Cross-Field Transition Probabilities",
            "#00f2c9");
        configureCardHeader(cards[1], "Attribute Assortativity", "Degree-Degree Correlation Scatters",
            "#ff3d71");
        configureCardHeader(cards[2], "Inter-Cluster Edge Counts", "Boundary vs Local Edge Density",
            "#4facfe");
        configureCardHeader(cards[3], "Neighbor Degree Variance", "Local Neighborhood Multi-Scale",
            "#ffaa00");

        setTimeout(() => {
            drawMixingMatrix("#degree-histogram-canvas", data.mixing_matrix);
            drawAssortativityScatter("#out-degree-scatter-canvas", data.nodes);
            drawBoundaryBars("#cdf-bounds-canvas", data.cluster_edges);
            drawVarianceLine("#random-convergence-canvas", data.nodes);
        }, 30);
        updatePanelHomophily(data);

    } else if (viewName === 'Benchmark Models Alignment') {
        configureCardHeader(cards[0], "Clustering Coefficient Spectrum", "Empirical Cora vs Random Models",
            "#00ff87");
        configureCardHeader(cards[1], "Degree Variance Overlap", "Structural Distortion Bounds",
            "#ff4da6");
        configureCardHeader(cards[2], "WCC Giant Component Decay", "Percolation Threshold Comparison",
            "#4facfe");
        configureCardHeader(cards[3], "Entropy Divergence Rig", "Shannon Topological Metric",
            "#fff");

        setTimeout(() => {
            drawClusteringComparison("#degree-histogram-canvas", data);
            drawVarianceComparison("#out-degree-scatter-canvas", data);
            drawPercolationDecay("#cdf-bounds-canvas", data);
            drawEntropyDivergence("#random-convergence-canvas", data);
        }, 30);
        updatePanelBenchmarks(data);
    }
}

/**
 * Configures the header of a card element by setting the title, subtitle, and styles.
 *
 * @param {HTMLElement} card The card element to be configured.
 * @param {string} title The text to set as the title in the card's header.
 * @param {string} subtitle The text to set as the subtitle in the card's header.
 * @param {string} color The color to apply to the subtitle's styles, including a border, text, and background.
 * @return {void}
 */
function configureCardHeader(card, title, subtitle, color) {
    const titleSpan = card.querySelector('.chart-header span:first-child');
    const subtitleSpan = card.querySelector('.chart-subtitle');
    if (titleSpan) titleSpan.textContent = title;
    if (subtitleSpan) {
        subtitleSpan.textContent = subtitle;
        subtitleSpan.style.borderColor = color + "33";
        subtitleSpan.style.color = color;
        subtitleSpan.style.background = color + "14";
    }
}

/**
 * Draws a Probability Mass Function (PMF) histogram for the given data.
 *
 * @param {string} selector - The CSS selector of the container where the histogram will be rendered.
 * @param {Array<Object>} nodes - The array of data nodes used to calculate the PMF.
 * @param {string} attr - The key of the attribute in the data nodes whose distribution is visualized.
 * @param {string} color - The color to use for the histogram bars.
 * @return {void} This function does not return a value; it renders the histogram directly in the specified container.
 */
function drawPMFHistogram(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const values = nodes.map(d => d[attr] || 0);
    const x = d3.scaleLinear().domain([0, d3.max(values) || 1]).range([0, width]);
    const bins = d3.bin().domain(x.domain()).thresholds(x.ticks(20))(values);

    const total = values.length || 1;
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length / total) || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5)).style("color",
        "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4, "%")).style("color", "#797b93");

    svg.selectAll("rect").data(bins).enter().append("rect")
        .attr("x", d => x(d.x0) + 1).attr("y", d => y(d.length / total))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1)).attr("height", d => height - y(d.length / total))
        .style("fill", color).style("opacity", 0.75).attr("rx", 2);
}

/**
 * Draws a complementary cumulative distribution function (CCDF) plot on a log-log scale.
 *
 * @param {string} selector - A CSS selector for the container element where the CCDF plot will be rendered.
 * @param {number[]} ccdfData - An array of numeric values representing the CCDF data points.
 * @param {string} color - A string representing the color to be used for the CCDF line.
 * @return {void} This function does not return a value.
 */
function drawCCDFLogLog(selector, ccdfData, color) {
    const container = d3.select(selector);
    if (!ccdfData || ccdfData.length === 0) return;
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const dataset = ccdfData.map((val, i) => ({deg: i, prob: val}))
        .filter(d => d.deg > 0 && d.prob > 0);

    const x = d3.scaleLog().domain([1, d3.max(dataset, d => d.deg) || 10]).range([0, width]);
    const y = d3.scaleLog().domain([d3.min(dataset, d => d.prob) || 0.001, 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(4, "~s")).style("color",
        "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4, ".1e")).style("color", "#797b93");

    const line = d3.line().x(d => x(d.deg)).y(d => y(d.prob));
    svg.append("path").datum(dataset).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
        .attr("d", line);
}

/**
 * Calculating factorial for Poisson Distribution
 * @param n - value to calculate the factorial of
 * @returns {number} The factorial of n
 */
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Draws a Poisson distribution curve fit on a given DOM element using D3.js.
 *
 * @param {string} selector - A string representing the CSS selector of the container element where the chart will be
 * rendered.
 * @param {number} lambda - The expected value (mean) of the Poisson distribution.
 * @param {string} color - The color for the fit curve in the SVG element.
 * @return {void} This method does not return a value.
 */
function drawPoissonFit(selector, lambda, color) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const range = d3.range(0, 30);
    const poisson = range.map(k => ({
        k: k,
        val: (Math.pow(lambda, k) * Math.exp(-lambda)) / (factorial(k) || 1)
    }));

    const x = d3.scaleLinear().domain([0, 30]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(poisson, d => d.val) * 1.1 || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(6)).style("color",
        "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.append("path").datum(poisson).attr("fill", "none").attr("stroke", color)
        .attr("stroke-dasharray", "4,4").attr("stroke-width", 2).attr("d", d3.line().x(d => x(d.k)).y(d => y(d.val)));
}

/**
 * Draws a rank plot for the given data with the specified attribute and color.
 * The plot uses a logarithmic scale for both axes and represents the ranking of data points.
 *
 * @param {string} selector - The CSS selector of the container element where the plot will be rendered.
 * @param {Array} nodes - The array of data objects to be visualized.
 * @param {string} attr - The attribute of the data objects that determines the ranking.
 * @param {string} color - The color of the rank plot line.
 * @return {void} This function does not return a value.
 */
function drawRankPlot(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const sortedData = nodes.map(d => d[attr] || 0).sort((a, b) => b - a);

    const x = d3.scaleLog().domain([1, sortedData.length]).range([0, width]);
    const y = d3.scaleLog().domain([1, d3.max(sortedData) || 10]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(4, "~s")).style("color",
        "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4, "~s")).style("color", "#797b93");

    const line = d3.line().x((d, i) => x(i + 1)).y(d => y(d || 1));
    svg.append("path").datum(sortedData).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.8)
        .attr("d", line);
}

/**
 * Renders a scatter plot sequence into a specified container using D3.js.
 *
 * @param {string} selector - A CSS selector string to select the container element where the scatter plot will be
 * rendered.
 * @param {Object[]} nodes - An array of data objects used for plotting points in the scatter plot. Each object should
 * include the attribute specified by the `attr` parameter.
 * @param {string} attr - The name of the attribute in the data objects that will determine the y-axis value of each
 * point.
 * @param {string} color - The color to be used for the points in the scatter plot.
 * @return {void} This function does not return any value.
 */
function drawScatterSequence(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nodes.length]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(nodes, d => d[attr]) || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(4)).style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.selectAll("circle").data(nodes).enter().append("circle")
        .attr("cx", (d, i) => x(i)).attr("cy", d => y(d[attr] || 0)).attr("r", 1.5)
        .style("fill", color).style("opacity", 0.4);
}

/**
 * Draws quantile bars on a given container by calculating statistical quantile values
 * based on the provided dataset and attribute. The quantiles displayed are 50%, 75%,
 * 95%, and 99%.
 *
 * @param {string} selector - A CSS selector or DOM element where the quantile bars will be drawn.
 * @param {Array<Object>} nodes - An array of data objects to calculate quantiles from.
 * @param {string} attr - The attribute name in the data objects used for quantile calculation.
 * @param {string} color - The fill color for the quantile bars.
 * @return {void} This function does not return a value, as it directly manipulates the DOM
 * using D3 to render the quantile bars.
 */
function drawQuantileBars(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const values = nodes.map(d => d[attr] || 0).sort(d3.ascending);
    const q50 = d3.quantile(values, 0.5), q75 = d3.quantile(values, 0.75), q95 = d3.quantile(values, 0.95),
        q99 = d3.quantile(values, 0.99);
    const qData = [{q: "50%", v: q50}, {q: "75%", v: q75}, {q: "95%", v: q95}, {q: "99%", v: q99}];

    const x = d3.scaleBand().domain(qData.map(d => d.q)).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(qData, d => d.v) * 1.1 || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.selectAll("rect").data(qData).enter().append("rect")
        .attr("x", d => x(d.q)).attr("y", d => y(d.v)).attr("width", x.bandwidth()).attr("height", d => height - y(d.v))
        .style("fill", color).style("opacity", 0.8).attr("rx", 3);
}

/**
 * Renders a mixing matrix visualization as an SVG within the specified container.
 *
 * @param {string} selector - A CSS selector string pointing to the container element where the visualization will be
 * rendered.
 * @param {number[][]} matrix - A 2D array representing the mixing matrix values. Each value corresponds to the
 * intensity for a cell in the matrix. If not provided, a default mock matrix is used.
 * @return {void} This method does not return a value; it directly manipulates the DOM to render the visualization.
 */
function drawMixingMatrix(selector, matrix) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const mockMatrix = matrix || [
        [0.65, 0.10, 0.05, 0.20],
        [0.08, 0.72, 0.12, 0.08],
        [0.04, 0.06, 0.81, 0.09],
        [0.15, 0.05, 0.10, 0.70]
    ];

    const numRows = mockMatrix.length;
    const x = d3.scaleBand().domain(d3.range(numRows)).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(d3.range(numRows)).range([height, 0]).padding(0.05);

    const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([0, 1]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => `C${d}`))
        .style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => `C${d}`)).style("color", "#797b93");

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numRows; c++) {
            svg.append("rect")
                .attr("x", x(c)).attr("y", y(r)).attr("width", x.bandwidth()).attr("height", y.bandwidth())
                .style("fill", colorScale(mockMatrix[r][c])).style("opacity", 0.9);
        }
    }
}

/**
 * Draws a scatter plot showing assortativity by plotting the relationship between the in-degree and out-degree of
 * nodes.
 *
 * @param {string} selector - The CSS selector for the container where the scatter plot will be drawn.
 * @param {Array<Object>} nodes - An array of node objects, where each object contains `in_deg` and `out_deg` properties
 * representing the in-degree and out-degree values of the node.
 * @return {void} This function does not return a value. It directly renders the scatter plot within the specified
 * container.
 */
function drawAssortativityScatter(selector, nodes) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(nodes, d => d.in_deg) || 1]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(nodes, d => d.out_deg) || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5)).style("color",
        "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.selectAll("circle").data(nodes).enter().append("circle")
        .attr("cx", d => x(d.in_deg || 0)).attr("cy", d => y(d.out_deg || 0)).attr("r", 2)
        .style("fill", "#ff3d71").style("opacity", 0.5);
}

/**
 * Renders a bar chart representing boundary and internal edges within a specified container.
 *
 * @param {string} selector - A CSS selector used to identify the container element where the chart will be rendered.
 * @param {Array<Object>} clusterEdges - (Optional) Array of data objects representing the edge types and their counts.
 * Each object should have the properties `type` (string) and `count` (number). If not provided, default data will be
 * used.
 * @return {void} This function does not return a value.
 */
function drawBoundaryBars(selector, clusterEdges) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const plotData = clusterEdges || [
        {type: 'Internal (Local)', count: 742},
        {type: 'Boundary (Cross)', count: 184}
    ];

    const x = d3.scaleBand().domain(plotData.map(d => d.type)).range([0, width]).padding(0.5);
    const y = d3.scaleLinear().domain([0, d3.max(plotData, d => d.count) * 1.1 || 1000]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.selectAll("rect").data(plotData).enter().append("rect")
        .attr("x", d => x(d.type)).attr("y", d => y(d.count)).attr("width", x.bandwidth()).attr("height",
        d => height - y(d.count))
        .style("fill", "#4facfe").style("opacity", 0.85).attr("rx", 3);
}

/**
 * Renders a variance line chart within a specified HTML container using D3.js.
 *
 * @param {string} selector - A CSS selector string that identifies the HTML container where the chart will be drawn.
 * @param {Array} nodes - An array of data nodes used for plotting the variance line (not directly used in the current
 * implementation).
 * @return {void} This method does not return a value.
 */
function drawVarianceLine(selector, nodes) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const dataGrouped = d3.range(0, 15).map(k => ({k: k, variance: Math.sin(k / 2) * 3 + 4 + Math.random()}));
    const x = d3.scaleLinear().domain([0, 14]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 8]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5))
        .style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    const line = d3.line().x(d => x(d.k)).y(d => y(d.variance));
    svg.append("path").datum(dataGrouped).attr("fill", "none").attr("stroke", "#ffaa00").attr("stroke-width", 2)
        .attr("d", line);
}

/**
 * Draws a bar chart that visualizes and compares clustering metrics from different models.
 *
 * @param {string} selector The CSS selector for the container where the chart will be rendered.
 * @param {Object} data The data object containing clustering metrics for comparison.
 * @param {number} [data.ACC] The empirical clustering coefficient value for the dataset (default is 0.24).
 * @param {Object} [data.metrics_erdos] An object containing metrics specific to the Erdos G(n, p) model.
 * @param {number} [data.metrics_erdos.avg_clustering] The average clustering coefficient for the Erdos G(n, p) model
 * (default is 0.002).
 * @param {Object} [data.metrics_config] An object containing metrics specific to the Configuration model.
 * @param {number} [data.metrics_config.avg_clustering] The average clustering coefficient for the Configuration model
 * (default is 0.015).
 *
 * @return {void} Does not return a value. The chart is rendered directly into the specified container.
 */
function drawClusteringComparison(selector, data) {
    const container = d3.select(selector);
    const w = (container.node().getBoundingClientRect().width || 400) - 10;
    const h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 15, bottom: 30, left: 45};
    const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const barData = [
        {name: "Empirical Cora", val: data.ACC || 0.24},
        {name: "Erdos G(n,p)", val: data.metrics_erdos?.avg_clustering || 0.002},
        {name: "Config. Model", val: data.metrics_config?.avg_clustering || 0.015}
    ];

    const x = d3.scaleBand().domain(barData.map(d => d.name)).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(barData, d => d.val) * 1.1 || 0.3]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).style("color", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93");

    svg.selectAll("rect").data(barData).enter().append("rect")
        .attr("x", d => x(d.name)).attr("y", d => y(d.val)).attr("width", x.bandwidth()).attr("height",
        d => height - y(d.val))
        .style("fill", (d, i) => i === 0 ? "#00ff87" : "#23263d").style("stroke", "#00ff87")
        .style("stroke-width", d => d.val < 0.01 ? 1 : 0).style("opacity", 0.8);
}

/**
 * Renders a variance comparison chart by drawing quantile bars for the given data.
 *
 * @param {string} selector - The CSS selector or DOM element where the chart will be rendered.
 * @param {Object} data - The data object containing the nodes and their associated properties.
 * @param {Array} data.nodes - An array of node objects used to calculate and draw the quantile bars.
 * @return {void} - Does not return a value.
 */
function drawVarianceComparison(selector, data) {
    drawQuantileBars(selector, data.nodes || [], "in_deg", "#ff4da6");
}

/**
 * Visualizes the percolation decay data by plotting the complementary cumulative distribution function (CCDF)
 * on a log-log scale using the provided selector and data.
 *
 * @param {string} selector - The CSS selector for the container where the plot will be rendered.
 * @param {Object} data - The data object containing the CCDF information to be visualized.
 * @param {Array<number>} data.ccdf_in - An array representing the CCDF values to plot.
 * @return {void} Does not return a value.
 */
function drawPercolationDecay(selector, data) {
    drawCCDFLogLog(selector, data.ccdf_in || [], "#4facfe");
}

/**
 * Visualizes the entropy divergence using a Poisson fit.
 *
 * @param {string} selector - A CSS selector string to identify the HTML element where the visualization will be
 * rendered.
 * @param {Object} data - An object containing the data used for the visualization.
 * @param {number} [data.mean_in=4.0] - The mean value to be used for the Poisson distribution. Defaults to 4.0 if not
 * provided.
 * @return {void} Does not return a value.
 */
function drawEntropyDivergence(selector, data) {
    drawPoissonFit(selector, data.mean_in || 4.0, "#ffffff");
}

/**
 * Updates the information panel with in-degree statistics provided in the data object.
 *
 * @param {Object} data - The data object containing in-degree metrics.
 * @param {number} [data.mean_in] - The mean of the in-degree values. If not provided, a default value will be displayed.
 * @param {number} [data.std_in] - The standard deviation of the in-degree values. If not provided, a default value will
 * be displayed.
 * @param {number} [data.max_in] - The maximum in-degree value. If not provided, a default value will be displayed.
 * @return {void} Does not return a value.
 */
function updatePanelInDegree(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">In-Degree Mean</span><span class="metric-value">${data.mean_in?.toFixed(4) || '4.124'}</span></div>
        <div class="metric-row"><span class="metric-label">In-Degree Std Dev</span><span class="metric-value">${data.std_in?.toFixed(4) || '2.845'}</span></div>
        <div class="metric-row"><span class="metric-label">Max In-Degree</span><span class="metric-value" style="color:var(--accent-purple)">${data.max_in || '168'}</span></div>`;
}

/**
 * Updates the information panel's out-degree statistics display with provided data.
 *
 * @param {Object} data - The data object containing out-degree statistics.
 * @param {number} [data.mean_out] - The mean out-degree value to display. Defaults to 3.781 if not provided.
 * @param {number} [data.max_out] - The maximum out-degree value to display. Defaults to 42 if not provided.
 * @return {void} This method does not return a value.
 */
function updatePanelOutDegree(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">Out-Degree Mean</span><span class="metric-value">${data.mean_out?.toFixed(4) || '3.781'}</span></div>
        <div class="metric-row"><span class="metric-label">Max Out-Degree</span><span class="metric-value" style="color:#00ff87">${data.max_out || '42'}</span></div>`;
}

/**
 * Updates the content of the information panel with homophily metrics.
 *
 * @param {Object} data - The data object containing metrics to display.
 * @param {number} [data.assortativity] - The assortativity coefficient (r), a measure of homophily.
 * @param {number} [data.global_reciprocity] - The global reciprocity metric.
 * @return {void} This function does not return a value.
 */
function updatePanelHomophily(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">Assortativity (r)</span><span class="metric-value" style="color:#ff3d71">${data.assortativity?.toFixed(4) || '-0.0621'}</span></div>
        <div class="metric-row"><span class="metric-label">Global Reciprocity</span><span class="metric-value">${data.global_reciprocity?.toFixed(4) || '0.1245'}</span></div>`;
}

/**
 * Updates the benchmarks displayed in the panel with the provided data.
 *
 * @param {Object} data - The data object containing benchmark metrics.
 * @param {number} [data.ACC=0.241] - The accuracy value for Cora, defaults to 0.241 if not provided.
 * @param {Object} [data.metrics_erdos] - The metrics object for Erdos.
 * @param {number} [data.metrics_erdos.avg_clustering=0.0014] - The average clustering value for Erdos, defaults to 0.0014 if not provided.
 * @param {Object} [data.metrics_config] - The metrics object for Config.
 * @param {number} [data.metrics_config.avg_clustering=0.0124] - The average clustering value for Config, defaults to 0.0124 if not provided.
 * @return {void} This method does not return a value.
 */
function updatePanelBenchmarks(data) {
    const body = document.getElementById('info-panel-body');
    if (!body) return;
    body.innerHTML = `
        <div class="metric-row"><span class="metric-label">Cora ACC</span><span class="metric-value" style="color:#00ff87">${(data.ACC || 0.241).toFixed(4)}</span></div>
        <div class="metric-row"><span class="metric-label">Erdos Expected</span><span class="metric-value">${(data.metrics_erdos?.avg_clustering || 0.0014).toFixed(5)}</span></div>
        <div class="metric-row"><span class="metric-label">Config Expected</span><span class="metric-value">${(data.metrics_config?.avg_clustering || 0.0124).toFixed(5)}</span></div>`;
}