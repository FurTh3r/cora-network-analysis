/**
 * ============================================================================
 * STATISTICAL DASHBOARDS & D3 CHARTS ENGINE
 * ============================================================================
 */
import {appState} from './state.js';

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
        configureCardHeader(cards[0], "In-Degree PMF (Log-Log Range)", "Resolution for Scale-Free Distribution");
        configureCardHeader(cards[1], "In-Degree CCDF Tail", "Empirical Cumulative Heavy-Tail Density");
        configureCardHeader(cards[2], "Empirical Cora vs Erdos-Renyi G(n,p)",
            "Poisson Model Divergence & Percentile Bounds");
        configureCardHeader(cards[3], "Top 10 Highest In-Degree Hubs", "Horizontal Ranking Analysis");

        setTimeout(() => {
            drawLogLogPMF("#degree-histogram-canvas", data.nodes, "in_deg", "#4facfe",
                "In-Degree (k)", "Probability P(k)");
            drawCCDFLogLog("#out-degree-scatter-canvas", data.ccdf_in, "#4facfe",
                "In-Degree (k)", "P(K ≥ k)");
            drawRealVsErdosPercentile("#cdf-bounds-canvas", data, "#4facfe");
            drawTop10Horizontal("#random-convergence-canvas", data.nodes, "in_deg", "#4facfe");
        }, 30);

    } else if (viewName === 'Out-Degree Structural Analysis') {
        configureCardHeader(cards[0], "Out-Degree PMF", "Discrete Symmetrical Target Metric");
        configureCardHeader(cards[1], "Out-Degree CCDF (Extended Range)",
            "Light-Tail Structural Compaction");
        configureCardHeader(cards[2], "Joint Degree Scatterplot",
            "In-Degree vs Out-Degree Correlation Profiles");
        configureCardHeader(cards[3], "Out-Degree Erdos-Renyi CCDF Validation",
            "Theoretical Poisson Edge Limits");

        setTimeout(() => {
            drawCenteredPMF("#degree-histogram-canvas", data.nodes, "out_deg", "#00ff87");
            drawExtendedCCDF("#out-degree-scatter-canvas", data.ccdf_out, "#00ff87");
            drawJointDegreeScatter("#cdf-bounds-canvas", data.nodes);
            drawErdosOutCCDF("#random-convergence-canvas", data.mean_out || 3.8, "#00ff87");
        }, 30);

    } else if (viewName === 'Homophily & Mixing Matrix') {
        configureCardHeader(cards[0], "Mixing Matrix Probabilities",
            "Categorical Link Transition Density");
        configureCardHeader(cards[1], "Structural Class Assortativity",
            "Inter-Group Categorical Connection Matrix");
        configureCardHeader(cards[2], "Observed Cross-Group Edges vs Null Model (2pq)",
            "Homophily Metric Boundary Check");
        configureCardHeader(cards[3], "Neighborhood Class Dispersal Spectrum",
            "Neighbor Homogeneity Variant");

        setTimeout(() => {
            drawReadableMixingMatrix("#degree-histogram-canvas", data.mixing_matrix);
            drawCategoricalAssortativity("#out-degree-scatter-canvas", data);
            drawCrossVsExpected("#cdf-bounds-canvas", data);
            drawNeighborhoodDispersal("#random-convergence-canvas", data);
        }, 30);

    } else if (viewName === 'Benchmark Models Alignment') {
        configureCardHeader(cards[0], "Multi-Model CCDF Convergence",
            "Cora vs Erdos-Renyi vs Configuration Model");
        configureCardHeader(cards[1], "Average Clustering Coefficient Metrics",
            "Local Dense Triad Cohesion Spectrum");
        configureCardHeader(cards[2], "Network Transitivity Bounds",
            "Global Fractional Closed Triangles");
        configureCardHeader(cards[3], "Global Reciprocity Levels",
            "Directed Mutuality Coefficient Benchmarks");

        setTimeout(() => {
            drawTripleCCDF("#degree-histogram-canvas", data);

            drawBenchmarkBarChart("#out-degree-scatter-canvas", [
                {model: "Empirical Cora", val: data.cora_acc || 0, color: "#00ff87"},
                {model: "Erdos G(n,p)", val: data.erdos_acc || 0, color: "#797b93"},
                {model: "Config. Model", val: data.config_acc || 0, color: "#ff4da6"}
            ], "Clustering Coeff.");

            drawBenchmarkBarChart("#cdf-bounds-canvas", [
                {model: "Empirical Cora", val: data.cora_transitivity || 0, color: "#00f2fe"},
                {model: "Erdos G(n,p)", val: data.erdos_transitivity || 0, color: "#797b93"},
                {model: "Config. Model", val: data.config_transitivity || 0, color: "#ff4da6"}
            ], "Global Transitivity");

            drawBenchmarkBarChart("#random-convergence-canvas", [
                {model: "Empirical Cora", val: data.cora_reciprocity || 0, color: "#b337ff"},
                {model: "Erdos G(n,p)", val: data.erdos_reciprocity || 0, color: "#797b93"},
                {model: "Config. Model", val: data.config_reciprocity || 0, color: "#ff4da6"}
            ], "Reciprocity Metric");
        }, 30);
    }
}

