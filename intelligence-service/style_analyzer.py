import os
import requests
import json
import uuid
import random

CONTROL_PLANE_URL = os.environ.get("CONTROL_PLANE_URL", "http://localhost:3001")
APP_ID = os.environ.get("APP_ID", "app-demo-001")

def fetch_current_config():
    """Simulates the module scanning the target website's UI/styles."""
    print(f"Analyzing visual aesthetics for app: {APP_ID}...")
    try:
        resp = requests.get(f"{CONTROL_PLANE_URL}/api/apps/{APP_ID}")
        resp.raise_for_status()
        return resp.json()["config"]
    except Exception as e:
        print(f"Error fetching config: {e}")
        return None

STYLES = {
    "Glassmorphism": {
        "title": "Aesthetic Upgrade: Dazzling Glassmorphism",
        "description": "Applies a stunning glassmorphism effect, animated gradient buttons, and mouse-tracking glows to all cards. Perfect for a premium, modern feel.",
        "css": """
/* 🌟 Dazzling UI Upgrade 🌟 */
body {
  background: radial-gradient(circle at 10% 20%, rgb(14, 18, 38) 0%, rgb(5, 7, 15) 100%) !important;
  color: #fff !important;
}

.stat-card, .card, .table-container, .detail-card, .sidebar, .topbar {
  background: rgba(22, 27, 40, 0.45) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}

.stat-card:hover, .card:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 12px 40px 0 rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(99, 179, 237, 0.6) !important;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
  color: white !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4) !important;
  transition: all 0.3s ease !important;
}

.btn-primary:hover {
  transform: scale(1.05) !important;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6) !important;
}
""",
        "js": """
console.log("✨ Dazzling UI JS Executing...");
document.querySelectorAll('.stat-card, .card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.06) 0%, rgba(22,27,40,0.45) 40%)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = 'rgba(22, 27, 40, 0.45)';
  });
});
"""
    },
    "MinimalistLight": {
        "title": "Aesthetic Upgrade: Clean Minimalist M3",
        "description": "Applies a bright, airy, modern light theme with soft shadows, high contrast text, and rounded corners inspired by Material Design 3.",
        "css": """
/* 🍃 Minimalist Light Mode 🍃 */
body {
  background: #f8fafc !important;
  color: #0f172a !important;
}

.stat-card, .card, .table-container, .detail-card, .sidebar, .topbar {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
  border-radius: 16px !important;
  color: #1e293b !important;
}

.stat-card h3, .card h3, .sidebar-nav-item, td, th {
  color: #334155 !important;
}

.stat-card .value {
  color: #0f172a !important;
}

.btn-primary {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 9999px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1) !important;
  transition: background 0.2s ease !important;
}

.btn-primary:hover {
  background: #334155 !important;
}

table th {
  background-color: #f1f5f9 !important;
  color: #475569 !important;
}
table tr {
  border-bottom: 1px solid #e2e8f0 !important;
}
table tr:hover {
  background-color: #f8fafc !important;
}
""",
        "js": """
console.log("🍃 Minimalist UI JS Executing...");
"""
    },
    "NeoBrutalism": {
        "title": "Aesthetic Upgrade: Neo-Brutalism",
        "description": "A striking neo-brutalist design with high contrast, bold black borders, harsh shadows, and vibrant flat colors. Perfect for a trendy, unapologetic look.",
        "css": """
/* 🟨 Neo-Brutalism 🟨 */
body {
  background: #fdf3e7 !important;
  color: #000 !important;
  font-family: 'Courier New', Courier, monospace !important;
}

.stat-card, .card, .table-container, .detail-card, .sidebar, .topbar {
  background: #ffffff !important;
  border: 3px solid #000000 !important;
  box-shadow: 6px 6px 0px #000000 !important;
  border-radius: 0 !important;
  transition: transform 0.1s, box-shadow 0.1s !important;
  color: #000 !important;
}

.stat-card:hover, .card:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: 4px 4px 0px #000000 !important;
}

.btn-primary {
  background: #ff5252 !important;
  color: #000 !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0px #000 !important;
  border-radius: 0 !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
}

.btn-primary:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0px #000 !important;
  background: #ff7676 !important;
}

.sidebar {
  background: #ffd54f !important;
}

.topbar {
  background: #4fc3f7 !important;
}

table th {
  background-color: #000 !important;
  color: #fff !important;
  border: 1px solid #000 !important;
}
table td {
  border: 1px solid #000 !important;
  color: #000 !important;
}
""",
        "js": """
console.log("🟨 Neo-Brutalism UI JS Executing...");
// Add a fun click effect
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('button, a, .stat-card, .card')) {
    e.target.style.transform = 'translate(4px, 4px)';
    e.target.style.boxShadow = '2px 2px 0px #000';
  }
});
document.addEventListener('mouseup', (e) => {
  if (e.target.closest('button, a, .stat-card, .card')) {
    e.target.style.transform = '';
    e.target.style.boxShadow = '';
  }
});
"""
    },
    "Cyberpunk": {
        "title": "Aesthetic Upgrade: Cyberpunk Neon",
        "description": "A dark, gritty cyberpunk theme with neon glows, high contrast accents, and a futuristic vibe.",
        "css": """
/* 👾 Cyberpunk Neon 👾 */
body {
  background: #0d0221 !important;
  color: #0ff !important;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
}

.stat-card, .card, .table-container, .detail-card, .sidebar, .topbar {
  background: #11001c !important;
  border: 1px solid #ff003c !important;
  box-shadow: 0 0 10px rgba(255, 0, 60, 0.5), inset 0 0 10px rgba(255, 0, 60, 0.2) !important;
  border-radius: 0 !important;
  color: #0ff !important;
}

.stat-card h3, .card h3 {
  color: #ff003c !important;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.stat-card .value {
  color: #0ff !important;
  text-shadow: 0 0 5px #0ff;
}

.btn-primary {
  background: transparent !important;
  color: #ff003c !important;
  border: 2px solid #ff003c !important;
  box-shadow: 0 0 10px #ff003c, inset 0 0 5px #ff003c !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
  letter-spacing: 1px !important;
  border-radius: 0 !important;
  transition: all 0.2s !important;
}

.btn-primary:hover {
  background: #ff003c !important;
  color: #000 !important;
  box-shadow: 0 0 20px #ff003c, inset 0 0 10px #ff003c !important;
}

table th {
  background-color: #2a0035 !important;
  color: #ff003c !important;
  border-bottom: 2px solid #0ff !important;
}
table td {
  border-bottom: 1px solid #2a0035 !important;
}
table tr:hover {
  background-color: rgba(0, 255, 255, 0.1) !important;
}
""",
        "js": """
console.log("👾 Cyberpunk UI JS Executing...");
// Glitch effect on hover
document.querySelectorAll('.btn-primary, .sidebar-nav-item').forEach(el => {
  el.addEventListener('mouseover', () => {
    el.style.transform = `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`;
    setTimeout(() => el.style.transform = 'none', 100);
  });
});
"""
    }
}

