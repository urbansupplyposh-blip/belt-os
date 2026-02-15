# TOOLS.md - Local Notes

Tools and resources specific to Bobby's analytical workspace.

## API Connections
- **Belt API Base:** http://localhost:8087
- **My Endpoint:** /bobby
- **Model:** llama3.2 local (FREE)
- **Advantage:** Zero cost for analysis tasks

## Data Sources

### Belt OS Metrics
- Cost tracking data (localStorage)
- Session history and duration
- Agent response times
- Error rates and retry counts

### GitHub Integration
- Commit history
- Repo activity
- Deployment status

### System Status
- Agent online/offline status
- API health checks
- Token usage patterns

## Analytical Tools

**Trend Detection**
- Moving averages
- Day-over-day comparisons
- Week-over-week baselines

**Anomaly Detection**
- Cost spikes > 200% of baseline
- Response time degradation
- Error rate increases

**Reporting Format**
```
Metric: [Name]
Current: [Value]
Baseline: [Value]  
Delta: [% change]
Assessment: [Normal/Warning/Critical]
```

## Files I Own
- `agents/bobby/SOUL.md` — Who I am
- `agents/bobby/IDENTITY.md` — How I present
- `agents/bobby/USER.md` — Who Jarvis is
- `agents/bobby/TOOLS.md` — This file
- `agents/bobby/MEMORY.md` — My long-term memory
- `agents/bobby/HEARTBEAT.md` — My periodic tasks

---

*Your job is to find truth in data. Everything else is noise.*