/**
 * Configures the header of a card element by setting the title and subtitle.
 *
 * @param {HTMLElement} card The card element to be configured.
 * @param {string} title The text to set as the title in the card's header.
 * @param {string} subtitle The text to set as the subtitle in the card's header.
 * @return {void}
 */
function configureCardHeader(card, title, subtitle) {
    const titleSpan = card.querySelector('.chart-header span:first-child');
    const subtitleSpan = card.querySelector('.chart-subtitle');
    if (titleSpan) titleSpan.textContent = title;
    if (subtitleSpan) subtitleSpan.textContent = subtitle;
}

/**
 * Sets up the base X and Y axes for a D3 visualization, including axis lines, tick marks, and labels.
 *
 * @param {Object} svg - The SVG container where the axes will be appended.
 * @param {Object} xScale - The D3 scale function for the X-axis.
 * @param {Object} yScale - The D3 scale function for the Y-axis.
 * @param {number} height - The height of the SVG container, used for positioning the X-axis and Y-axis labels.
 * @param {number} width - The width of the SVG container, used for positioning the X-axis label.
 * @param {string} xLabel - The text label for the X-axis.
 * @param {string} yLabel - The text label for the Y-axis.
 * @return {void} - Does not return a value. Modifies the provided SVG container directly by appending axes elements.
 */
function setupBaseAxes(svg, xScale, yScale, height, width, xLabel, yLabel, sci_notation = false) {
    const xAxis = d3.axisBottom(xScale).ticks(6);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    const yAxis = d3.axisLeft(yScale);

    const yDomain = yScale.domain();
    const yMin = yDomain[0] > 0 ? yDomain[0] : 1e-5;
    const yMax = yDomain[1] > 0 ? yDomain[1] : 1;

    const minExponentY = Math.floor(Math.log10(yMin));
    const maxExponentY = Math.ceil(Math.log10(yMax));

    const yLogTicks = [];
    for (let i = minExponentY; i <= maxExponentY; i++) {
        yLogTicks.push(Math.pow(10, i));
    }

    yAxis.tickValues(yLogTicks);

    if (sci_notation) {
        yAxis.tickFormat(d3.format(".0e")); // Es. 1e+0, 1e-1, 1e-2
    } else {
        yAxis.tickFormat(d3.format("~f"));  // Es. 1, 0.1, 0.01, 0.001
    }

    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 28)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text(xLabel);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -32)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text(yLabel);
}

/**
 * Creates a legend for a chart and appends it to an SVG element.
 *
 * @param {object} svg - The SVG element to which the legend will be appended.
 * @param {Array} items - An array of legend items, where each item is an object containing properties such as `type`,
 * `color`, `dash`, and `text`.
 * @param {number} width - The width of the container, used to position the legend.
 * @return {void} Does not return anything.
 */
function createLegend(svg, items, width) {
    const leg = svg.append("g").attr("transform", `translate(${width - 120}, 5)`);
    items.forEach((d, i) => {
        const row = leg.append("g").attr("transform", `translate(0, ${i * 14})`);
        if (d.type === 'line') {
            row.append("line").attr("x1", 0).attr("x2", 12).attr("y1", 6).attr("y2", 6)
                .attr("stroke", d.color).attr("stroke-width", 2).attr("stroke-dasharray", d.dash || "none");
        } else {
            row.append("rect").attr("width", 10).attr("height", 10).attr("fill", d.color).attr("rx", 2);
        }
        row.append("text").attr("x", 16).attr("y", 9).style("fill", "#e2e8f0").style("font-size", "9px").text(d.text);
    });
}

