# Network Science Analysis & Interactive Visualization

## Cora Citation Network

An advanced **Network Science and Graph Analytics platform** for the structural, categorical, and dynamic study of the **Cora citation network**. The project integrates rigorous statistical analysis with topological null models and a high-performance interactive dashboard built using **D3.js** and **HTML5 Canvas**.

---

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![D3.js](https://img.shields.io/badge/D3.js-v7-orange.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)

---

## Key Features

### 1. Advanced Topology & Degree Distribution Analysis

* Heavy-tail characterization using PMF and CCDF on log-log scales.
* Benchmarking against null models:

  * Erdős–Rényi ( G(N,p) )
  * Configuration Model
* Joint degree analysis (k_{in}) vs (k_{out}) with Gaussian jittering and alpha blending.

---

### 2. Homophily & Categorical Mixing

* Categorical assortativity matrix for citation behavior across disciplines.
* Homophily statistical testing against randomized baseline (2pq).

---

### 3. High-Performance Interactive Visualization

* Hybrid D3.js + Canvas rendering engine.
* Velocity-Verlet physics-based layout simulation.
* Advanced interaction system:

  * Zoom and pan
  * Node dragging
  * Multi-touch event handling
* Visual encoding:

  * Node size ∝ In-Degree
  * Node color ∝ community assignment

---

### 4. Dynamic Simulations (SIR Model)

* Susceptible–Infected–Recovered model for information diffusion.
* Comparison between hub-based and random seed strategies.
* Study of diffusion constraints in modular networks.

---

## Dashboard Overview

1. In-Degree Distribution (heavy-tail, top 99th percentile hubs)
2. Out-Degree Distribution (bounded bibliographic structure)
3. Categorical assortativity analysis
4. Clustering and triadic closure validation

---

## Technology Stack

* Backend: Python (NetworkX, NumPy, SciPy, Pandas)
* Frontend: D3.js v7, HTML5 Canvas
* UI: TailwindCSS / Cyberpunk Dark Theme

---

## Installation & Usage

### Data preprocessing (optional)

```bash
pip install networkx numpy pandas scipy
python preprocess_cora.py
```

### Launch local server

Python:

```bash
python -m http.server 8000
```

Node.js:

```bash
npm install -g local-server
local-server
```

Open in browser:

```
http://localhost:8000
```

---

## Scientific Results

* Strong structural asymmetry between In-Degree and Out-Degree:

  * Out-Degree: bounded by citation conventions
  * In-Degree: emergent scale-free preferential attachment

* High modularity:
  [
  Q = 0.8147
  ]

### SIR Diffusion Dynamics

* Hub nodes accelerate early-stage diffusion
* Community structure strongly limits global propagation

---

## License

MIT License
