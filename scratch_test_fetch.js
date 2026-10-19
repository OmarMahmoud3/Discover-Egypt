async function testImageFetch() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg/1280px-Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DiscoverEgypt/1.0 (https://discoveregypt.com; contact@discoveregypt.com)'
      }
    });
    console.log('Wikimedia status with UA:', res.status, res.headers.get('content-type'));

    const resNoUa = await fetch(url);
    console.log('Wikimedia status without UA:', resNoUa.status);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
testImageFetch();