/**
 * Draws a log-log plot of the probability mass function (PMF) for a given dataset.
 *
 * @param {string} selector - A CSS selector string used to select the container element where the plot will be drawn.
 * @param {Array} nodes - An array of data objects representing the dataset.
 * @param {string} attr - The attribute name in the data objects that will be plotted on the x-axis.
 * @param {string} color - A string representing the color to be used for the data points in the plot.
 * @param {string} xLabel - The label text for the x-axis of the plot.
 * @param {string} yLabel - The label text for the y-axis of the plot.
 * @return {void} This function does not return a value; it generates and appends the plot to the selected DOM element.
 */
function drawLogLogPMF(selector, nodes, attr, color, xLabel, yLabel) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const counts = {};
    nodes.forEach(n => {
        const v = n[attr] || 0;
        counts[v] = (counts[v] || 0) + 1;
    });
    const total = nodes.length;
    const dataPoints = Object.keys(counts).map(k => ({k: +k, p: counts[k] / total}))
        .filter(d => d.k > 0);

    const x = d3.scaleLog().domain([1, d3.max(dataPoints, d => d.k) || 10]).range([0, width]);
    const y = d3.scaleLog().domain([d3.min(dataPoints, d => d.p) || 0.001, d3.max(dataPoints, d => d.p) || 1])
        .range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, xLabel, yLabel);
    svg.selectAll("circle").data(dataPoints).enter().append("circle")
        .attr("cx", d => x(d.k)).attr("cy", d => y(d.p)).attr("r", 3).style("fill", color).style("opacity", 0.7);
    createLegend(svg, [{text: "Empirical PMF", color: color, type: "dot"}], width);
}

/**
 * Draws a Complementary Cumulative Distribution Function (CCDF) plot on a log-log scale within a specified container.
 *
 * @param {string} selector - A CSS selector string identifying the container element where the graph will be rendered.
 * @param {Array<number>} ccdfData - An array of numerical values representing the CCDF data points.
 * @param {string} color - A string representing the color of the CCDF curve (e.g., a hex code or color name).
 * @param {string} xLabel - A string specifying the label for the x-axis of the graph.
 * @param {string} yLabel - A string specifying the label for the y-axis of the graph.
 * @return {void} This method does not return any value. It renders the graphical representation of the CCDF directly in the provided container.
 */
function drawCCDFLogLog(selector, ccdfData, color, xLabel, yLabel) {
    const container = d3.select(selector);
    if (!ccdfData || ccdfData.length === 0) return;
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const points = ccdfData.map((p, k) => ({k: k, p: p}))
        .filter(d => d.k > 0 && d.p > 0);
    const x = d3.scaleLog().domain([1, d3.max(points, d => d.k) || 10]).range([0, width]);
    const y = d3.scaleLog().domain([d3.min(points, d => d.p) || 0.001, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, xLabel, yLabel);
    svg.append("path").datum(points).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.k)).y(d => y(d.p)));
    createLegend(svg, [{text: "Empirical CCDF", color: color, type: "line"}], width);
}

/**
 * Draws a comparison chart of the complementary cumulative distribution function (CCDF)
 * of a real-world network versus an Erdos-Renyi random graph model on a LOG-LOG scale.
 * Additionally, it marks the 99th percentile of the empirical degree distribution.
 *
 * @param {string} selector - A CSS selector to identify the container where the chart will be rendered.
 * @param {Object} networkData - Data object containing network information.
 * @param {string} color - The stroke color for the real network's line in the chart.
 * @return {void} Renders the log-log comparison chart directly into the specified container.
 */
