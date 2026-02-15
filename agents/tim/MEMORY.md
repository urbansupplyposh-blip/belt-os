# MEMORY.md - Your Long-Term Memory

This is where you store important technical context that survives session restarts.

## Active Projects

### Belt OS Technical Architecture
- **Live URL:** https://urbansupplyposh-blip.github.io/belt-os/
- **Repo:** urbansupplyposh-blip/belt-os
- **Status:** v1.0 deployed, API integration complete
- **Your role:** Technical oversight, architecture decisions

## Technical Decisions

### 2026-02-14: No-Framework Approach
**Decision:** Pure HTML/CSS/JS, no React/Vue/etc.
**Rationale:** 
- Deploys directly to GitHub Pages
- No build step required
- Easier to debug
- Lower barrier to modification

### 2026-02-14: localStorage Persistence
**Decision:** Use localStorage for cost tracking and session history
**Rationale:**
- No backend needed
- Survives page refresh
- Simple to implement
**Trade-off:** Data is device-specific

### 2026-02-14: API Retry Logic
**Decision:** 3 retries with exponential backoff (1s, 2s, 4s)
**Rationale:**
- Handles transient network failures
- Doesn't hammer failing endpoints
- Jitter prevents thundering herd

## Architecture Notes

### Belt API Design
```
Base: http://localhost:8087
Endpoints:
  /waul  → Manager agent (kimi-k2.5)
  /bobby → Analyst (llama3.2 local)
  /maria → Bookkeeper (llama3.2 local)
  /tim   → Tech Lead (codex-5.2)
```

### Cost Optimization
- 50% of agents on free local models
- Cloud agents used strategically
- Session tracking for accountability
- Daily budget: $1.00

## Technical Debt Log

*[Track items here that need refactoring]*

### Current Items
- None identified yet — monitor and log

## Tools & References

**Performance Baselines**
- API timeout: 30s
- Status cache: 5s
- Max retry attempts: 3
- Session history: 50 entries

**GitHub Integration**
- Repo: urbansupplyposh-blip/belt-os
- Branch: main
- Deploys automatically on push

---

*Good engineers remember why they built things this way. Great engineers question whether they should have.*
