# Default Quality for YouTube

A Chrome extension that sets a default quality for YouTube videos. It's automatically applied to every video you watch.


## Why

There are other extensions that do this, along with lots of other things. Every third-party extension is a potential attack vector, though, because an update can ship new code to your browser without you noticing. If the developer's account gets taken over, or the extension gets sold, that update could be malicious.

This one is modeled on how [code-charity/youtube](https://github.com/code-charity/youtube) sets the quality, but it's written from scratch. It's the bare minimum: a few short files, with no dependencies and no third-party code, so you can read the whole thing in a few minutes and know exactly what it does. Tools like Claude make it easy to build a small custom extension like this, instead of trusting someone else's.


## Installation

1. Download or clone this repository.
1. Open `chrome://extensions` and turn on `Developer mode`.
1. Click `Load unpacked`, and select the folder.
1. Click the extension's toolbar icon and pick a quality.


## Usage

The quality you pick applies to every video on YouTube and YouTube Music, and to YouTube players embedded in other sites. When you change it, open tabs switch right away. If a video doesn't have that quality, it plays at the next one up, or the next one down if there isn't a higher one. `Auto` leaves the choice to YouTube.

YouTube tabs that were open before you installed or reloaded the extension need to be refreshed before it works in them.

If it stops working, YouTube has probably changed its player. The extension uses methods on the player that aren't officially documented, so they can change without notice.


## License

GPLv2 or later. The icon is `video_settings` from Google's [Material Symbols](https://fonts.google.com/icons), under the Apache 2.0 license.