function drawRealVsErdosPercentile(selector, networkData, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45},
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const ccdfReal = (networkData.ccdf_in || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);

    const ccdfErdos = (networkData.ccdf_er || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0.0001); // Filtro protettivo per la rapida caduta di Erdos

    if (ccdfReal.length === 0) return;

    const maxK = Math.max(d3.max(ccdfReal, d => d.k) || 1, d3.max(ccdfErdos, d => d.k) || 1);
    const minP = Math.min(d3.min(ccdfReal, d => d.p) || 0.001, d3.min(ccdfErdos, d => d.p) || 0.001);

    const x = d3.scaleLog().domain([1, maxK]).range([0, width]);
    const y = d3.scaleLog().domain([minP, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "In-Degree / Citations Received (k)",
        "Complementary Cumulative Probability P(X ≥ k)");

    const line = d3.line().x(d => x(d.k)).y(d => y(d.p));

    svg.append("path").datum(ccdfReal).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
        .attr("d", line);

    svg.append("path").datum(ccdfErdos).attr("fill", "none").attr("stroke", "#797b93")
        .attr("stroke-dasharray", "4,4").attr("stroke-width", 2).attr("d", line);

    const values = networkData.nodes.map(d => d.in_deg || 0).sort(d3.ascending);
    const p99Val = d3.quantile(values, 0.99) || 18;

    if (p99Val >= 1 && x(p99Val) <= width) {
        svg.append("line")
            .attr("x1", x(p99Val)).attr("x2", x(p99Val))
            .attr("y1", 0).attr("y2", height)
            .attr("stroke", "#ff3d71").attr("stroke-width", 1.5).attr("stroke-dasharray", "2,2");

        svg.append("text")
            .attr("x", x(p99Val) + 4).attr("y", 15)
            .style("fill", "#ff3d71").style("font-size", "8px")
            .text(`99% Pct (${p99Val})`);
    }

    createLegend(svg, [
        {text: "Cora Real", color: color, type: "line"},
        {text: "Erdos G(n,p)", color: "#797b93", type: "line", dash: "4,4"},
        {text: "99% Bound", color: "#ff3d71", type: "line", dash: "2,2"}
    ], width);
}

/**
 * Renders a horizontal bar chart displaying the top 10 nodes based on a specified attribute.
 *
 * @param {string} selector - A CSS selector specifying the container element where the chart will be appended.
 * @param {Array} nodes - An array of node objects containing the data to be visualized.
 * @param {string} attr - The attribute in the node objects to be used for sorting and determining bar length.
 * @param {string} color - The fill color to be applied to the bars in the chart.
 * @return {void} This function does not return a value. It directly manipulates the DOM to render the chart.
 */
function drawTop10Horizontal(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 10, right: 25, bottom: 30, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const top10 = nodes.sort((a, b) => b[attr] - a[attr]).slice(0, 10);

    const y = d3.scaleBand().domain(top10.map((d, i) => `Node ${d.id || i}`))
        .range([0, height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, d3.max(top10, d => d[attr]) || 1]).range([0, width]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5))
        .style("color", "#797b93").selectAll("text").style("fill", "#797b93");
    svg.append("g").call(d3.axisLeft(y)).style("color", "#797b93").selectAll("text")
        .style("fill", "#797b93").style("font-size", "9px");

    svg.selectAll("rect").data(top10).enter().append("rect")
        .attr("x", 0).attr("y", d => y(`Node ${d.id || d.index}`)).attr("width", d => x(d[attr]))
        .attr("height", y.bandwidth())
        .style("fill", color).style("opacity", 0.85).attr("rx", 2);

    svg.append("text").attr("x", width / 2).attr("y", height + 26).attr("text-anchor", "middle")
        .style("fill", "#797b93").style("font-size", "10px").text("Degree Value");
}

/**
 * Draws a centered Probability Mass Function (PMF) visualization for a given set of nodes based on a specified
 * attribute.
 *
 * @param {string} selector - The CSS selector for the container where the PMF visualization will be appended.
 * @param {Array} nodes - An array of objects representing the data points, where each object contains properties
 * for the visualization.
 * @param {string} attr - The attribute name of the data points used to compute the PMF.
 * @param {string} color - The color to be used for the bars in the PMF visualization.
 * @return {void} This function does not return a value.
 */
