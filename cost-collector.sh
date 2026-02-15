#!/bin/bash
# Belt OS Cost Collector
# Polls Anthropic, OpenRouter, and Ollama for usage data
# Writes to usage-data.json and auto-pushes to GitHub Pages

set -e

REPO_DIR="/tmp/belt-os"
OUTPUT="$REPO_DIR/usage-data.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOCAL_TIME=$(date +"%Y-%m-%d %H:%M:%S %Z")

# Source API keys from shell config
source ~/.zshrc 2>/dev/null || true

echo "[$LOCAL_TIME] Collecting usage data..."

# --- OpenRouter ---
OR_DATA="{}"
if [ -n "$OPENROUTER_API_KEY" ]; then
  OR_RAW=$(curl -s -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "https://openrouter.ai/api/v1/auth/key" 2>/dev/null || echo "{}")
  
  OR_CREDITS=$(echo "$OR_RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({'credits': d.get('data',{}).get('limit_remaining', 0), 'usage': d.get('data',{}).get('usage', 0), 'label': d.get('data',{}).get('label',''), 'rate_limit': d.get('data',{}).get('rate_limit',{})}))" 2>/dev/null || echo '{"credits":0,"usage":0,"label":"error"}')
  
  # Get recent generation stats
  OR_GENS=$(curl -s -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "https://openrouter.ai/api/v1/auth/key" 2>/dev/null || echo "{}")
  
  OR_DATA="$OR_CREDITS"
  echo "  OpenRouter: OK"
else
  OR_DATA='{"credits":0,"usage":0,"label":"no_key","error":"OPENROUTER_API_KEY not set"}'
  echo "  OpenRouter: No API key"
fi

# --- Anthropic ---
ANTH_DATA="{}"
if [ -n "$ANTHROPIC_API_KEY" ]; then
  # Anthropic doesn't have a public usage API accessible with standard API keys
  # We track usage locally from OpenClaw logs instead
  ANTH_BALANCE="unknown"
  
  # Check if we can at least verify the key works
  ANTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    "https://api.anthropic.com/v1/messages" \
    -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' 2>/dev/null || echo "000")
  
  if [ "$ANTH_TEST" = "200" ] || [ "$ANTH_TEST" = "400" ] || [ "$ANTH_TEST" = "401" ]; then
    ANTH_STATUS="active"
  else
    ANTH_STATUS="unknown"
  fi
  
  # Parse OpenClaw logs for Anthropic usage today
  TODAY=$(date +"%Y-%m-%d")
  ANTH_CALLS=0
  ANTH_TOKENS=0
  ANTH_COST=0
  
  if [ -f "$HOME/.openclaw/logs/gateway.log" ]; then
    ANTH_CALLS=$(grep -c "anthropic" "$HOME/.openclaw/logs/gateway.log" 2>/dev/null | grep "$TODAY" | wc -l || echo "0")
  fi
  
  ANTH_DATA="{\"status\":\"$ANTH_STATUS\",\"key_prefix\":\"$(echo $ANTHROPIC_API_KEY | head -c 12)...\",\"today_calls\":$ANTH_CALLS,\"today_cost\":$ANTH_COST}"
  echo "  Anthropic: $ANTH_STATUS"
else
  ANTH_DATA='{"status":"no_key","error":"ANTHROPIC_API_KEY not set"}'
  echo "  Anthropic: No API key"
fi

# --- Ollama ---
OLLAMA_DATA="{}"
OLLAMA_RAW=$(curl -s "http://127.0.0.1:11434/api/tags" 2>/dev/null || echo '{"models":[]}')

OLLAMA_MODELS=$(echo "$OLLAMA_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    models = []
    for m in d.get('models', []):
        models.append({
            'name': m.get('name',''),
            'size': m.get('size', 0),
            'modified': m.get('modified_at',''),
            'family': m.get('details',{}).get('family','')
        })
    print(json.dumps({'status':'running','models':models,'count':len(models)}))
except:
    print(json.dumps({'status':'offline','models':[],'count':0}))
" 2>/dev/null || echo '{"status":"offline","models":[],"count":0}')

OLLAMA_DATA="$OLLAMA_MODELS"
echo "  Ollama: $(echo $OLLAMA_DATA | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)"

# --- OpenClaw Agent Status ---
AGENTS_DATA="[]"
OC_STATUS=$(curl -s "http://127.0.0.1:18789/api/status" -H "Authorization: Bearer 5be7504354c483cf176e9b88248b5bd95437e8aa8f242335" 2>/dev/null || echo "{}")

# --- Assemble Final JSON ---
python3 -c "
import json, sys

data = {
    'timestamp': '$TIMESTAMP',
    'localTime': '$LOCAL_TIME',
    'providers': {
        'openrouter': $OR_DATA,
        'anthropic': $ANTH_DATA,
        'ollama': $OLLAMA_DATA
    },
    'agents': {
        'waul': {'model': 'ollama/kimi-k2.5:cloud', 'provider': 'ollama', 'cost_per_call': 0},
        'bobby': {'model': 'ollama/llama3.2:latest', 'provider': 'ollama', 'cost_per_call': 0},
        'maria': {'model': 'ollama/llama3.2:latest', 'provider': 'ollama', 'cost_per_call': 0},
        'tim': {'model': 'openrouter/openai/codex-5.2', 'provider': 'openrouter', 'cost_per_call': 0.003},
        'john': {'model': 'anthropic/claude-opus-4-6', 'provider': 'anthropic', 'cost_per_call': 0.045}
    },
    'summary': {
        'total_providers': 3,
        'total_agents': 5,
        'free_agents': ['waul', 'bobby', 'maria'],
        'paid_agents': ['tim', 'john']
    }
}

with open('$OUTPUT', 'w') as f:
    json.dump(data, f, indent=2)

print(json.dumps(data, indent=2))
" 2>/dev/null

echo ""
echo "[$LOCAL_TIME] Written to $OUTPUT"

# --- Auto-push to GitHub ---
cd "$REPO_DIR"
if git diff --quiet usage-data.json 2>/dev/null; then
  echo "No changes to push."
else
  git add usage-data.json
  git commit -m "Update usage data - $LOCAL_TIME" --quiet
  git push --quiet 2>/dev/null && echo "Pushed to GitHub." || echo "Push failed (will retry next cycle)."
fi
