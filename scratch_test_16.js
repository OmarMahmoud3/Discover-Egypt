async function testSearch(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DiscoverEgyptBot/1.0' } });
  const data = await res.json();
  console.log(`Query: "${query}" -> Matches:`, data.query?.search?.map(s => s.title));
}

async function run() {
  await testSearch('Egyptian Museum');
  await testSearch('Muhammad Ali Mosque Cairo');
  await testSearch('Manial Palace');
  await testSearch('Pompeys Pillar');
  await testSearch('Roman Amphitheatre Alexandria');
  await testSearch('Stanley Bridge Alexandria');
  await testSearch('Philae temple complex');
  await testSearch('Mausoleum of Aga Khan');
  await testSearch('Aswan High Dam');
  await testSearch('Al Sahaba Mosque Sharm');
  await testSearch('Ras Abu Galum');
  await testSearch('Giftun Islands');
  await testSearch('Wadi El Gemal');
  await testSearch('Wadi al Hitan');
  await testSearch('Shali fortress Siwa');
  await testSearch('Rosetta Egypt');
}

run();
