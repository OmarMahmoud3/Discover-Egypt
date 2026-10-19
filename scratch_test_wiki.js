async function testWikipediaImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1200`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pages[pageId].thumbnail) {
      console.log(`Success for ${title}:`, pages[pageId].thumbnail.source);
      return pages[pageId].thumbnail.source;
    } else {
      console.log(`No thumbnail for ${title}`);
    }
  } catch (e) {
    console.error(`Error for ${title}:`, e.message);
  }
}

async function run() {
  await testWikipediaImage('Giza pyramid complex');
  await testWikipediaImage('Great Pyramid of Giza');
  await testWikipediaImage('Great Sphinx of Giza');
  await testWikipediaImage('Grand Egyptian Museum');
  await testWikipediaImage('Pyramid of Djoser');
  await testWikipediaImage('Karnak');
  await testWikipediaImage('Luxor Temple');
  await testWikipediaImage('Abu Simbel temples');
  await testWikipediaImage('Citadel of Cairo');
  await testWikipediaImage('Khan el-Khalili');
}

run();
