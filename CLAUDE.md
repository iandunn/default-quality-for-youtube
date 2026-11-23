# Default Quality for YouTube

A minimal Chrome and Safari extension that sets a default YouTube video quality from a dropdown in the toolbar popup. It's modeled on how https://github.com/code-charity/youtube sets quality, but written from scratch so there's no third-party code that could be taken over and used as an attack vector. The README should say that it's written from scratch, and that other extensions exist. It doesn't need to credit code-charity.


## Decisions

- Name: "Default Quality for YouTube".
- Chrome and Safari, Manifest V3, for personal use. No build step, no background service worker. Chrome loads `extension/` unpacked. Safari only keeps an extension across restarts when it's inside a signed app, so `safari/` has an Xcode app wrapper, which is committed.
- Picking a quality saves a default (`chrome.storage.sync`) that applies to every video, and to open YouTube tabs immediately. `Auto` leaves YouTube's own choice alone.
- When the saved quality isn't available for a video, use the nearest higher one. Only fall back to the nearest lower one when nothing higher exists.
- AI-upscaled "Super resolution" levels are fine to use. YouTube only offers them on videos below 1080p, and `getAvailableQualityLevels()` lists them as ordinary labels like `hd1080`, so the rule above picks them with no special handling. `getAvailableQualityData()` marks them with `paygatedQualityDetails.paygatedIndicatorText: "Super resolution"`, if that ever needs to change.
- Always use the Premium (enhanced bitrate) version of the chosen quality when it's playable. `getAvailableQualityLevels()` lists it under the same label as the standard version, like `hd1080`, so the label alone picks the standard one. `getAvailableQualityData()` gives it a separate entry with a `formatId` and `paygatedQualityDetails`, and passing that `formatId` as the third argument to `setPlaybackQualityRange()` selects it, the same way YouTube's own menu does. Non-Premium accounts get `isPlayable: false` and no `formatId` on that entry, so it's skipped. On 2026-11-22 the user confirmed that Safari, logged in to a Premium account, selected the Premium version.
- Scope is `www.youtube.com`, `music.youtube.com`, and embeds on other sites (`www.youtube.com/embed/` and `www.youtube-nocookie.com/embed/` iframes, via `all_frames`).
- Audio bitrate on YouTube Music isn't covered. The player API only exposes video quality and audio language tracks.
- Popup design: option 1 ("Native select") from the mockups at https://claude.ai/artifact/4fm8CxgkoXBxwaaVAhZxAg, whose source files are in `design-mockups/`. They only render inside that canvas. A label, a native `<select>`, and a line of help text, using Chrome's Material 3 colors and the system font.
- Toolbar icon: Material Symbols `video_settings`, single color, mid-gray (`#757575`) so it reads on light and dark toolbars.


## Architecture

- The extension's files are in `extension/`, and the Safari wrapper is in `safari/`. They're separate folders so the wrapper doesn't bundle itself, `.git`, or `.claude` into the extension.
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


## Safari

The extension runs in Safari unchanged, through the Xcode app wrapper in `safari/`. The user confirmed it with a signed build on 2026-11-23.

- The wrapper was generated with `safari-web-extension-packager extension --project-location safari --app-name "Default Quality for YouTube" --bundle-identifier com.iandunn.DefaultQualityForYouTube --swift --macos-only --no-open --no-prompt`. It has to run outside the sandbox. It warns that `world` isn't supported, but Safari does run the main-world script. It gave the app the bundle ID `com.iandunn.Default-Quality-for-YouTube`, which was changed to `com.iandunn.DefaultQualityForYouTube` because the extension's ID has to start with the app's.
- Xcode 27 writes the project as JSON in `project.xcproj`. It lists each extension file individually, so a new file in `extension/` has to be added to the project. `xcodeproj` in Xcode's `usr/bin` edits it from the command line. Its read-only subcommands work inside the sandbox, but its writes and `xcodebuild` need `dangerouslyDisableSandbox` on the first attempt. They're deliberately not allowed or excluded in `.claude/settings.json`, because together they could add and run a build script with no prompt and no sandbox. `xcodebuild -quiet` keeps the output short without a pipe.
- `DEVELOPMENT_TEAM` lives in the gitignored `Local.xcconfig`, which the committed `Signing.xcconfig` includes. `Signing.xcconfig` backs the project-level Debug and Release configurations. Picking a team in Xcode's Signing UI would write it into `project.xcproj` instead, so avoid that.
- The app's deployment target is macOS 12.0, matching the extension's. The packager set the project-level target to the machine's own macOS, 27.2.
- The packager's default `ENABLE_OUTGOING_NETWORK_CONNECTIONS` and `ENABLE_USER_SELECTED_FILES` entitlements were removed. Without the network one, the container app's window is blank, because its `WKWebView` can't load `Main.html`. The user accepted that, since the extension still works and the window is only a shortcut to Safari's settings.
- Safari makes the user allow the extension on each site before the content scripts run; the README covers it.


## Git

- The first push is `git push -u origin main`, so `main` tracks the remote. Only push when asked.


## Status

As of 2026-11-23, the initial version, the Premium fix, the test videos, and Safari support are committed.

- Known limitation, accepted as minor: the marker means "the extension set a quality on this origin at some point", so if the user picks a quality in YouTube's menu while the extension is on `Auto`, then switches the extension to a fixed quality and back to `Auto`, their manual pick is cleared.

### Still to do

- The user tests it unpacked in their own Chrome: the popup, the saved setting, a live change in an open tab, and an embed on a third-party site. The automated tests couldn't cover those.

### Parked

- (Low) The script re-applies the saved quality on every `loadeddata`, including after ads, so a quality the user picks by hand in YouTube's menu is overridden on the next load. With Premium formats, that also switches a manual pick of standard 1080p back to Premium. This behavior predates the Premium change.
