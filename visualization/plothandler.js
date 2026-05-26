/**
 * ============================================================================
 * PLOT HELPERS FOR VISUALIZATION
 * ============================================================================
 */

/**
 * Sets up and renders the base X and Y axes on an SVG element using D3.js,
 * with customizable scales, labels, and tick formatting.
 *
 * @param {Object} svg - The SVG container where the axes will be appended.
 * @param {Object} xScale - The D3 scale for the X-axis (e.g., linear, log, scaleBand).
 * @param {Object} yScale - The D3 scale for the Y-axis (e.g., linear, log, scaleBand).
 * @param {number} height - The height of the drawing area, used for axis positioning.
 * @param {number} width - The width of the drawing area, used for label alignment.
 * @param {string} xLabel - The label text for the X-axis.
 * @param {string} yLabel - The label text for the Y-axis.
 * @param {boolean} [sci_notation=false] - Determines whether to use scientific notation for log-scale Y-axis labels.
 * @return {void} This function does not return a value. It directly appends axes and labels to the provided SVG element.
 */
function setupBaseAxes(svg, xScale, yScale, height, width,
                       xLabel, yLabel, sci_notation = false) {
    // Determine if the X scale supports numeric ticks (linear/log) or is ordinal (scaleBand)
    const xAxis = d3.axisBottom(xScale);
    if (typeof xScale.ticks === "function") {
        if (xScale.base) {
            const xDomain = xScale.domain();

            // We round up to the nearest 50 or 100 depending on how big the number is.
            const rawMax = xDomain[1];
            let dynamicMaxTick;
            if (rawMax <= 50)
                dynamicMaxTick = Math.ceil(rawMax / 10) * 10;   // e.g., 34 becomes 40
            else if (rawMax <= 200)
                dynamicMaxTick = Math.ceil(rawMax / 50) * 50;   // e.g., 166 becomes 200
            else
                dynamicMaxTick = Math.ceil(rawMax / 100) * 100; // e.g., 250 becomes 300

            // Update the scale domain dynamically so it stops right after our smart ceiling
            xScale.domain([xDomain[0], dynamicMaxTick]);

            // Generate clean ticks based on standard anchor points
            const baseTicks = [1, 2, 3, 5, 10, 20, 30, 50, 100, 150, 200, 300, 500];

            // Only keep ticks that fit inside our new dynamic domain
            const xLogTicks = baseTicks.filter(tick => tick >= xDomain[0] && tick <= dynamicMaxTick);

            // Always ensure the exact boundary tick is included
            if (!xLogTicks.includes(dynamicMaxTick))
                xLogTicks.push(dynamicMaxTick);

            // Bind strict tick arrays and sort them chronologically
            xAxis.tickValues(xLogTicks.sort((a, b) => a - b));
            xAxis.tickFormat(d3.format("~f"));
        } else
            xAxis.ticks(6);
    }

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    const yAxis = d3.axisLeft(yScale);

    // Dynamic tick generation for log-scale axes to avoid cutting off labels
    if (typeof yScale.ticks === "function" && yScale.base) {
        const yDomain = yScale.domain();
        const yMin = yDomain[0] > 0 ? yDomain[0] : 1e-5;
        const yMax = yDomain[1] > 0 ? yDomain[1] : 1;

        const minExponentY = Math.floor(Math.log10(yMin));
        const maxExponentY = Math.ceil(Math.log10(yMax));

        const yLogTicks = [];
        for (let i = minExponentY; i <= maxExponentY; i++) {
            const tickVal = Math.pow(10, i);
            // Only push ticks that actually fall within the visible domain bounds
            if (tickVal >= yDomain[0] && tickVal <= yDomain[1])
                yLogTicks.push(tickVal);
        }

        yAxis.tickValues(yLogTicks);

        if (sci_notation) {
            yAxis.tickFormat(d3.format(".0e")); // e.g., 1e+0, 1e-1, 1e-2
        } else {
            yAxis.tickFormat(d3.format("~f"));  // e.g., 1, 0.1, 0.01, 0.001 (fixes .0 crash)
        }
    } else if (typeof yScale.ticks === "function")
        yAxis.ticks(5); // Standard linear scale formatting

    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    // X-Axis Label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 28)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text(xLabel);

    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text(yLabel);
}

