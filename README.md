# Dynamo — Adaptive Runtime Platform

Dynamo is an intelligent runtime platform that dynamically generates and adapts web application UIs and workflows from declarative JSON configurations. Instead of shipping static software, teams define **what** they want — entities, forms, workflows, permissions — and the platform renders the experience, tracks real user behaviour, and lets an AI layer propose UI/workflow improvements that can be previewed and deployed with a single click.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │  :5173
│  Adaptive Engine • Workflow Router       │
│  Telemetry SDK • Mutations Inbox         │
└────────────────┬────────────────────────┘
                 │ REST
       ┌─────────┴──────────┐
       │                    │
┌──────▼──────┐    ┌────────▼────────┐
│Control Plane│    │ Event Gateway   │  :3002
│ Node/Express│    │ Telemetry +     │
│   :3001     │    │ Mock API        │
│  SQLite DB  │    │ (in-memory)     │
└─────────────┘    └─────────────────┘
```

## Services

| Service | Port | Description |
|---|---|---|
| `frontend` | 5173 | Adaptive React UI engine |
| `control-plane` | 3001 | App config CRUD + Mutations API |
| `event-gateway` | 3002 | Telemetry ingestion + Mock REST API |

## Quickstart

```bash
# 1. Install all dependencies
npm install
cd frontend && npm install && cd ..
cd control-plane && npm install && cd ..
cd event-gateway && npm install && cd ..

# 2. Seed the demo app
npm run seed

# 3. Start all three services
npm run dev
```

Then open **http://localhost:5173**.

## Key Concepts

- **Declarative App Config** — every app is a JSON document describing UI views, workflow routing, and API bindings. No code is touched to change the app.
- **Mutations** — AI (or a human) submits a JSON Patch against the config. It is stored as a pending "Mutation Request."
- **Shadow Preview** — admins can preview exactly what the UI would look like after a mutation before approving it.
- **Approve & Deploy** — clicking Approve atomically applies the patch, increments the version, and immediately updates the live frontend.
- **Telemetry SDK** — every click, navigation, form interaction, and API error is captured and sent to the Event Gateway for future analytics.

## Roadmap

| Phase | Status |
|---|---|
| Phase 1: Static Declarative UI Engine | ✅ Complete |
| Phase 2: Behavioral Analytics & Observability | 🔄 In Progress |
| Phase 3: AI Recommendation System | 🔜 Planned |
| Phase 4: Controlled UI Mutation (Full Autonomy) | 🔜 Planned |
