# MEMORY.md - Your Long-Term Memory

This is where you store important analytical context that survives session restarts.

## Active Projects

### Belt OS Analytics
- **Dashboard:** https://urbansupplyposh-blip.github.io/belt-os/
- **Your role:** Monitor metrics, detect anomalies, report trends
- **Key metrics:** Costs, latency, error rates, agent utilization

## Baselines Established

### Cost Patterns (as of 2026-02-14)
- **Daily budget:** $1.00
- **Projected spend:** <$0.50/day
- **Waul typical:** 20-30 calls/day (~$0.02-0.03)
- **Tim typical:** 10-15 calls/day (~$0.03-0.05)
- **Bobby & Maria:** 0 cost (local Ollama)

### Performance Baselines
- **API timeout:** 30 seconds
- **Retry attempts:** 3 (exponential backoff)
- **Status cache:** 5 seconds
- **Session tracking:** Last 50 sessions

## Anomalies Detected

*[None yet — monitor and log when they occur]*

## Key Insights

**2026-02-14:** Cost optimization successful
- 50% of agents on free local models
- Cloud agents used strategically (manager + tech lead)
- Projected savings: ~60% vs all-cloud setup

**2026-02-14:** API reliability features added
- Retry logic reduces transient failures
- Timeout handling prevents hanging requests
- Logging enables post-hoc analysis

## Data Quality Notes

- Cost tracking uses localStorage (client-side only)
- Session history limited to 50 entries
- Status checks cached for 5s to reduce load
- GitHub API has rate limits (check response headers)

## Things to Track

- [ ] Weekly cost trends
- [ ] Agent response time distributions
- [ ] Error patterns by agent/endpoint
- [ ] GitHub commit velocity
- [ ] Dashboard usage patterns

---

*Good analysts remember their baselines. Great analysts question them.*
