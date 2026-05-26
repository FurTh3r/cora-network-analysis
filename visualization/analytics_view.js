/**
 * ============================================================================
 * STATISTICAL DASHBOARDS & D3 CHARTS ENGINE
 * ============================================================================
 */
import {appState} from './state.js';
import {
    drawBenchmarkBarChart,
    drawCategoricalAssortativity,
    drawCCDFLogLog,
    drawCenteredPMF,
    drawCrossVsExpected,
    drawErdosOutCCDF,
    drawExtendedCCDF,
    drawJointDegreeScatter,
    drawLogLogPMF,
    drawReadableMixingMatrix,
    drawRealVsErdosPercentile,
    drawTop10Horizontal,
    drawTripleCCDF
} from "./plothandler.js";

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
    const targets = ["#canvas0", "#canvas1", "#canvas2",
        "#canvas3"];
    targets.forEach(t => d3.select(t).selectAll("svg").remove());

    const data = appState.globalNetworkData;
    if (!data) return;

    // Selectors based on .chart-card in CSS
    const cards = Array.from(document.querySelectorAll('.chart-card'));
    if (cards.length < 4) return;

    // Dynamic configuration of the titles and content
    if (viewName === 'In-Degree Structural Analysis') {
        // Configuring the window titles
        configureCardHeader(cards[0], "In-Degree PMF (Log-Log Range)",
            "Resolution for Scale-Free Distribution");
        configureCardHeader(cards[1], "In-Degree CCDF Tail", "Empirical Cumulative Heavy-Tail Density");
        configureCardHeader(cards[2], "Empirical Cora vs Erdos-Renyi G(n,p)",
            "Poisson Model Divergence & Percentile Bounds");
        configureCardHeader(cards[3], "Top 10 Highest In-Degree Hubs", "Horizontal Ranking Analysis");

        // Adding the actual content to the windows
        setTimeout(() => {
            drawLogLogPMF("#canvas0", data.nodes, "in_deg", "#4facfe",
                "In-Degree (k)", "Probability P(k)");
            drawCCDFLogLog("#canvas1", data.ccdf_in, "#4facfe",
                "In-Degree (k)", "P(K ≥ k)");
            drawRealVsErdosPercentile("#canvas2", data, "#4facfe");
            drawTop10Horizontal("#canvas3", data.nodes, "in_deg", "#4facfe");
        }, 30);

    } else if (viewName === 'Out-Degree Structural Analysis') {
        // Configuring the window titles
        configureCardHeader(cards[0], "Out-Degree PMF", "Discrete Symmetrical Target Metric");
        configureCardHeader(cards[1], "Out-Degree CCDF (Extended Range)",
            "Light-Tail Structural Compaction");
        configureCardHeader(cards[2], "Joint Degree Scatterplot",
            "In-Degree vs Out-Degree Correlation Profiles");
        configureCardHeader(cards[3], "Out-Degree Erdos-Renyi CCDF Validation",
            "Theoretical Poisson Edge Limits");

        // Adding the actual content to the windows
        setTimeout(() => {
            drawCenteredPMF("#canvas0", data.nodes, "out_deg", "#00ff87");
            drawExtendedCCDF("#canvas1", data.ccdf_out, "#00ff87");
            drawJointDegreeScatter("#canvas2", data.nodes);
            drawErdosOutCCDF("#canvas3", data.mean_out, "#00ff87");
        }, 30);

    } else if (viewName === 'Homophily & Mixing Matrix') {
        // Configuring the window titles
        configureCardHeader(cards[0], "Mixing Matrix Probabilities",
            "Categorical Link Transition Density");
        configureCardHeader(cards[1], "Neighborhood Class Dispersal Spectrum", "Neighbor Homogeneity Variant");
        configureCardHeader(cards[2], "Structural Class Assortativity",
            "Inter-Group Categorical Connection Matrix");
        configureCardHeader(cards[3], "Observed Cross-Group Edges vs Null Model (2pq)",
            "Homophily Metric Boundary Check");


        // Adding the actual content to the windows
        setTimeout(() => {
            drawReadableMixingMatrix("#canvas0", data.mixing_matrix);
            drawTop10Horizontal("#canvas1", data.nodes, "in_deg", "#4facfe");
            drawCategoricalAssortativity("#canvas2", data);
            drawCrossVsExpected("#canvas3", data);
        }, 30);

    } else if (viewName === 'Benchmark Models Alignment') {
        // Configuring the window titles
        configureCardHeader(cards[0], "Multi-Model CCDF Convergence",
            "Cora vs Erdos-Renyi vs Configuration Model");
        configureCardHeader(cards[1], "Average Clustering Coefficient Metrics",
            "Local Dense Triad Cohesion Spectrum");
        configureCardHeader(cards[2], "Network Transitivity Bounds",
            "Global Fractional Closed Triangles");
        configureCardHeader(cards[3], "Global Reciprocity Levels",
            "Directed Mutuality Coefficient Benchmarks");

        // Adding the actual content to the windows
        setTimeout(() => {
            drawTripleCCDF("#canvas0", data);

            drawBenchmarkBarChart("#canvas1", [
                {model: "Empirical Cora", val: data.benchmark_metrics.cora_clustering || "N/A", color: "#00ff87"},
                {model: "Erdos G(n,p)", val: data.benchmark_metrics.erdos_clustering || "N/A", color: "#797b93"},
                {model: "Config. Model", val: data.benchmark_metrics.config_clustering || "N/A", color: "#ff4da6"}
            ], "Clustering Coeff.");

            drawBenchmarkBarChart("#canvas2", [
                {model: "Empirical Cora", val: data.benchmark_metrics.cora_transitivity || "N/A", color: "#00f2fe"},
                {model: "Erdos G(n,p)", val: data.benchmark_metrics.erdos_transitivity || "N/A", color: "#797b93"},
                {model: "Config. Model", val: data.benchmark_metrics.config_transitivity || "N/A", color: "#ff4da6"}
            ], "Global Transitivity");

            drawBenchmarkBarChart("#canvas3", [
                {model: "Empirical Cora", val: data.benchmark_metrics.cora_reciprocity || "N/A", color: "#b337ff"},
                {model: "Erdos G(n,p)", val: data.benchmark_metrics.erdos_reciprocity || "N/A", color: "#797b93"},
                {model: "Config. Model", val: data.benchmark_metrics.config_reciprocity || "N/A", color: "#ff4da6"}
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
