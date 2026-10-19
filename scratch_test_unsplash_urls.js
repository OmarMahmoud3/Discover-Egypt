const testUnsplash = [
  'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1544885935-98dd03b09034?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1547995886-6dd68779b5c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1566836644047-97598835848c?auto=format&fit=crop&w=1200&q=80'
];

async function check() {
  for (const u of testUnsplash) {
    const res = await fetch(u);
    console.log(res.status, res.headers.get('content-type'), u.split('?')[0].slice(-25));
  }
}
check();
