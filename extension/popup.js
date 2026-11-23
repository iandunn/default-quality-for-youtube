const select = document.getElementById( 'quality' );

try {
	const { quality = 'auto' } = await chrome.storage.sync.get( 'quality' );
	select.value = quality;
} catch ( error ) {
	console.error( 'Default Quality for YouTube: could not load the saved quality.', error );
}

select.addEventListener( 'change', async () => {
	try {
		await chrome.storage.sync.set( { quality: select.value } );
	} catch ( error ) {
		console.error( 'Default Quality for YouTube: could not save the quality.', error );
	}
} );
