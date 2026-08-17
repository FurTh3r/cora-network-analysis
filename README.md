# Cora Citation Network Analysis

A network-science study of the Cora citation dataset, combining a reproducible Jupyter analysis with an interactive D3.js and HTML5 Canvas dashboard.

The project investigates degree structure, centrality, categorical mixing, communities, connectivity, weak ties, and information diffusion across a directed academic citation network.

## Research Questions

The notebook is organized around five questions:

1. Is academic influence broadly distributed or concentrated among a small set of papers?
2. How do high-impact papers and literature surveys differ structurally?
3. Do research topics form isolated citation silos?
4. Which connections allow information to cross community boundaries?
5. How does a simulated innovation diffuse through the network?

## Analysis

The Python notebook includes:

- directed graph construction from cora.cites and cora.content;
- in-degree and out-degree distributions, PMF, and CCDF analysis;
- PageRank and HITS centrality;
- Erdős–Rényi and configuration-model comparisons;
- categorical assortativity and mixing matrices;
- strongly and weakly connected components;
- reciprocity, path length, and clustering;
- Louvain community detection;
- betweenness and neighborhood-overlap analysis;
- SIR diffusion experiments;
- export of dashboard-ready JSON data.

## Interactive Dashboard

The browser visualization provides:

- force-directed, radial, and hierarchical layouts;
- zooming, panning, dragging, search, and hover details;
- Louvain community, HITS, weak-tie, and component views;
- SIR diffusion playback;
- statistical dashboards for degree distributions, homophily, and benchmark models.

D3.js v7 is loaded from its public CDN, while the graph itself is rendered on HTML5 Canvas for responsiveness.

## Requirements

- Python 3;
- Jupyter Notebook or JupyterLab;
- the dependencies listed in requirements.txt;
- a modern browser;
- an internet connection when loading D3.js from the CDN.

Install the Python environment with:

    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    pip install jupyter

The requirements file currently contains sns, which is not the package imported by the notebook. If installation fails on that entry, remove it; seaborn is already listed separately.

## Running the Analysis

Start Jupyter from the repository root:

    jupyter notebook labnotebook.ipynb

Run the cells in order. The notebook reads the files under data/ and generates the JSON payload used by the web dashboard.

## Running the Dashboard

The dashboard expects cora_visualization_data.json in the repository root. Generate that file through the notebook before starting the server.

Serve the repository root:

    python3 -m http.server 8000

Then open:

    http://localhost:8000/visualization/

Opening visualization/index.html directly from the filesystem will not work reliably because the dashboard fetches JSON and uses JavaScript modules.

## Dataset

The bundled Cora dataset contains scientific publications, their subject classes, and directed citation relationships:

- data/cora.content — paper identifiers, binary word attributes, and class labels;
- data/cora.cites — citation edges;
- data/README — original dataset notes.

## Repository Structure

    .
    ├── data/
    │   ├── cora.cites
    │   ├── cora.content
    │   └── README
    ├── images/
    ├── visualization/
    │   ├── index.html
    │   ├── main.js
    │   ├── graph_view.js
    │   ├── analytics_view.js
    │   ├── state.js
    │   ├── plothandler.js
    │   └── style.css
    ├── labnotebook.ipynb
    └── requirements.txt

## Author

**Lorenzo Pasini** — [FurTh3r](https://github.com/FurTh3r)

## License

No license file is currently included in this repository. Unless otherwise stated by the author, all rights are reserved.
