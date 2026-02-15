#!/usr/bin/env python3
"""Belt OS Cost Collector - Polls Anthropic, OpenRouter, Ollama for usage data."""

import json, os, subprocess
from datetime import datetime, timezone

REPO_DIR = "/tmp/belt-os"
OUTPUT = os.path.join(REPO_DIR, "usage-data.json")

def load_keys():
    keys = {}
    zshrc = os.path.expanduser("~/.zshrc")
    if os.path.exists(zshrc):
        with open(zshrc) as f:
            for line in f:
                line = line.strip()
                if line.startswith("export ") and "=" in line:
                    parts = line[7:].split("=", 1)
                    k = parts[0].strip()
                    v = parts[1].strip().strip('"').strip("'")
                    keys[k] = v
    return keys

def curl_get(url, headers=None):
    cmd = ["curl", "-s", "--max-time", "10"]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode()
        return json.loads(out)
    except:
        return {"error": "request_failed"}

def curl_post(url, data, headers=None):
    cmd = ["curl", "-s", "--max-time", "10", "-X", "POST"]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd += ["-d", json.dumps(data)]
    cmd.append(url)
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode()
        return json.loads(out)
    except:
        return {"error": "request_failed"}

keys = load_keys()
OR_KEY = os.environ.get("OPENROUTER_API_KEY") or keys.get("OPENROUTER_API_KEY", "")
ANTH_KEY = os.environ.get("ANTHROPIC_API_KEY") or keys.get("ANTHROPIC_API_KEY", "")

print(f"[{datetime.now()}] Collecting usage data...")

# --- OpenRouter ---
or_data = {"status": "no_key"}
if OR_KEY:
    raw = curl_get("https://openrouter.ai/api/v1/auth/key", {"Authorization": f"Bearer {OR_KEY}"})
    if "data" in raw:
        d = raw["data"]
        or_data = {
            "status": "active",
            "credits_remaining": d.get("limit_remaining"),
            "credits_used": round(d.get("usage", 0), 6),
            "credits_used_daily": round(d.get("usage_daily", 0), 6),
            "credits_used_weekly": round(d.get("usage_weekly", 0), 6),
            "credits_used_monthly": round(d.get("usage_monthly", 0), 6),
            "label": d.get("label", ""),
            "limit": d.get("limit"),
            "is_free_tier": d.get("is_free_tier", False)
        }
    else:
        or_data = {"status": "error", "detail": str(raw)}
    print(f"  OpenRouter: {or_data['status']} | Used: ${or_data.get('credits_used', 0)}")

# --- Anthropic ---
anth_data = {"status": "no_key"}
if ANTH_KEY:
    anth_data = {
        "status": "active",
        "key_prefix": ANTH_KEY[:15] + "...",
        "model": "claude-opus-4-6",
        "estimated_cost_per_call": 0.045,
        "note": "Usage tracked via OpenClaw logs"
    }
    print(f"  Anthropic: active")

# --- Ollama ---
ollama_data = {"status": "offline", "models": [], "count": 0, "cost": 0}
raw = curl_get("http://127.0.0.1:11434/api/tags")
if "models" in raw:
    models = []
    for m in raw["models"]:
        models.append({
            "name": m.get("name", ""),
            "size_gb": round(m.get("size", 0) / 1e9, 2),
            "family": m.get("details", {}).get("family", ""),
            "parameters": m.get("details", {}).get("parameter_size", ""),
            "quantization": m.get("details", {}).get("quantization_level", "")
        })
    ollama_data = {"status": "running", "models": models, "count": len(models), "cost": 0}
    print(f"  Ollama: running ({len(models)} models)")
else:
    print(f"  Ollama: offline")

# --- History ---
history = []
if os.path.exists(OUTPUT):
    try:
        prev = json.load(open(OUTPUT))
        history = prev.get("history", [])[-287:]
    except:
        pass

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
local = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

history.append({
    "t": now,
    "or_used": or_data.get("credits_used", 0),
    "or_daily": or_data.get("credits_used_daily", 0),
    "ollama": ollama_data.get("count", 0)
})

data = {
    "timestamp": now,
    "localTime": local,
    "version": "1.0",
    "interval": "5m",
    "providers": {
        "openrouter": or_data,
        "anthropic": anth_data,
        "ollama": ollama_data
    },
    "agents": {
        "waul":  {"model": "kimi-k2.5:cloud",      "provider": "ollama",      "cost_per_call": 0,     "emoji": "🦊"},
        "bobby": {"model": "llama3.2:latest",       "provider": "ollama",      "cost_per_call": 0,     "emoji": "📊"},
        "maria": {"model": "llama3.2:latest",       "provider": "ollama",      "cost_per_call": 0,     "emoji": "📝"},
        "tim":   {"model": "openai/codex-5.2",      "provider": "openrouter",  "cost_per_call": 0.003, "emoji": "⚙️"},
        "john":  {"model": "claude-opus-4-6",       "provider": "anthropic",   "cost_per_call": 0.045, "emoji": "🎩"}
    },
    "summary": {
        "providers_active": sum(1 for p in [or_data, anth_data, ollama_data] if p.get("status") in ["active", "running"]),
        "total_agents": 5,
        "free_agents": 3,
        "paid_agents": 2,
        "openrouter_spend_today": or_data.get("credits_used_daily", 0),
        "openrouter_spend_total": or_data.get("credits_used", 0)
    },
    "history": history
}

with open(OUTPUT, "w") as f:
    json.dump(data, f, indent=2)

print(f"\n{'='*50}")
print(f"  OR daily:  ${or_data.get('credits_used_daily', 0):.4f}")
print(f"  OR total:  ${or_data.get('credits_used', 0):.4f}")
print(f"  Anthropic: {anth_data.get('status')}")
print(f"  Ollama:    {ollama_data['count']} models (FREE)")
print(f"{'='*50}")

# --- Git push ---
os.chdir(REPO_DIR)
subprocess.run(["git", "add", "usage-data.json", "cost-collector.py"], capture_output=True)
r = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
if r.returncode != 0:
    subprocess.run(["git", "commit", "-m", f"usage: {local}", "--quiet"], capture_output=True)
    p = subprocess.run(["git", "push", "--quiet"], capture_output=True)
    print("Pushed." if p.returncode == 0 else f"Push failed: {p.stderr.decode()[:100]}")
else:
    print("No changes.")
