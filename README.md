# Slackgammon

Slackgammon is a web app for playing backgammon against a built-in computer engine. It is designed to look modern, minimal, support offline installation as a PWA, and rolls dice with browser cryptographic randomness via `crypto.getRandomValues()`.
![alt text](image.png)
## Features

- Playable backgammon board with hits, bar entry, and bearing off
- Touch/mouse drag support, two touch movement or left click-left die, right click-right die movement
- Adjustable engine difficulty slider
- Actual random dice rolls
- Installable PWA with manifest and service worker
- Lightweight local server with no external dependencies

## Run Locally

1. Install Node.js if it is not already available.
2. From the project folder, run:

```bash
npm start
```

3. Open `http://localhost:4173`.

## Scripts

- `npm start` runs the local static server
- `npm run check` performs a syntax check on the main JavaScript files

## Notes

- Dice rolls use Web Cryptography in supported browsers. In environments without it, the app falls back to `Math.random()`.
- The app is implemented as a static site, so it can be hosted easily on most web servers or deployed as-is to static hosting.

## Future Development

- sound effects for dice roll
- better mobile experience
    - disallow quick move when on mobile
- over-the board mode
- adding other variations
    - English Game
    - Irish Game
- unofficial house rules

