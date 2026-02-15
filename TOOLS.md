# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Installed Tools (2026-02-14)

### TTS / Voice
- **sag** → ElevenLabs TTS (`sag "Hello there"`)
  - Needs: `ELEVENLABS_API_KEY` in env
  - Voices: check with `sag voices`
  - Default: `eleven_v3` (expressive)

### Spotify
- **spogo** → Spotify control (preferred)
  - Needs: Spotify Premium + cookie import: `spogo auth import --browser chrome`
  - Commands: `spogo play|pause|next|search "query"`
- **spotify_player** → Fallback TUI client

### Email
- **himalaya** → IMAP/SMTP email CLI
  - Config: `~/.config/himalaya/config.toml`

### Terminal/Multiplexer
- **tmux** → Session management for remote CLIs
- **ffmpeg** → Video/audio processing

### macOS UI Automation
- **peekaboo** → Full UI control (screenshots, clicks, typing)
  - ⚠️ Needs: Screen Recording + Accessibility permissions
  - Example: `peekaboo see --app Safari --annotate`

### Messaging/Comms
- **imsg** → iMessage/SMS (BlueBubbles plugin needs fix)

---

## API Keys Needed

| Service | Key | Status |
|---------|-----|--------|
| ElevenLabs | `ELEVENLABS_API_KEY` | ❌ Not set |
| Spotify | Cookie auth | ❌ Not imported |
| Anthropic | `ANTHROPIC_API_KEY` | ⚠️ Needs verification |

---

Add whatever helps you do your job. This is your cheat sheet.
