const svg = d3.select("svg"),
      width = window.innerWidth,
      height = window.innerHeight;

// Configurazione Zoom globale
const zoomLayer = svg.append("g");
svg.call(d3.zoom().scaleExtent([0.05, 10]).on("zoom", (event) => {
    zoomLayer.attr("transform", event.transform);
}));

// Scale dei colori per Field e Community
const colorField = d3.scaleOrdinal(d3.schemeCategory10);
const colorComm = d3.scaleOrdinal(d3.schemeDark2);

let allNodes = [], allLinks = [];
let currentFilterDegree = 0;
let currentColorMode = "field";
let currentBridgeMode = "all";

// Caricamento Dati asincrono dal JSON esterno
d3.json("cora_d3_data.json").then(data => {
    allNodes = data.nodes;
    allLinks = data.links;

    // Inizializzazione della Legenda basata sui Field di default
    updateLegend();

    // Creazione Forze della Simulazione Fisica
    const simulation = d3.forceSimulation(allNodes)
        .force("link", d3.forceLink(allLinks).id(d => d.id).distance(35))
        .force("charge", d3.forceManyBody().strength(-20))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.pagerank * 1200) + 4));

    // Elementi DOM degli Archi
    const linkGroup = zoomLayer.append("g");
    let link = linkGroup.selectAll("line");

    // Elementi DOM dei Nodi
    const nodeGroup = zoomLayer.append("g");
    let node = nodeGroup.selectAll("circle");

    // Funzione di aggiornamento grafico dei dati (Data Binding)
    function updateGraph() {
        // Filtriamo i nodi in base allo slider
        const visibleNodes = allNodes.filter(n => n.in_degree >= currentFilterDegree);
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

        // Teniamo solo gli archi i cui nodi estremi sono entrambi visibili
        const visibleLinks = allLinks.filter(l =>
            visibleNodeIds.has(typeof l.source === "object" ? l.source.id : l.source) &&
            visibleNodeIds.has(typeof l.target === "object" ? l.target.id : l.target)
        );

        // Update Archi
        link = link.data(visibleLinks, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
            .join("line")
            .attr("class", d => `link ${d.is_local_bridge ? 'bridge' : ''}`)
            .attr("stroke", d => {
                if (currentBridgeMode === "bridges") {
                    return d.is_local_bridge ? "#ef4444" : "#3f3f46";
                }
                return "#71717a";
            })
            .attr("stroke-opacity", d => {
                if (currentBridgeMode === "bridges") {
                    return d.is_local_bridge ? 0.9 : 0.08;
                }
                return 0.25;
            });

        // Update Nodi
        node = node.data(visibleNodes, d => d.id)
            .join("circle")
            .attr("class", "node")
            // Raggio proporzionale al PageRank (Visual encoding dell'importanza qualitativa)
            .attr("r", d => Math.sqrt(d.pagerank * 1500) + 3.5)
            .attr("fill", d => currentColorMode === "field" ? colorField(d.field) : colorComm(d.community))
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Gestione Interattività Hover (Tooltip)
        const tooltip = d3.select("#tooltip");
        node.on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                   .html(`<strong>Paper ID:</strong> ${d.id}<br>
                          <strong>Field (GT):</strong> ${d.field}<br>
                          <strong>Louvain Comm ID:</strong> ${d.community}<br>
                          <strong>Citations (In-Degree):</strong> ${d.in_degree}<br>
                          <strong>PageRank Score:</strong> ${d.pagerank.toFixed(5)}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY + 12) + "px")
                   .style("left", (event.pageX + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

        // Riavvia la simulazione sui dati aggiornati dal filtro
        simulation.nodes(visibleNodes);
        simulation.force("link").links(visibleLinks);
        simulation.alpha(0.2).restart();
    }

    // Collegamento della fisica al movimento dei nodi nel tempo (Tick)
    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    // --- GESTIONE EVENTI E FILTRI ---

    // Cambia modalità colore (Field vs Louvain)
    d3.select("#color-mode").on("change", function() {
        currentColorMode = this.value;
        updateLegend();
        updateGraph();
    });

    // Slider del grado
    d3.select("#degree-slider").on("input", function() {
        currentFilterDegree = +this.value;
        d3.select("#degree-label").text(`Min Citations (In-Degree): ${currentFilterDegree}`);
        updateGraph();
    });

    // Evidenziatore Local Bridges
    d3.select("#bridge-mode").on("change", function() {
        currentBridgeMode = this.value;
        updateGraph();
    });

    // Popolamento e gestione interattiva della legenda (Effetto Omofilia)
    function updateLegend() {
        const legendContainer = d3.select("#legend").html("");

        if (currentColorMode === "field") {
            const fields = Array.from(new Set(allNodes.map(d => d.field))).sort();
            fields.forEach(f => {
                createLegendItem(legendContainer, f, colorField(f), "field", f);
            });
        } else {
            const comms = Array.from(new Set(allNodes.map(d => d.community))).sort((a,b)=>a-b).slice(0, 15); // Limita visivamente
            comms.forEach(c => {
                createLegendItem(legendContainer, `Community ${c}`, colorComm(c), "community", c);
            });
        }
    }

    function createLegendItem(container, labelText, color, type, value) {
        const item = container.append("div").attr("class", "legend-item").html(`
            <div class="legend-color" style="background: ${color}"></div>
            <span>${labelText}</span>
        `);

        // Effetto isolamento al passaggio del mouse sulla legenda (Dimostra i Silos della Domanda 3)
        item.on("mouseover", () => {
            node.style("opacity", d => (type === "field" ? d.field : d.community) === value ? 1 : 0.08);
            link.style("opacity", d => {
                const sourceVal = type === "field" ? d.source.field : d.source.community;
                const targetVal = type === "field" ? d.target.field : d.target.community;
                return (sourceVal === value && targetVal === value) ? 0.4 : 0.02;
            });
        })
        .on("mouseout", () => {
            node.style("opacity", 1);
            link.style("opacity", null);
        });
    }

    // Funzioni di Dragging standard per i nodi
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.2).restart();
        d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
    }

    // Primo avvio del grafo
    updateGraph();
});