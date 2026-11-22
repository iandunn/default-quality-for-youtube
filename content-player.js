/*
 * Runs in the page's world so it can call YouTube's player API on the page's video players.
 */

( () => {
	const SETTING_EVENT = 'default-quality-for-youtube:setting';
	const REQUEST_EVENT = 'default-quality-for-youtube:request';
	const QUALITY_SET_MARKER = 'default-quality-for-youtube:quality-set';

	// YouTube's quality labels, and the vertical resolution each one stands for.
	const RESOLUTIONS = {
		tiny: 144,
		small: 240,
		medium: 360,
		large: 480,
		hd720: 720,
		hd1080: 1080,
		hd1440: 1440,
		hd2160: 2160,
		hd2880: 2880,
		highres: 4320,
	};

	// Stays `null` until the saved setting arrives, so players that load first are left alone.
	let preferredQuality = null;

	// The marker is shared by every tab on the origin, so the first tab to reset removes it. This
	// lets the other tabs still unlock the players they set.
	let hasSetQualityInThisTab = false;

	function isKnownQuality( quality ) {
		return 'string' === typeof quality && Object.hasOwn( RESOLUTIONS, quality );
	}

	// The marker records that this extension wrote a quality to YouTube's storage on this origin,
	// so `Auto` only clears a quality the extension set, not one the user picked in YouTube's
	// menu. Storage can throw in embeds when third-party storage is blocked.
	function setQualitySetMarker() {
		try {
			localStorage.setItem( QUALITY_SET_MARKER, '1' );
		} catch {}
	}

	function hasQualitySetMarker() {
		try {
			return null !== localStorage.getItem( QUALITY_SET_MARKER );
		} catch {
			return false;
		}
	}

	function removeQualitySetMarker() {
		try {
			localStorage.removeItem( QUALITY_SET_MARKER );
		} catch {}
	}

	// Prefer the nearest quality at or above the preferred one, and only fall back to a lower one
	// when nothing higher exists.
	function closestAvailableQuality( preferred, available ) {
		const target = RESOLUTIONS[ preferred ];
		const known = available.filter( isKnownQuality );
		const higher = known.filter( ( quality ) => RESOLUTIONS[ quality ] >= target );
		const candidates = higher.length ? higher : known;

		if ( ! candidates.length ) {
			return null;
		}

		return candidates.reduce( ( closest, quality ) => {
			const distance = Math.abs( RESOLUTIONS[ quality ] - target );
			const closestDistance = Math.abs( RESOLUTIONS[ closest ] - target );

			return distance < closestDistance ? quality : closest;
		} );
	}

	// YouTube lists a Premium (enhanced bitrate) format as its own entry under the same quality
	// label, and only plays it when its `formatId` is passed along with the label.
	function getPremiumFormatId( player, quality ) {
		if ( 'function' !== typeof player.getAvailableQualityData ) {
			return undefined;
		}

		const qualityData = player.getAvailableQualityData();

		if ( ! Array.isArray( qualityData ) ) {
			return undefined;
		}

		const premiumFormat = qualityData.find( ( format ) =>
			format.quality === quality &&
			format.isPlayable &&
			format.formatId &&
			format.paygatedQualityDetails
		);

		return premiumFormat?.formatId;
	}

	// Shorts play in `#shorts-player` while an empty `#movie_player` stays hidden in the DOM, so
	// only players that have a video loaded are returned.
	function getActivePlayers() {
		const players = document.querySelectorAll( '.html5-video-player' );

		return [ ...players ].filter( ( player ) =>
			'function' === typeof player.getAvailableQualityLevels &&
			player.getAvailableQualityLevels().length > 0
		);
	}

	function applyQuality() {
		if ( ! isKnownQuality( preferredQuality ) ) {
			return;
		}

		for ( const player of getActivePlayers() ) {
			const available = player.getAvailableQualityLevels();
			const quality = closestAvailableQuality( preferredQuality, available );

			if ( ! quality ) {
				continue;
			}

			const formatId = getPremiumFormatId( player, quality );

			if ( 'function' === typeof player.setPlaybackQualityRange ) {
				player.setPlaybackQualityRange( quality, quality, formatId );
			}

			if ( 'function' === typeof player.setPlaybackQuality ) {
				player.setPlaybackQuality( quality );
			}

			setQualitySetMarker();
			hasSetQualityInThisTab = true;
		}
	}

	// YouTube remembers the last quality that was set, for up to a year, so `Auto` has to clear the
	// one the extension set, or YouTube keeps using it. The marker is only removed once a player
	// has done the reset, so it's retried on the next video if no player is loaded yet.
	function resetToAuto() {
		if ( ! hasSetQualityInThisTab && ! hasQualitySetMarker() ) {
			return;
		}

		for ( const player of getActivePlayers() ) {
			if ( 'function' === typeof player.setPlaybackQualityRange ) {
				player.setPlaybackQualityRange( 'auto', 'auto' );
				removeQualitySetMarker();
				hasSetQualityInThisTab = false;
			}
		}
	}

	function handlePlayerChange() {
		if ( 'auto' === preferredQuality ) {
			resetToAuto();
		} else {
			applyQuality();
		}
	}

	document.addEventListener( SETTING_EVENT, ( event ) => {
		if ( 'auto' === event.detail || isKnownQuality( event.detail ) ) {
			preferredQuality = event.detail;
			handlePlayerChange();
		}
	} );

	// `loadeddata` doesn't bubble, so it's caught during capture. It fires for each new video and
	// after ads.
	document.addEventListener( 'loadeddata', handlePlayerChange, true );
	document.addEventListener( 'yt-navigate-finish', handlePlayerChange );

	document.dispatchEvent( new CustomEvent( REQUEST_EVENT ) );
} )();
