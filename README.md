# Default Quality for YouTube

A Chrome and Safari extension that sets a default quality for YouTube videos. It's automatically applied to every video you watch.


## Why

There are other extensions that do this, along with lots of other things. Every third-party extension is a potential attack vector, though, because an update can ship new code to your browser without you noticing. If the developer's account gets taken over, or the extension gets sold, that update could be malicious.

It's written from scratch to be the bare minimum: a few short files, with no dependencies and no third-party code, so you can read the whole thing in a few minutes and know exactly what it does. Tools like Claude make it easy to build a small custom extension like this, instead of trusting someone else's.


## Installation

### Chrome

1. Download or clone this repository.
1. Open `chrome://extensions` and turn on `Developer mode`.
1. Click `Load unpacked`, and select the `extension` folder.
1. Click the extension's toolbar icon and pick a quality.

### Safari

Safari only keeps an extension installed across restarts when it's inside a signed app, so the `safari` folder has an Xcode project that wraps the files in `extension`. You'll need Xcode 27 or later, and an Apple ID signed in under `Xcode > Settings > Accounts`. A free one works.

1. Download or clone this repository.
1. Find your Team ID by running `defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier`. It's the `teamID` value.
1. Create `safari/Default Quality for YouTube/Local.xcconfig` with `DEVELOPMENT_TEAM = <your Team ID>` in it. Git ignores that file.
	1. If you're not me, you'll also need to change `com.iandunn` to something of your own, because bundle identifiers have to be unique. It's in both targets' build settings, and in `extensionBundleIdentifier` in `ViewController.swift`.
1. Open `safari/Default Quality for YouTube/Default Quality for YouTube.xcodeproj` in Xcode, and click `Product > Run`.
1. In Safari, open `Settings > Extensions`, and turn on `Default Quality for YouTube`.
1. Open a YouTube video, click the extension's toolbar icon, and allow it on the site. Safari asks separately for each site, so do the same on YouTube Music, and on a page with an embedded player, if you use those.
1. Click the extension's toolbar icon and pick a quality.

When you change the files in `extension`, run it from Xcode again. If you add a new file, add it to the extension target in Xcode too, because the project lists each file individually.


## Usage

The quality you pick applies to every video on YouTube and YouTube Music, and to YouTube players embedded in other sites. When you change it, open tabs switch right away. If a video doesn't have that quality, it plays at the next one up, or the next one down if there isn't a higher one. `Auto` leaves the choice to YouTube.

YouTube tabs that were open before you installed or reloaded the extension need to be refreshed before it works in them.

If it stops working, YouTube has probably changed its player. The extension uses methods on the player that aren't officially documented, so they can change without notice.


## License

GPLv2 or later. The icon is `video_settings` from Google's [Material Symbols](https://fonts.google.com/icons), under the Apache 2.0 license.