function drawCenteredPMF(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const maxVal = Math.min(d3.max(nodes, d => d[attr]) || 15, 25);
    const counts = d3.range(0, maxVal + 1).map(v => ({k: v, count: 0}));
    nodes.forEach(n => {
        const v = n[attr] || 0;
        if (v <= maxVal) counts[v].count++;
    });
    const total = nodes.length;

    const x = d3.scaleBand().domain(d3.range(0, maxVal + 1)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d.count / total) * 1.1 || 1]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickValues(x
        .domain().filter((d, i) => !(i % 2)))).style("color", "#797b93").selectAll("text").style("fill", "#797b93");
    svg.append("g").call(d3.axisLeft(y).ticks(4, "%")).style("color", "#797b93").selectAll("text")
        .style("fill", "#797b93");

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", d => x(d.k)).attr("y", d => y(d.count / total)).attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count / total))
        .style("fill", color).style("opacity", 0.8).attr("rx", 1);

    svg.append("text").attr("x", width / 2).attr("y", height + 28).attr("text-anchor", "middle")
        .style("fill", "#797b93").style("font-size", "10px").text("Out-Degree (k)");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -32)
        .attr("text-anchor", "middle").style("fill", "#797b93").style("font-size", "10px").text("Probability P(k)");
}

/**
 * Draws an Extended Complementary Cumulative Distribution Function (CCDF) plot within a specified container.
 *
 * @param {string} selector - A CSS selector string identifying the HTML container for the plot.
 * @param {Array<Object>} ccdfData - An array of data points representing CCDF values. Each object should have
 * properties corresponding to probabilities (e.g., {k, p}).
 * @param {string} color - The color to be used for plotting the CCDF line.
 * @return {void} This function does not return a value.
 */
function drawExtendedCCDF(selector, ccdfData, color) {
    const container = d3.select(selector);
    if (!ccdfData || ccdfData.length === 0) return;
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const points = ccdfData.map((p, k) => ({k, p})).slice(0, 30);
    const x = d3.scaleLinear().domain([0, 30]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Out-Degree (k)", "P(K ≥ k)");
    svg.append("path").datum(points).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.k)).y(d => y(d.p)));
    createLegend(svg, [{text: "Out-CCDF (Light Tail)", color: color, type: "line"}], width);
}

/**
 * Draws a scatter plot of the joint degree distribution for a network, plotting the in-degree versus out-degree of
 * nodes.
 *
 * @param {string} selector - The CSS selector for the container element where the scatter plot will be rendered.
 * @param {Array<Object>} nodes - An array of node objects, each containing `in_deg` and `out_deg` properties
 *                                representing the in-degree and out-degree of the node, respectively.
 * @return {void} This function does not return any value but renders the plot in the specified container.
 */
function drawJointDegreeScatter(selector, nodes) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLog().domain([1, d3.max(nodes, d => d.in_deg) || 10]).range([0, width]);
    const y = d3.scaleLog().domain([1, d3.max(nodes, d => d.out_deg) || 10]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "In-Degree (k_in)", "Out-Degree (k_out)");
    svg.selectAll("circle").data(nodes.filter(d => d.in_deg > 0 && d.out_deg > 0)).enter().append("circle")
        .attr("cx", d => x(d.in_deg)).attr("cy", d => y(d.out_deg)).attr("r", 2).style("fill", "#00f2fe")
        .style("opacity", 0.4);
    createLegend(svg, [{text: "Node Structure", color: "#00f2fe", type: "dot"}], width);
}

/**
 * Draws the Erdos-Renyi Out-Degree Complementary Cumulative Distribution Function (CCDF) on a given container.
 * This function visualizes the theoretical distribution using D3.js.
 *
 * @param {string} selector - The CSS selector of the container where the SVG will be appended.
 * @param {number} lambda - The average out-degree (mean) of the Erdos-Renyi graph.
 * @param {string} color - The color used for the line plotting the theoretical Out-CCDF.
 * @return {void} Does not return a value. The function dynamically appends the visualization to the specified
 * container.
 */
