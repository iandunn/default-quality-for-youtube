# Default Quality for YouTube

A minimal Chrome extension that sets a default YouTube video quality from a dropdown in the toolbar popup. It's modeled on how https://github.com/code-charity/youtube sets quality, but written from scratch so there's no third-party code that could be taken over and used as an attack vector. The README should say that, and that other extensions exist.


## Decisions

- Name: "Default Quality for YouTube".
- Chrome only, Manifest V3, loaded unpacked for personal use. No build step, no background service worker.
- Picking a quality saves a default (`chrome.storage.sync`) that applies to every video, and to open YouTube tabs immediately. `Auto` leaves YouTube's own choice alone.
- When the saved quality isn't available for a video, use the nearest higher one. Only fall back to the nearest lower one when nothing higher exists.
- AI-upscaled "Super resolution" levels are fine to use. YouTube only offers them on videos below 1080p, and `getAvailableQualityLevels()` lists them as ordinary labels like `hd1080`, so the rule above picks them with no special handling. `getAvailableQualityData()` marks them with `paygatedQualityDetails.paygatedIndicatorText: "Super resolution"`, if that ever needs to change.
- Always use the Premium (enhanced bitrate) version of the chosen quality when it's playable. `getAvailableQualityLevels()` lists it under the same label as the standard version, like `hd1080`, so the label alone picks the standard one. `getAvailableQualityData()` gives it a separate entry with a `formatId` and `paygatedQualityDetails`, and passing that `formatId` as the third argument to `setPlaybackQualityRange()` selects it, the same way YouTube's own menu does. Non-Premium accounts get `isPlayable: false` on that entry, so it's skipped. This hasn't been seen with real Premium data yet, because the test browser isn't logged in.
- Scope is `www.youtube.com`, `music.youtube.com`, and embeds on other sites (`www.youtube.com/embed/` and `www.youtube-nocookie.com/embed/` iframes, via `all_frames`).
- Audio bitrate on YouTube Music isn't covered. The player API only exposes video quality and audio language tracks.
- Popup design: option 1 ("Native select") from the mockups at https://claude.ai/artifact/4fm8CxgkoXBxwaaVAhZxAg, whose source files are in `design-mockups/`. They only render inside that canvas. A label, a native `<select>`, and a line of help text, using Chrome's Material 3 colors and the system font.
- Toolbar icon: Material Symbols `video_settings`, single color, mid-gray (`#757575`) so it reads on light and dark toolbars.


## Architecture

- `popup.html` / `popup.js`: the dropdown; reads and writes the saved quality.
- Isolated-world content script: reads the saved quality, watches for changes, and passes it to the page with a `CustomEvent`, because page scripts can't read `chrome.storage`.
- Main-world content script: calls the player API (`getAvailableQualityLevels()`, `setPlaybackQualityRange()`, `setPlaybackQuality()`) when a player loads, after YouTube's in-page navigation, and when the setting changes. It targets every `.html5-video-player` with a non-empty quality list, because Shorts play in `#shorts-player` while an empty `#movie_player` stays hidden in the DOM.
- YouTube saves the last quality that was set to its `yt-player-quality` localStorage entry for a year. So when the setting is `Auto`, the script calls `setPlaybackQualityRange( 'auto', 'auto' )`, which resets that entry to `{"quality":0}`. It only does that when its own `default-quality-for-youtube:quality-set` localStorage marker is present on that origin. The marker is set whenever the script applies a quality, and removed once a player does the reset. Because the marker is shared by every tab on the origin, each tab also keeps its own flag, so a second open tab still unlocks its players after the first tab removes the marker. That way the reset also happens on page load and on origins that weren't open when the setting changed, but a quality the user picked by hand in YouTube's menu is left alone.


## Testing

- The isolated Chrome DevTools MCP browser can't load unpacked extensions, so test the player logic by injecting `content-player.js` with `navigate_page`'s `initScript`, plus a stub that answers the request event with a quality.
- YouTube Music blocks headless Chrome's user agent. Use `emulate` with a regular Chrome user agent first.
- These test videos are listed by their highest quality, and each one also has the usual lower qualities. The headless browser isn't logged in, so it never sees Premium or Super resolution entries. Those were seen in the user's Premium account.
	- https://www.youtube.com/watch?v=KppnHrffns0: 1080p. The user's Premium account also gets 1080p Premium.
	- https://www.youtube.com/watch?v=Q1NKo9gHm1s: 2160p.
	- https://www.youtube.com/watch?v=Xw1C5T-fH2Y: 720p.
	- https://www.youtube.com/watch?v=8HCtBPJuIZc: 480p.
	- https://www.youtube.com/watch?v=vtyXbTHKhI0: 240p.
- Embeds wouldn't play in the headless browser (errors 152 and 153), so embed support has only been checked as far as the embed page having `#movie_player` with the same API methods.


## Git

- The first push is `git push -u origin main`, so `main` tracks the remote. Only push when asked.


## Status

As of 2026-11-22, everything is written but nothing has been committed. The pre-commit security review came back clean. The five code review fixes are applied: `Auto` resets YouTube's stored quality, Shorts are covered, `setPlaybackQualityRange` has a `typeof` guard, the README says already-open tabs need a refresh, and long lines are wrapped. The `Auto` and Shorts fixes were confirmed on the live site.

### Still to do

- The second code review found that `Auto` didn't reset YouTube's stored quality on tabs or origins that weren't open when the setting changed. The marker fix described in Architecture is applied and was confirmed on the live site. The third code review found that the shared marker left other open tabs locked; the per-tab flag fixes that, and was confirmed on the live site. The third security review was clean. Ready to commit when asked.
- Known limitation, accepted as minor: the marker means "the extension set a quality on this origin at some point", so if the user picks a quality in YouTube's menu while the extension is on `Auto`, then switches the extension to a fixed quality and back to `Auto`, their manual pick is cleared.
- The user tests it unpacked in their own Chrome: the popup, the saved setting, a live change in an open tab, and an embed on a third-party site. The automated tests couldn't cover those.
- Commit, then push with the command above, only when asked.

### Parked

- (High) Safari support, to start right after the initial commit. Nothing has been investigated yet. The main open question is whether Safari supports `"world": "MAIN"` content scripts; if not, `content-player.js` needs another way into the page's world. Loading may need Xcode's `safari-web-extension-converter`, or a temporary extension from Safari's Develop menu.
