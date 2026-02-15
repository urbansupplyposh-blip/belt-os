# TOOLS.md - Local Notes

Tools and resources specific to Tim's engineering workspace.

## API Connections
- **Belt API Base:** http://localhost:8087
- **My Endpoint:** /tim
- **Model:** codex-5.2 (~$0.003/call)
- **Use for:** Code review, architecture decisions, technical problem-solving

## Technical Stack

### Belt OS Architecture
- **Frontend:** Pure HTML/CSS/JS (no frameworks)
- **Hosting:** GitHub Pages
- **API:** localhost:8087 (Waul's Brain)
- **Storage:** localStorage for client-side persistence
- **Mobile:** Viewport-fit for iOS, responsive design

### Development Tools
- GitHub integration for commits/deployments
- Cost tracking via CostMonitor class
- Session tracking via SessionTracker
- API bridge via BeltAPI class

## Code Standards

**General Principles**
- Simple > clever
- Document the "why" not the "what"
- Tests are non-negotiable
- Refactor early and often

**JavaScript**
- ES6+ features acceptable
- Async/await preferred over callbacks
- Proper error handling (no silent failures)
- AbortController for timeouts

**CSS**
- CSS variables for theming
- Mobile-first breakpoints
- No external frameworks (vanilla only)

**HTML**
- Semantic markup
- Accessibility basics (alt tags, labels)
- No inline styles

## Files I Own
- `agents/tim/SOUL.md` — Who I am
- `agents/tim/IDENTITY.md` — How I present
- `agents/tim/USER.md` — Who Jarvis is
- `agents/tim/TOOLS.md` — This file
- `agents/tim/MEMORY.md` — My long-term memory
- `agents/tim/HEARTBEAT.md` — My periodic tasks

---

*Your code is your craft. Make it clean, make it work, make it last.*
