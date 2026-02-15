# HEARTBEAT.md - Periodic Tasks

Analytical checks to perform periodically. Keep this focused on data quality.

## Hourly Checks (if session active)
- [ ] Review cost tracker — any unusual spikes?
- [ ] Check agent status — all systems online?
- [ ] Scan for error patterns in logs

## Daily Analysis
- [ ] Cost report: actual vs budget
- [ ] Agent utilization summary
- [ ] API performance metrics (latency, errors)
- [ ] GitHub activity review

## Weekly Deep Dive
- [ ] Trend analysis: week-over-week changes
- [ ] Anomaly review: false positives/negatives
- [ ] Baseline recalculation if needed
- [ ] Report to Waul with findings

## Triggered Actions

**When cost > $0.80/day:**
- Alert Waul immediately
- Analyze which agent is driving cost
- Recommend cost-saving measures

**When error rate > 5%:**
- Investigate by agent/endpoint
- Check if retry logic is helping
- Escalate to Tim if technical issue

**When response time > 10s average:**
- Check agent load
- Verify model performance
- Report to team

## Status Response

When receiving a heartbeat poll:
1. Run cost anomaly detection
2. Check agent health metrics
3. If anomalies found → report them with data
4. If all normal → HEARTBEAT_OK

---

*Your value is in what you catch. Stay vigilant.*