def analyze_and_decide_style(config_data):
    """
    Simulates an LLM analyzing the website's components, purpose, and structure
    to decide which aesthetic upgrade would fit best.
    """
    print("AI is analyzing the website's UI structure and semantics...")
    
    # We parse the config JSON to "understand" the app
    try:
        parsed = json.loads(config_data)
        app_name = parsed.get("name", "").lower()
        views = parsed.get("ui", {}).get("views", [])
        
        # Simple heuristic decision making based on the app's metadata
        if "invoice" in app_name or "dashboard" in app_name:
            print("   -> Detected an Enterprise/Financial application.")
            print("   -> Decision: 'Clean Minimalist M3' or 'Glassmorphism' are optimal for readability and trust.")
            # Randomly pick between the two best fit for enterprise
            chosen_style_key = random.choice(["MinimalistLight", "Glassmorphism"])
        elif "game" in app_name or "crypto" in app_name:
            print("   -> Detected an Entertainment/Crypto application.")
            print("   -> Decision: 'Cyberpunk Neon' fits the target demographic.")
            chosen_style_key = "Cyberpunk"
        elif "creative" in app_name or "agency" in app_name:
            print("   -> Detected a Creative/Agency application.")
            print("   -> Decision: 'Neo-Brutalism' will make a bold, trendy statement.")
            chosen_style_key = "NeoBrutalism"
        else:
            print("   -> General application detected. Selecting a dynamic aesthetic.")
            chosen_style_key = random.choice(list(STYLES.keys()))
            
    except Exception:
        # Fallback if config isn't parsed
        chosen_style_key = random.choice(list(STYLES.keys()))

    print(f"AI Selected Style: {chosen_style_key}")
    return STYLES[chosen_style_key]


def submit_mutation(style_data):
    patch_payload = {
        "css": style_data["css"].strip(),
        "js": style_data["js"].strip()
    }
    
    mutation = {
        "mutation_id": f"mut-{uuid.uuid4().hex[:8]}",
        "title": style_data["title"],
        "description": style_data["description"],
        "patch": json.dumps(patch_payload),
        "source": "Aesthetic-Engine"
    }

    try:
        resp = requests.post(f"{CONTROL_PLANE_URL}/api/apps/{APP_ID}/mutations", json=mutation)
        resp.raise_for_status()
        print(f"Success: Aesthetic Upgrade submitted successfully. ID: {mutation['mutation_id']}")
    except Exception as e:
        print(f"Failed to submit mutation: {e}")

if __name__ == "__main__":
    print("--- Dynamo Style Analyzer ---")
    config = fetch_current_config()
    if config:
        best_style = analyze_and_decide_style(config)
        submit_mutation(best_style)
