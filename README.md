# Sparkit — Claude usage buddy

A tiny creature that sits above your Claude.ai message box and reacts to how much
usage you have left. Click it for a random comment.

## The honest version of what this does

Free Claude.ai accounts don't get a usage breakdown page at all — there's no
number Anthropic shows you to read, real-time or otherwise. So this extension
does two different things, and is upfront in the popup about which one is active:

1. **Local estimate (labeled as an estimate, always)** — counts messages you send
   and decays them out of a rolling 5-hour window (matching Anthropic's documented
   session window). Mood is based on `1 - (messages sent / assumed cap)`. The cap
   is a guess (default 20) since free-tier limits aren't published — adjust it in
   the popup to match your own experience.
2. **Real signal, not a guess** — watches the page for the actual "usage limit
   reached" message Claude shows you when you truly hit the wall, and immediately
   snaps Sparkit to asleep using the real reset text from that message. This part
   is not estimated; it's reacting to something Claude actually told you.

A manual slider always overrides both, if you'd rather just set the mood yourself.

## Self-correcting cap

The guessed cap (starting at 20) adjusts itself using real evidence instead of
staying a fixed guess forever:

- If Sparkit thinks you're out (estimate hit 0%) but a message still sends and no
  real limit banner shows up, that's proof the cap was too low — it raises itself
  by 2 automatically.
- If the real limit-reached banner does appear, the cap locks to the exact number
  of messages you actually sent in that window — no longer a guess, the true value
  for as long as your usage pattern stays similar.

So it starts as a rough guess and gets more accurate the more you use Claude,
rather than staying wrong indefinitely.

## What's included

- Toolbar badge — shows the % with a `~` prefix when it's an estimate (no prefix
  when it's from the real limit-reached banner), color-coded green/amber/red.
- Popup (click the toolbar icon) — current %, whether it's estimate/real/manual,
  the assumed message cap (editable), a manual slider, and a notification toggle.
- Notifications — a heads-up as the estimate runs low, and a separate one the
  moment the real limit-reached banner appears.
- Persists across reloads and syncs across multiple claude.ai tabs.

## Install (unpacked, for testing)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on "Developer mode" (top right).
3. Click "Load unpacked" and select this folder.
4. Open or refresh claude.ai. Sparkit should appear just above the message box.

## Persistence across clearing browsing data

Clearing cookies/cache/history does not remove installed extensions or their
stored state — after clearing data and logging back in, Sparkit and its last
known mood will already be there.

## Files

- `manifest.json` — MV3 manifest, permissions for claude.ai plus storage/alarms/notifications
- `background.js` — badge, periodic recompute alarm, notifications
- `content.js` — injects Sparkit, counts messages, watches for the real limit banner
- `mascot.js` — the creature's rendering and animation, no dependencies
- `popup.html` / `popup.js` — toolbar popup: estimate/real state, cap setting, manual override
- `styles.css` — mascot + fallback slider styling