/**
 * Creates a legend within the given SVG element by appending legend items based on the provided data.
 *
 * @param {Object} svg - The D3 selection of the SVG element where the legend will be appended.
 * @param {Array} items - An array of legend items. Each item should be an object containing `type`, `color`, `text`,
 * and optionally `dash` properties.
 *                        - `type` (string): Determines the shape of the legend item ('line' or 'rect').
 *                        - `color` (string): The color to be used for the legend item.
 *                        - `text` (string): The label to be displayed next to the legend item.
 *                        - `dash` (string) [optional]: Dash style for line items if applicable.
 * @param {number} width - The width of the SVG element, used for positioning the legend.
 * @return {void} This function does not return any value.
 */
function createLegend(svg, items, width) {
    const leg = svg.append("g").attr("transform", `translate(${width - 80}, 40)`);
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
export function drawLogLogPMF(selector, nodes, attr, color, xLabel, yLabel) {
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

    // Strict filtering to ensure log scale safety (k > 0 and p > 0)
    const dataPoints = Object.keys(counts).map(k => ({k: +k, p: counts[k] / total}))
        .filter(d => d.k > 0 && d.p > 0);

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
 * @return {void} This method does not return any value. It renders the graphical representation of the CCDF directly
 * in the provided container.
 */
export function drawCCDFLogLog(selector, ccdfData, color, xLabel, yLabel) {
    const container = d3.select(selector);
    if (!ccdfData || ccdfData.length === 0) return;
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    // Strict filtering for log scale compatibility
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
 * Draws a comparison chart of the complementary cumulative distribution function (CCDF) of a real-world network versus
 * an Erdos-Renyi random graph model on a LOG-LOG scale.
 * Additionally, it marks the 99th percentile of the empirical degree distribution.
 *
 * @param {string} selector - A CSS selector to identify the container where the chart will be rendered.
 * @param {Object} networkData - Data object containing network information.
 * @param {string} color - The stroke color for the real network's line in the chart.
 * @return {void} Renders the log-log comparison chart directly into the specified container.
 */
export function drawRealVsErdosPercentile(selector, networkData, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65},
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const ccdfReal = (networkData.ccdf_in || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);

    // Protective filtering against the rapid exponential drop of Erdos graphs
    const ccdfErdos = (networkData.ccdf_er || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0.0001);

    if (ccdfReal.length === 0) return;

    // Safely compute the dynamic global bounds across both distributions
    const maxK = Math.max(d3.max(ccdfReal, d => d.k) || 1, d3.max(ccdfErdos, d => d.k) || 1);
    const minP = Math.min(d3.min(ccdfReal, d => d.p) || 0.001, d3.min(ccdfErdos, d => d.p) || 0.001);

    const x = d3.scaleLog().domain([1, maxK]).range([0, width]);
    const y = d3.scaleLog().domain([minP, 1]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "In-Degree / Citations Received (k)",
        "P(X ≥ k)");

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
export function drawTop10Horizontal(selector, nodes, attr, color) {
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

    // Render linear axes natively without invoking setupBaseAxes due to customized string formatting on bands
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
export function drawCenteredPMF(selector, nodes, attr, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;

    // Increased right margin slightly from 20 to 30 to give physical space to the last bar
    const margin = {top: 15, right: 30, bottom: 35, left: 65},
        width = w - margin.left - margin.right,
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

    const x = d3.scaleBand().domain(d3.range(0, maxVal + 1)).range([0, width]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d.count / total) * 1.1 || 1]).range([height, 0]);

    const xAxis = d3.axisBottom(x)
        .ticks(6);

    // Render X Axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    // Render Y Axis (with dynamic fix to drop the first overlapping baseline label)
    const yAxis = d3.axisLeft(y).ticks(5, "%");

    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "10px");

    // Clean up overlapping/cut-off text at the absolute origin [0,0]
    svg.select(".y-axis").select("text").remove();

    // Draw Rectangular Bars
    svg.selectAll("rect")
        .data(counts)
        .enter()
        .append("rect")
        .attr("x", d => x(d.k))
        .attr("y", d => y(d.count / total))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count / total))
        .style("fill", color)
        .style("opacity", 0.85)
        .attr("rx", 2); // Rounded edges for modern dashboard appearance

    // X-Axis Label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 25)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text("Out-Degree (k)");

    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -36) // Shifted slightly outward to prevent crash with tick percentages
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "10px")
        .text("Probability P(k)");
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
export function drawExtendedCCDF(selector, ccdfData, color) {
    const container = d3.select(selector);
    if (!ccdfData || ccdfData.length === 0) return;
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
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
export function drawJointDegreeScatter(selector, nodes) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    // Safe filtering to ensure nodes mapped to log scales are strictly positive
    const validNodes = nodes.filter(d => d.in_deg > 0 && d.out_deg > 0);

    const x = d3.scaleLog().domain([1, d3.max(validNodes, d => d.in_deg) || 10]).range([0, width]);
    const y = d3.scaleLog().domain([1, d3.max(validNodes, d => d.out_deg) || 10]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "In-Degree (k_in)", "Out-Degree (k_out)");
    svg.selectAll("circle").data(validNodes).enter().append("circle")
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
export function drawErdosOutCCDF(selector, lambda, color) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    let cumPoisson = 0;
    let pk = Math.exp(-lambda); // Represents P(K = 0) initially

    const erdosPoints = d3.range(0, 25).map(k => {
        if (k > 0) {
            pk = (pk * lambda) / k; // Incremental derivation of Poisson term without calling a custom factorial()
        }
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
export function drawReadableMixingMatrix(selector, matrix) {
    const container = d3.select(selector);
    if (!matrix || matrix.length === 0) return;

    // Increased right margin from 40 to 60 to prevent colorbar numbers from being clipped
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 60, bottom: 35, left: 55},
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const nRows = matrix.length;

    const x = d3.scaleBand().domain(d3.range(nRows)).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(d3.range(nRows)).range([height, 0]).padding(0.05);

    // Find the true maximum value inside the matrix to enhance visual contrast
    const maxVal = d3.max(matrix, row => d3.max(row)) || 1.0;
    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, maxVal]);

    // X-Axis Layout
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(i => `C${i}`)) // Shortened to C0, C1 for narrow cards
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "9px");

    // Y-Axis Layout
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(i => `C${i}`))
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "9px");

    // Draw Heatmap Cells and Labels
    for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nRows; c++) {
            const val = matrix[r][c];

            // Append the rectangle cell
            svg.append("rect")
                .attr("x", x(c))
                .attr("y", y(r))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", colorScale(val))
                .style("opacity", 0.95)
                .attr("rx", 1.5);

            // Append internal value labels if there is enough pixel room
            if (x.bandwidth() > 22) {
                // Adaptive text contrast: use dark text on light yellow backgrounds, light text on dark purples
                const textColor = (val / maxVal > 0.6) ? "#1e213a" : "#e2e8f0";

                svg.append("text")
                    .attr("x", x(c) + x.bandwidth() / 2)
                    .attr("y", y(r) + y.bandwidth() / 2 + 3.5)
                    .attr("text-anchor", "middle")
                    .style("fill", textColor)
                    .style("font-size", "8px")
                    .style("font-weight", "500")
                    .style("pointer-events", "none")
                    .text(val.toFixed(3));
            }
        }
    }

    // --- ENHANCED COLOR BAR LEGEND ---
    // Moved slightly to the right to clear space from the heatmap edge
    const colorBar = svg.append("g").attr("transform", `translate(${width + 12}, 0)`);
    const barScale = d3.scaleLinear().domain([0, maxVal]).range([height, 0]);

    colorBar.append("g")
        .call(d3.axisRight(barScale).ticks(3, ".2f").tickPadding(8))
        .style("color", "#797b93")
        .selectAll("text")
        .style("fill", "#797b93")
        .style("font-size", "9px");

    // Render a solid gradient block instead of individual lines to avoid grid-bleeding artifacts
    d3.range(0, height).forEach(i => {
        colorBar.append("line")
            .attr("x1", 0)
            .attr("x2", 6) // Wider colorbar block
            .attr("y1", i)
            .attr("y2", i)
            .attr("stroke", colorScale(barScale.invert(i)))
            .attr("stroke-width", 1.5);
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
export function drawCategoricalAssortativity(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
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
export function drawCrossVsExpected(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const chartData = [
        {label: "Cross-Group (Observed)", value: networkData.cross_group_observed || 0},
        {label: "Expected 2pq (Null Model)", value: networkData.expected_cross_edges || 0}
    ];

    const x = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, width]).padding(0.5);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // Bypassing setupBaseAxes to ensure specific label alignments for categorical bar layout
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
        .style("color", "#797b93").selectAll("text").style("fill", "#797b93").style("font-size", "9px");
    svg.append("g").call(d3.axisLeft(y).ticks(4)).style("color", "#797b93").selectAll("text").style("fill", "#797b93");

    svg.selectAll("rect").data(chartData).enter().append("rect")
        .attr("x", d => x(d.label)).attr("y", d => y(d.value)).attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .style("fill", (d, i) => i === 0 ? "#ff4da6" : "#2d3142").style("stroke", "#ff4da6")
        .style("stroke-width", (d, i) => i === 1 ? 1.5 : 0).attr("rx", 3);
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
export function drawTripleCCDF(selector, networkData) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 15, right: 20, bottom: 35, left: 65}, width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    // Ensure strict log-scale filtering across all models (p must be strictly positive)
    const ccdfReal = (networkData.ccdf_in || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);
    const ccdfErdos = (networkData.ccdf_er || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);
    const ccdfConfig = (networkData.ccdf_config || []).map((p, k) => ({k, p}))
        .filter(d => d.k > 0 && d.p > 0);

    // Dynamic global minimum calculation to avoid clipping structural heavy tails
    const globalMinP = Math.min(
        d3.min(ccdfReal, d => d.p) || 0.001,
        d3.min(ccdfErdos, d => d.p) || 0.001,
        d3.min(ccdfConfig, d => d.p) || 0.001
    );

    const x = d3.scaleLog().domain([1, d3.max(ccdfReal, d => d.k) || 30]).range([0, width]);
    const y = d3.scaleLog().domain([globalMinP, 1]).range([height, 0]);

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
export function drawBenchmarkBarChart(selector, dataset, yLabel) {
    const container = d3.select(selector);
    const w = container.node().getBoundingClientRect().width - 10,
        h = container.node().getBoundingClientRect().height || 180;
    const margin = {top: 20, right: 20, bottom: 35, left: 65},
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", w).attr("height", h).append("g").attr("transform",
        `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(dataset.map(d => d.model)).range([0, width]).padding(0.45);
    const y = d3.scaleLinear().domain([0, Math.max(d3.max(dataset, d => d.val) * 1.2, 0.01)]).range([height, 0]);

    setupBaseAxes(svg, x, y, height, width, "Topological Target Space", yLabel);

    svg.selectAll("rect")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("x", d => x(d.model))
        .attr("y", d => y(d.val))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.val))
        .style("fill", d => d.color)
        .style("opacity", 0.85)
        .attr("rx", 2);

    svg.selectAll(".bar-label")
        .data(dataset)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.model) + x.bandwidth() / 2)
        .attr("y", d => y(d.val) - 6)
        .attr("text-anchor", "middle")
        .style("fill", "#797b93")
        .style("font-size", "9px")
        .style("font-weight", "500")
        .text(d => {
            if (yLabel && (yLabel.includes("Clustering") || yLabel.includes("%"))) {
                return (d.val * 100).toFixed(2) + "%";
            }
            return d.val % 1 === 0 ? d.val : d.val.toFixed(4);
        });
}