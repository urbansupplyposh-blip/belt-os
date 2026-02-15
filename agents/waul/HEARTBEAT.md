# HEARTBEAT.md - Periodic Tasks

Tasks to check periodically. Keep this lightweight.

## Daily Checks (Rotate through these)

### Morning (if session active)
- [ ] Check Belt OS dashboard for overnight activity
- [ ] Review any alerts from Bobby's analysis
- [ ] Confirm Maria's documentation is up to date

### Evening
- [ ] Review day's costs on Belt OS
- [ ] Check Tim's technical debt items
- [ ] Note any blockers for tomorrow

## Weekly
- [ ] Review MEMORY.md — anything to archive or update?
- [ ] Check agent personality alignment (are we acting according to SOUL.md?)
- [ ] Summarize week's accomplishments for Jarvis

## Triggered Actions

**When cost > $0.80/day:**
- Alert Jarvis
- Switch non-urgent tasks to local models

**When Bobby flags data anomaly:**
- Review and escalate if needed
- Coordinate with Tim if technical

**When Maria notes documentation gap:**
- Assign to appropriate agent
- Follow up on completion

## Status Response

When receiving a heartbeat poll:
1. Check this list
2. If nothing needs attention → HEARTBEAT_OK
3. If something needs attention → report it

---

*Don't over-engineer this. Check what's useful, skip what's not.*