function drawErdosOutCCDF(selector, lambda, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    let cumPoisson = 0;
    const erdosPoints = d3.range(0, 25).map(k => {
        const pk = (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
        const res = {k, p: Math.max(0, 1 - cumPoisson)};
        cumPoisson += pk;
        return res;
    });

    const x = d3.scaleLinear().domain([0, 20]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Out-Degree (k)", "P(K ≥ k)");
    svg.append("path").datum(erdosPoints).attr("fill", "none").attr("stroke", color).attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 2).attr("d", d3.line().x(d => x(d.k)).y(d => y(d.p)));
    createLegend(svg, [{text: "ER Theoretical Out-CCDF", color: color, type: "line", dash: "4,4"}], width);
}

/**
 * Draws a visually readable mixing matrix visualization inside a specified container.
 * The method renders a heatmap-style matrix with color encoding based on the provided data.
 *
 * @param {string} selector - A selector string identifying the container where the visualization should be drawn.
 * @param {number[][]} matrix - A 2D array representing the mixing matrix data. It should be a square matrix where each
 * value ranges from 0 to 1.
 * @return {void} Does not return a value, as the visualization is rendered directly in the specified container.
 */
function drawReadableMixingMatrix(selector, matrix) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 50, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const mock = matrix;
    const nRows = mock.length;

    const x = d3.scaleBand().domain(d3.range(nRows)).range([0, width]).padding(0.04);
    const y = d3.scaleBand().domain(d3.range(nRows)).range([height, 0]).padding(0.04);

    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(i => `Class ${i}`))
        .style("color", "#797b93").selectAll("text").style("fill", "#797b93");
    svg.append("g").call(d3.axisLeft(y).tickFormat(i => `Class ${i}`)).style("color", "#797b93").selectAll("text")
        .style("fill", "#797b93");

    for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nRows; c++) {
            svg.append("rect").attr("x", x(c)).attr("y", y(r)).attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", colorScale(mock[r][c])).style("opacity", 0.95);
        }
    }

    const colorBar = svg.append("g").attr("transform", `translate(${width + 10}, 0)`);
    const barScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    colorBar.append("g").call(d3.axisRight(barScale).ticks(3)).style("color", "#797b93")
        .selectAll("text").style("fill", "#797b93");
    d3.range(0, height).forEach(i => {
        colorBar.append("line").attr("x1", 0).attr("x2", 10).attr("y1", i).attr("y2", i)
            .attr("stroke", colorScale(barScale.invert(i)));
    });
}

/**
 * Renders a bar chart visualization of categorical assortativity using D3.js.
 *
 * @param {string} selector - A CSS selector string that specifies the DOM element to render the visualization into.
 * @param {Object} networkData - The input data object, which contains the assortativity value and other related
 * information.
 * @param {number} [networkData.assortativity] - The observed assortativity value used for plotting. Defaults to -0.062
 * if not provided.
 * @return {void} Does not return a value; modifies the DOM by appending an SVG-based bar chart to the
 * specified container.
 */
