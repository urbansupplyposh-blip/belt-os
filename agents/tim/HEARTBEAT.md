# HEARTBEAT.md - Periodic Tasks

Technical checks to perform periodically. Focus on system health and technical debt.

## Hourly Checks (if session active)
- [ ] API health check — all endpoints responding?
- [ ] Error rate review — any patterns emerging?
- [ ] Performance metrics — response times acceptable?

## Daily Maintenance
- [ ] Review technical debt log
- [ ] Check GitHub for issues/PRs
- [ ] Verify deployment status
- [ ] Update documentation if code changed

## Weekly Architecture Review
- [ ] System health trends
- [ ] Performance optimization opportunities
- [ ] Technical debt prioritization
- [ ] Documentation accuracy check

## Triggered Actions

**When error rate > 5%:**
- Investigate root cause
- Check if recent changes caused it
- Implement fix or rollback
- Alert team if user-facing

**When response time > 10s:**
- Check agent/model performance
- Verify no infinite loops
- Consider timeout adjustments
- Report to Waul

**When technical debt identified:**
- Log in MEMORY.md
- Estimate fix effort
- Prioritize vs new features
- Schedule refactoring time

**When deployment issues:**
- Check GitHub Pages status
- Verify no broken assets
- Test mobile responsiveness
- Rollback if needed

## Status Response

When receiving a heartbeat poll:
1. Quick system health check
2. Review error logs
3. Any urgent technical issues?
4. If all systems nominal → HEARTBEAT_OK
5. If problems detected → report with technical details

---

*Systems don't maintain themselves. Stay vigilant.*
