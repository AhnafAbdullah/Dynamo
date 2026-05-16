# Dynamo: Adaptive Runtime Platform

Dynamo is an experimental **Adaptive Runtime Software Platform**. It explores a novel software paradigm where applications are not hardcoded, but instead exist as declarative metadata. This allows the platform to continuously monitor user behavior, infer intent, and autonomously propose or apply UI and workflow improvements—all while maintaining strict safety boundaries.

Instead of an AI randomly editing raw source code, Dynamo acts as a managed runtime ecosystem where all customer applications are defined by JSON configurations and JSON Patches.

## 🌟 Core Philosophy

1. **Declarative Infrastructure**: The UI is entirely generated at runtime from a central JSON configuration.
2. **Behavioral Observability**: Every click, navigation, and form interaction is ingested by a telemetry system.
3. **Intent Inference**: An Intelligence Service analyzes the behavioral graph to find friction points (e.g., high form abandonment, inefficient multi-step workflows).
4. **Controlled Mutation**: The AI proposes non-destructive `JSON Patches`. Admins can shadow-preview these changes, run them as A/B experiments, and seamlessly deploy them.

---

## 🏗️ Architecture & Features

The Dynamo monorepo consists of four main components representing the progressive phases of an adaptive system:

### 1. Control Plane (`/control-plane`)
A Node.js/Express service backed by SQLite. It acts as the source of truth for the platform, storing:
- Declarative Application Configurations (JSON).
- The `Mutations` inbox where AI-generated `JSON Patches` await review.
- App Versioning and History.

### 2. UI Rendering Engine (`/frontend`)
A React (Vite) application that dynamically renders the application UI based on the metadata from the Control Plane.
- Includes the **Telemetry SDK**, which seamlessly tracks user sessions and interactions.
- Has a built-in **ConfigLoader** that dynamically applies A/B Experiment JSON Patches directly in the browser via deterministic session hashing.
- Contains the **AI Mutations Inbox** and **Behavioral Analytics Dashboard** for admins.

### 3. Event Gateway (`/event-gateway`)
A dedicated Node.js service that acts as the telemetry ingest pipeline.
- Uses a high-performance SQLite database (`events.db`) to log raw behavioral data.
- Exposes aggregated analytics endpoints (Navigation Flows, Session Tracking, Form Drop-offs) for the frontend dashboard and the AI engine.

### 4. Intelligence Service (`/intelligence-service`)
A Python daemon that acts as the analytical brain of the platform.
- Pulls telemetry from the Event Gateway.
- Uses intelligent heuristics (simulating an LLM) to analyze abandonment and workflow sequences.
- Generates precise, RFC-6902 compliant `JSON Patches` that are pushed to the Control Plane as pending mutations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Installation
From the root of the repository, install the dependencies for all services:

```bash
# Install root orchestrator dependencies
npm install

# Install Control Plane dependencies
cd control-plane
npm install

# Install Event Gateway dependencies
cd ../event-gateway
npm install

# Install Frontend dependencies
cd ../frontend
npm install

# Install Intelligence Service dependencies
cd ../intelligence-service
pip install -r requirements.txt
```

### Running the Platform

Dynamo uses `npm-run-all` to launch the core stack concurrently. From the root directory:

```bash
npm run dev
```

This starts:
- **Control Plane API**: `http://localhost:3001`
- **Event Gateway**: `http://localhost:3002`
- **Frontend UI**: `http://localhost:5173`

*(Note: The Control Plane will automatically seed the database with a Demo Application when first run).*

### Triggering the AI Intelligence Engine

To simulate the AI analyzing user behavior and generating a UI mutation:

1. Interact with the application on `http://localhost:5173` (e.g., generate demo events in the Analytics dashboard).
2. Run the Intelligence Service:
   ```bash
   cd intelligence-service
   python main.py
   ```
3. Return to the web app and navigate to the **AI Inbox**. You will see a new pending UI optimization.
4. Click **Start A/B Experiment** to deploy it to 50% of sessions, or **Shadow Preview** to see the raw diff.

### 🌐 External Website Integration (Visual Optimizer)

Dynamo is no longer limited to declarative internal apps. You can run Dynamo as a drop-in **Visual Optimizer Snippet** on any existing external client website (e.g., Shopify, WordPress).

1. **Build the Standalone SDK:**
   ```bash
   cd sdk
   npm run build
   ```
   This compiles the engine into a tiny, standalone `dist/dynamo.min.js`.

2. **Inject the Script:**
   Provide this snippet to the client to paste into the `<head>` of their website:
   ```html
   <script src="https://your-cdn.com/dynamo.min.js" data-app-id="app-client-123"></script>
   ```

3. **How it Works:**
   - The snippet autonomously tracks clicks, navigation, and form submissions on the external site.
   - The Intelligence Service (`style_analyzer.py`) processes this telemetry to generate dazzling UI upgrades (raw CSS/JS injections).
   - Once approved by an Admin in the Control Plane, the SDK automatically pulls and applies the visual mutations directly onto the client's live DOM.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Zustand, TailwindCSS / Custom CSS Tokens, Lucide Icons
- **Backend / APIs**: Node.js, Express
- **Databases**: Better-SQLite3
- **Intelligence Layer**: Python, Requests
- **Data Mutability**: fast-json-patch, DOM Injection