function drawCategoricalAssortativity(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const rVal = networkData.assortativity || 0.0;
    const categories = ["Within-Class Links", "Random Baseline (r=0)", "Observed Rig"];
    const values = [networkData.mixing_within_fraction || 0, networkData.mixing_random_baseline || 0, rVal];

    const x = d3.scaleBand().domain(categories).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([-0.2, 1.0]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${y(0)})`).call(d3.axisBottom(x)).style("color", "#797b93")
        .selectAll("text")
        .attr("transform", "translate(0,6)").style("fill", "#797b93").style("font-size", "8px");
    svg.append("g").call(d3.axisLeft(y).ticks(5)).style("color", "#797b93").selectAll("text").style("fill", "#797b93");

    svg.selectAll("rect").data(values).enter().append("rect")
        .attr("x", (d, i) => x(categories[i])).attr("y", d => d >= 0 ? y(d) : y(0))
        .attr("width", x.bandwidth()).attr("height", d => Math.abs(y(d) - y(0)))
        .style("fill", (d, i) => i === 2 ? "#ff3d71" : "#3b3d56").attr("rx", 2);
}

/**
 * Renders a bar chart comparing observed cross-group values against expected values using D3.js.
 *
 * @param {string} selector - A CSS selector string used to select the DOM element where the chart will be drawn.
 * @param {Object} networkData - Data related to the network. This parameter is required for potential future extensions,
 *                               even though it is not currently utilized in this implementation.
 * @return {void} This method does not return any value, as it directly manipulates the DOM to render the chart.
 */
function drawCrossVsExpected(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const chartData = [
        { label: "Cross-Group (Observed)", value: networkData.cross_group_observed || 0 },
        { label: "Expected 2pq (Null Model)", value: networkData.expected_cross_edges || 0 }
    ];

    const x = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, width]).padding(0.5);
    const y = d3.scaleLinear().domain([0, 0.6]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Structural Boundary Model", "Fractional Edge Density");

    svg.selectAll("rect").data(chartData).enter().append("rect")
        .attr("x", d => x(d.label)).attr("y", d => y(d.value)).attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .style("fill", (d, i) => i === 0 ? "#ff4da6" : "#2d3142").style("stroke", "#ff4da6")
        .style("stroke-width", (d, i) => i === 1 ? 1.5 : 0).attr("rx", 3);
}

/**
 * Draws a neighborhood dispersal chart within a given container, visualizing the variance of local groups
 * based on hop distance thresholds in the provided network data.
 *
 * @param {string} selector - The CSS selector of the container element where the chart will be rendered.
 * @param {Object} networkData - The data object containing neighborhood variance information.
 * @param {Array<number>} networkData.neighborhood_variance - An array representing variance values for each hop distance threshold.
 * @return {void} This function does not return a value but renders a chart in the specified container.
 */
function drawNeighborhoodDispersal(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    let rawData = networkData.neighborhood_variance || [];
    let points;
    if (Array.isArray(rawData)) {
        points = rawData.map((val, i) => ({ x: i, y: val }));
    } else {
        points = Object.keys(rawData).map(key => ({ x: +key, y: rawData[key] })).sort((a,b) => a.x - b.x);
    }
    const x = d3.scaleLinear().domain([0, 9]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Hops Distance Threshold", "Local Group Variance");
    svg.append("path").datum(points).attr("fill", "none").attr("stroke", "#ffaa00").attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.x)).y(d => y(d.y)));
}

/**
 * Renders a triple Complementary Cumulative Distribution Function (CCDF) plot
 * based on empirical and modeled network data onto a specified container.
 *
 * @param {string} selector - A CSS selector string representing the container
 *                            element where the CCDF plot will be rendered.
 * @param {object} networkData - An object containing the empirical CCDF data.
 *                               The structure should include `ccdf_in`, which
 *                               is an array of probabilities corresponding to
 *                               node degrees in the network.
 * @return {void} Does not return a value. The function modifies the DOM
 *                by appending an SVG element to the selected container,
 *                containing the CCDF plot and its associated legend.
 */
function drawTripleCCDF(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const ccdfReal = (networkData.ccdf_in || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0.005);
    const ccdfErdos = (networkData.ccdf_er || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);
    const ccdfConfig = (networkData.ccdf_config || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);

    const x = d3.scaleLog().domain([1, d3.max(ccdfReal, d => d.k) || 30]).range([0, width]);
    const y = d3.scaleLog().domain([0.005, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Degree (k)", "P(K ≥ k)");

    const line = d3.line().x(d => x(d.k)).y(d => y(d.p));
    svg.append("path").datum(ccdfReal).attr("fill", "none").attr("stroke", "#00ff87").attr("stroke-width", 2)
        .attr("d", line);
    svg.append("path").datum(ccdfErdos).attr("fill", "none").attr("stroke", "#797b93").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,3").attr("d", line);
    svg.append("path").datum(ccdfConfig).attr("fill", "none").attr("stroke", "#ff4da6").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,2").attr("d", line);

    createLegend(svg, [
        {text: "Cora Empirical", color: "#00ff87", type: "line"},
        {text: "Erdos G(n,p)", color: "#797b93", type: "line", dash: "3,3"},
        {text: "Configuration", color: "#ff4da6", type: "line", dash: "5,2"}
    ], width);
}

/**
 * Draws a benchmark bar chart within the specified container element using the provided dataset and y-axis label.
 *
 * @param {string} selector - A CSS selector string that specifies the container element where the bar chart will be
 * rendered.
 * @param {Array<Object>} dataset - An array of data objects representing the chart data. Each object should contain
 * `model` (string), `val` (number), and `color` (string) properties.
 * @param {string} yLabel - The label for the y-axis, describing the metric being measured or displayed.
 * @return {void} This function does not return a value; it directly renders the bar chart in the specified container.
 */
function drawBenchmarkBarChart(selector, dataset, yLabel) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 45}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(dataset.map(d => d.model)).range([0, width]).padding(0.45);
    const y = d3.scaleLinear().domain([0, Math.max(d3.max(dataset, d => d.val) * 1.2, 0.01)]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Topological Target Space", yLabel);

    svg.selectAll("rect").data(dataset).enter().append("rect")
        .attr("x", d => x(d.model)).attr("y", d => y(d.val)).attr("width", x.bandwidth())
        .attr("height", d => height - y(d.val))
        .style("fill", d => d.color).style("opacity", 0.85).attr("rx", 2);
}