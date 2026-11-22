/*
 * Runs in the isolated world, because that's the only one that can read `chrome.storage`. The
 * player API is only reachable from the page's world, so this passes the saved quality to
 * `content-player.js` with DOM events.
 */

( () => {
	const SETTING_EVENT = 'default-quality-for-youtube:setting';
	const REQUEST_EVENT = 'default-quality-for-youtube:request';

	function sendQuality( quality ) {
		document.dispatchEvent( new CustomEvent( SETTING_EVENT, { detail: quality } ) );
	}

	async function sendSavedQuality() {
		try {
			const { quality = 'auto' } = await chrome.storage.sync.get( 'quality' );
			sendQuality( quality );
		} catch ( error ) {
			console.error(
				'Default Quality for YouTube: could not load the saved quality.',
				error
			);
		}
	}

	// The two scripts can load in either order, so the player script asks for the value when it's
	// ready.
	document.addEventListener( REQUEST_EVENT, sendSavedQuality );

	chrome.storage.onChanged.addListener( ( changes, areaName ) => {
		if ( 'sync' === areaName && changes.quality ) {
			sendQuality( changes.quality.newValue ?? 'auto' );
		}
	} );

	sendSavedQuality();
} )();
