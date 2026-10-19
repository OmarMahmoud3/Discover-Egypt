async function testUnsplashNapi() {
  const url = 'https://unsplash.com/napi/search/photos?query=Egypt+Pyramids+Giza&per_page=5';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Total:', data.total);
      data.results.slice(0, 3).forEach(p => {
        console.log(p.id, p.description || p.alt_description, p.urls.regular);
      });
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
testUnsplashNapi();
