# Skyline Escape

An original free-running chase game in the style of parkour runners like *Vector*: sprint across rooftops,
vault crates, slide under beams, climb walls and flip over gaps while a hunter chases you.
All the code and art here are new. Nothing comes from Nekki's game.

**Everything is free:** all 12 story levels and Endless mode are unlocked from the start, and every gadget and outfit
is marked FREE (the crossed-out price just shows what it would have cost). There are no ads, purchases or accounts.

## Play in a browser
```
npm start
```
Then open http://localhost:8080. The server also prints a LAN address you can open on a phone on the same Wi-Fi.
No install step is needed. The server has no dependencies, and `www/` is a static site you can host on GitHub Pages,
Netlify, etc.

## Install on a phone (quickest)
Open the hosted game (it needs HTTPS, e.g. GitHub Pages) in Chrome or Safari, then use **Install app** /
**Add to Home Screen**. It runs fullscreen in landscape and works offline.

## Build a native Android / iOS app (Capacitor)
Requires Android Studio (Android) or Xcode on a Mac (iOS).
```
npm run android:init     # once: installs Capacitor and creates the android/ project
npm run android:open     # opens Android Studio -> Run, or Build > Build APK
npm run ios:init && npm run ios:open
```
To lock landscape on Android, add `android:screenOrientation="sensorLandscape"` to the activity in
`android/app/src/main/AndroidManifest.xml`.

## Controls
| Action | Touch | Keyboard |
|---|---|---|
| Jump / climb / vault | swipe up or tap | ↑ / W / Space |
| Slide / fast-drop | swipe down | ↓ / S |
| Sprint (on yellow arrows) | swipe right | → / D |
| Pause | II button | Esc / P |

## Moves
- **Vaults** (jump just in front of an obstacle): Speed, Dash, Thief and Reverse Vault over crates, Kong or Monkey Vault over desks, Double Kong over long tables. You can also slide under desks.
- **13 air tricks** in trick zones: Front Flip, Back Flip, Webster, Fold Flip, Straight Legs Flip, Cheat Gainer, Double Back, Screwdriver, Air Spin, Spin Bicycle, Superman, Swallow, Flying Arrow. All are free; turn individual tricks on or off under Gear → Tricks.
- **Swing bars** over wide gaps (giant swing into a backflip), **wall climbs**, **sprint arrows**, and an **automatic roll** after big drops.

## Files
- `www/game.js`: the whole engine (physics, level generator, hunter AI, procedural stick-figure animation, synth audio, menus)
- `www/index.html`, `www/style.css`: UI screens and HUD
- `www/manifest.webmanifest`, `www/sw.js`: installable PWA and offline cache
- `tools/serve.js`: local server, `tools/make-icons.ps1`: regenerates the app icons
