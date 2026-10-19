async function testFilePath() {
  const file = 'Pyramids_of_the_Giza_Necropolis.jpg';
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1200`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  console.log('Status:', res.status, 'Final URL:', res.url, res.headers.get('content-type'));
}
testFilePath();
