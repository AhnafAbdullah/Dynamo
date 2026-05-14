import os
import time
import requests
import json
import uuid

CONTROL_PLANE_URL = os.getenv("CONTROL_PLANE_URL", "http://localhost:3001")
EVENT_GATEWAY_URL = os.getenv("EVENT_GATEWAY_URL", "http://localhost:3002")
APP_ID = "app-demo-001"

def fetch_telemetry():
    print("Gathering telemetry data from Event Gateway...")
    try:
        # Get navigation flows
        flow_res = requests.get(f"{EVENT_GATEWAY_URL}/analytics/navigation-flow?app_id={APP_ID}")
        flows = flow_res.json().get("flows", [])
        
        # Get form stats
        form_res = requests.get(f"{EVENT_GATEWAY_URL}/analytics/form-stats?app_id={APP_ID}")
        form_stats = form_res.json()
        
        return {
            "flows": flows,
            "form_stats": form_stats
        }
    except Exception as e:
        print(f"Error fetching telemetry: {e}")
        return None

def fetch_current_config():
    print("Fetching current UI declarative config...")
    try:
        res = requests.get(f"{CONTROL_PLANE_URL}/api/apps/{APP_ID}")
        return res.json().get("config")
    except Exception as e:
        print(f"Error fetching config: {e}")
        return None

def analyze_and_generate_mutation(telemetry, config):
    print("Analyzing behavioral graph and simulating LLM inference...")
    
    # 1. Analyze abandonment
    abandonment_rate = float(telemetry["form_stats"].get("abandonment_rate", 0))
    
    # 2. Analyze top paths
    flows = telemetry["flows"]
    dashboard_to_invoices = next((f for f in flows if f["path"] == "view-dashboard → view-invoices"), None)
    
    patch = []
    title = "AI Recommended UI Optimization"
    description = ""
    
    # In a real system, an LLM (Claude/GPT-4) would generate this JSON Patch based on the schema and data.
    # Here we simulate the LLM's deterministic output based on the telemetry rules.
    
    if abandonment_rate > 20:
        # Simulated LLM intent: "Form abandonment is high. We should simplify the New Invoice form."
        description += f"High form abandonment detected ({abandonment_rate}%). Suggesting simplification of the 'New Invoice' form. "
        
        # Find the form in the config to generate a valid JSON patch path
        # Assuming view-new-invoice has a Form component
        view_idx = next((i for i, v in enumerate(config["ui"]["views"]) if v["id"] == "view-new-invoice"), None)
        if view_idx is not None:
            comp_idx = next((i for i, c in enumerate(config["ui"]["views"][view_idx]["components"]) if c["type"] == "Form"), None)
            if comp_idx is not None:
                # We will remove the 'notes' field to simplify it
                fields = config["ui"]["views"][view_idx]["components"][comp_idx]["fields"]
                notes_idx = next((i for i, f in enumerate(fields) if f.get("key") == "notes"), None)
                if notes_idx is not None:
                    patch.append({
                        "op": "remove",
                        "path": f"/ui/views/{view_idx}/components/{comp_idx}/fields/{notes_idx}"
                    })
                    description += "Removed the 'notes' field to reduce cognitive load. "
                    title = "Simplify New Invoice Form"

    if not patch and dashboard_to_invoices and dashboard_to_invoices["count"] > 10:
        # Simulated LLM intent: "Users frequently navigate from Dashboard to Invoices. Let's add a shortcut."
        description += "Users frequently navigate from Dashboard directly to Invoices. Suggesting a Quick Action shortcut on the Dashboard. "
        view_idx = next((i for i, v in enumerate(config["ui"]["views"]) if v["id"] == "view-dashboard"), None)
        if view_idx is not None:
            # Let's add a button or something, or perhaps just change the title as a simple patch
            patch.append({
                "op": "replace",
                "path": f"/ui/views/{view_idx}/title",
                "value": "Overview & Quick Actions"
            })
            title = "Add Quick Actions to Dashboard"
            
    if not patch:
        # Fallback generic mutation
        view_idx = next((i for i, v in enumerate(config["ui"]["views"]) if v["id"] == "view-invoices"), None)
        if view_idx is not None:
            patch.append({
                "op": "add",
                "path": f"/ui/views/{view_idx}/components/0/columns/-",
                "value": { "key": "notes", "label": "Notes", "type": "text" }
            })
            title = "Enhance Invoices Table"
            description = "Added Notes column to the Invoices table to provide more context at a glance."

    return {
        "title": title,
        "description": description,
        "patch": patch
    }

def submit_mutation(mutation):
    print(f"Submitting Mutation: {mutation['title']}")
    try:
        res = requests.post(f"{CONTROL_PLANE_URL}/api/apps/{APP_ID}/mutations", json={
            "title": mutation["title"],
            "description": mutation["description"],
            "patch": mutation["patch"],
            "source": "intelligence-service"
        })
        if res.status_code == 201:
            print(f"Success: Mutation submitted successfully. ID: {res.json()['mutation_id']}")
        else:
            print(f"Failed to submit mutation: {res.text}")
    except Exception as e:
        print(f"Error submitting mutation: {e}")

def run():
    print("--- Dynamo Intelligence Service ---")
    telemetry = fetch_telemetry()
    if not telemetry:
        return
        
    config = fetch_current_config()
    if not config:
        return
        
    # In a real daemon, this would loop or consume a Kafka queue.
    # For Phase 3, we run it as a batch cron job.
    mutation = analyze_and_generate_mutation(telemetry, config)
    
    if mutation["patch"]:
        submit_mutation(mutation)
    else:
        print("No significant adaptations recommended at this time.")

if __name__ == "__main__":
    run()
