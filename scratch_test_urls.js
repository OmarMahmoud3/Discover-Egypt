import http from 'http';

// Test fetching several Wikimedia URLs to ensure 200 OK and valid image formats
const testUrls = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg/1280px-Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Sphinx_with_the_third_pyramid.jpg/1280px-Sphinx_with_the_third_pyramid.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Sakkara_01.jpg/1280px-Sakkara_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Temple_de_Louxor_68.jpg/1280px-Temple_de_Louxor_68.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/%D8%AE%D8%A7%D9%86_%D8%A7%D9%84%D8%AE%D9%84%D9%8A%D9%84%D9%8A_1.jpg/1280px-%D8%AE%D8%A7%D9%86_%D8%A7%D9%84%D8%AE%D9%84%D9%8A%D9%84%D9%8A_1.jpg'
];

async function check() {
  for (const url of testUrls) {
    const res = await fetch(url);
    console.log(res.status, res.headers.get('content-type'), url.slice(0, 80));
  }
}
check();
