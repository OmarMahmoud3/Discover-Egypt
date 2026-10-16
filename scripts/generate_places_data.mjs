import fs from 'fs';

// Load parsed places
const parsedPlaces = JSON.parse(fs.readFileSync('scripts/parsed_places.json', 'utf-8'));

// Specific high-quality photo assignments for iconic landmarks
const specificPhotos = {
  'giza-plateau': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCao0_zDTQ8frEJZNDu_1tm-2N4fczbSoYCt6ac4edUah5oV9SbFC7p7q8VacMNwgF7Pwxikq1qjB9GQ-_aCIDgMOu_F-_Xo26nxq2PxOn02XJSCNquHBHi49acxYauO6VY7PobKN0gABl36WJU_cU2iftmnc5jbBK6JmShVWWHnRaBl-WzR2mwRD6rxEWKuJYTCxRFT7GEQ1NGbmqfdhem5otkALIcQc56Kw6aaFiZ0JHF5YJAG1-oLg',
  'great-pyramid-of-khufu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLeJC8xYEENQkqcRtSKJpLQCbh_2i_CxLLKHqlT_DOdGIsAdf3qVvT4zXZyp6GmiY117UELL4Hs4nMuf4_lDcDuLw0irbrz6e8bVsZvQPyzNl1ZNcMLToDBHCd8mxr9cDEJFb-LAiOMUFh_eTA7XPJvxZgs0DIbpSigJPfMK6-DT-n1TxCZMcVeg2MS3wMYexs2cYT1VsMFJgzUuTZG9aYAjCLRDOWWwmxu-gXVidyaKtxIxD0KWLUSA',
  'great-sphinx-of-giza': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9drHxmx8bRzk3zmlT0j1kYyc146dhqMSaP-snw14QXhzYOfgMy5d67MmBO0qtcWFbkBv0J8yPEY2tPEZdRGsWhWq7tJdEq8YAIuXTbHV0i0I1QZH5Dmz-LqD-cnfSNrWPsL1FbKV3KborwqGf1NEs3SOA9kupHmyYX2sOlTzHFp0BEkJWDmCHvco644tQgAcIkenEoAI3m0N2n4eFLMPM7AHk70_GOTF-W_9_IknrdXbhofsbX9lQog',
  'grand-egyptian-museum': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
  'step-pyramid-of-djoser': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80',
  'serapeum-of-saqqara': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'red-pyramid-dahshur': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'bent-pyramid-dahshur': 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
  'memphis-open-air-museum': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'egyptian-museum-tahrir': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'nmec-cairo': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
  'museum-of-islamic-art-cairo': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1200&q=80',
  'coptic-museum-cairo': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'citadel-of-saladin': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'mosque-of-muhammad-ali': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1200&q=80',
  'al-muizz-street': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1200&q=80',
  'khan-el-khalili': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
  'sultan-hassan-mosque': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'al-rifai-mosque': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'mosque-of-ibn-tulun': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1200&q=80',
  'hanging-church-cairo': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'ben-ezra-synagogue': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1200&q=80',
  'baron-empain-palace': 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80',
  'manial-palace': 'https://images.unsplash.com/photo-1566836644047-97598835848c?auto=format&fit=crop&w=1200&q=80',
  'cairo-tower': 'https://images.unsplash.com/photo-1548625361-16a858525b6a?auto=format&fit=crop&w=1200&q=80',
  'abdeen-palace': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'bibliotheca-alexandrina': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  'citadel-of-qaitbay': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOhSstqQQpcxDt_yyuWijEct_47y3YUwMMtcpHL_MqiJ-drsm20HSaTtjFb7E3B7QrcF-HZRpBmhE15EgUB2R8uZVJo8_LBzE2cdd3cfQo3h7f6MD5w6kF4eGWfI2UfsgXy58pQYN1O9qVQ35XGrg7VJ_o05KdCmbNlG85TFP0qM80Z8GCMBNTiPSTNnuqGCBfrczspgLSDFhWu8QOHAgYqxFcq8GrAVG7bAgfLWVPUYaBc14gHuHuZQ',
  'catacombs-kom-el-shoqafa': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'pompeys-pillar': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'roman-theatre-kom-el-dikka': 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
  'montaza-gardens': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'royal-jewelry-museum': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'alexandria-national-museum': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'stanley-bridge': 'https://images.unsplash.com/photo-1548625361-16a858525b6a?auto=format&fit=crop&w=1200&q=80',
  'abu-al-abbas-al-mursi-mosque': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'karnak-temple-complex': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjHswjKZ4w5llNhT_LQ8FKm-EV9H1gPGDvsni1CYHUbKCu3AZVikHOewUdI7oNv3qWz0EYF2xUj3JuLFlakMaEo956vcvnv81u9QyPgZyjv0JqJQ4cjSakSVrpgP5GJzYDLzgathnMeFmZqlIpLE1hnd0XaSYRLnh1QFeWPFVAGFS9V4NBwwyhwIWYI6BmYJaqPXCrzXrLCVADDKHXAItcV6W664gCVrUTjPJMx8q805x4LMKjVT0PZg',
  'luxor-temple': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'valley-of-the-kings': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'temple-of-hatshepsut': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80',
  'colossi-of-memnon': 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
  'medinet-habu-temple': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'ramesseum': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'deir-el-medina': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
  'luxor-museum': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'dendera-temple-complex': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80',
  'temple-seti-i-abydos': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'temple-of-edfu': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'temple-of-kom-ombo': 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
  'temple-of-esna': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'philae-temple-complex': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjHswjKZ4w5llNhT_LQ8FKm-EV9H1gPGDvsni1CYHUbKCu3AZVikHOewUdI7oNv3qWz0EYF2xUj3JuLFlakMaEo956vcvnv81u9QyPgZyjv0JqJQ4cjSakSVrpgP5GJzYDLzgathnMeFmZqlIpLE1hnd0XaSYRLnh1QFeWPFVAGFS9V4NBwwyhwIWYI6BmYJaqPXCrzXrLCVADDKHXAItcV6W664gCVrUTjPJMx8q805x4LMKjVT0PZg',
  'unfinished-obelisk': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'nubian-museum': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'abu-simbel-temples': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'elephantine-island': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'gharb-soheil-nubian-village': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
  'aga-khan-mausoleum': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'aswan-high-dam': 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
  'kalabsha-temple': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'saint-catherine-monastery': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'mount-sinai': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'ras-mohammed-national-park': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  'naama-bay': 'https://images.unsplash.com/photo-1510414842594-a61782153f5b?auto=format&fit=crop&w=1200&q=80',
  'sharm-el-sheikh-old-market': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
  'blue-hole-dahab': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  'abu-galum-protectorate': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'colored-canyon': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'giftun-islands': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'hurghada-marina': 'https://images.unsplash.com/photo-1548625361-16a858525b6a?auto=format&fit=crop&w=1200&q=80',
  'el-gouna': 'https://images.unsplash.com/photo-1510414842594-a61782153f5b?auto=format&fit=crop&w=1200&q=80',
  'wadi-el-gemal-national-park': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'monastery-of-saint-anthony': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'monastery-of-saint-paul': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'wadi-al-hitan': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'wadi-el-rayan': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'qasr-qarun-temple': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'tunis-village-fayoum': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
  'lake-qarun': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'magic-lake-fayoum': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'shali-fortress': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'oracle-temple-amun-siwa': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80',
  'cleopatras-spring-siwa': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'white-desert-national-park': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'black-desert': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  'crystal-mountain-egypt': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'temple-of-hibis': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  'al-qasr-islamic-village': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
  'historic-rashid-rosetta': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1200&q=80',
  'tanis-archaeological-site': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'monasteries-wadi-el-natrun': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80',
  'monastery-saint-bishoy': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'qaitbay-citadel-rosetta': 'https://images.unsplash.com/photo-1548625361-16a858525b6a?auto=format&fit=crop&w=1200&q=80',
  'zaranik-protectorate': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'nabq-protected-area': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
};

// City definitions with English names and keys
const cityLookup = {
  'الجيزة': { en: 'Giza', key: 'giza' },
  'القاهرة': { en: 'Cairo', key: 'cairo' },
  'الإسكندرية': { en: 'Alexandria', key: 'alexandria' },
  'الأقصر': { en: 'Luxor', key: 'luxor' },
  'أسوان': { en: 'Aswan', key: 'aswan' },
  'قنا': { en: 'Qena', key: 'qena' },
  'سوهاج': { en: 'Sohag', key: 'sohag' },
  'جنوب سيناء': { en: 'South Sinai', key: 'south-sinai' },
  'شمال سيناء': { en: 'North Sinai', key: 'north-sinai' },
  'البحر الأحمر': { en: 'Red Sea', key: 'red-sea' },
  'الفيوم': { en: 'Fayoum', key: 'fayoum' },
  'مطروح': { en: 'Matrouh', key: 'matrouh' },
  'الوادي الجديد': { en: 'New Valley', key: 'new-valley' },
  'البحيرة': { en: 'Beheira', key: 'beheira' },
  'الشرقية': { en: 'Sharqia', key: 'sharqia' },
};

// Aliases mapping old IDs to new slugs
const aliasMapping = {
  'giza-plateau': 'giza-pyramids',
  'karnak-temple-complex': 'karnak-temple',
  'khan-el-khalili': 'khan-el-khalili',
  'philae-temple-complex': 'philae-temple',
  'citadel-of-qaitbay': 'qaitbay-citadel',
};

const finalPlaces = parsedPlaces.map((p, index) => {
  const specificImg = specificPhotos[p.slug] || p.image;
  const alias = aliasMapping[p.slug] || null;

  // Determine city details
  const cityInfo = cityLookup[p.city] || { en: p.city, key: p.city.toLowerCase().replace(/\s+/g, '-') };

  // Generate badges based on category and region
  const badges = [];
  const badgesEn = [];
  if (p.categoryKey === 'historical') {
    badges.push('حضارة وتاريخ');
    badgesEn.push('Ancient Civilizations');
  } else if (p.categoryKey === 'museum') {
    badges.push('متحف ومعارض');
    badgesEn.push('Museum & Exhibitions');
  } else if (p.categoryKey === 'religious') {
    badges.push('معلم ديني خالد');
    badgesEn.push('Sacred Landmark');
  } else if (p.categoryKey === 'nature') {
    badges.push('محمية طبيعية');
    badgesEn.push('Natural Protected Area');
  } else if (p.categoryKey === 'beach' || p.categoryKey === 'island') {
    badges.push('سياحة شاطئية');
    badgesEn.push('Coastal Destination');
  } else {
    badges.push('معلم سياحي بارز');
    badgesEn.push('Iconic Landmark');
  }

  // Quick info defaults
  const quickInfo = {
    hours: '08:00 ص - 05:00 م',
    hoursEn: '08:00 AM - 05:00 PM',
    hoursSub: 'يومياً طوال العام',
    hoursSubEn: 'Daily year-round',
    season: 'أكتوبر — مايو',
    seasonEn: 'October — May',
    seasonSub: 'أفضل أوقات الزيارة',
    seasonSubEn: 'Optimal travel period',
    duration: 'ساعتان إلى 3 ساعات',
    durationEn: '2 to 3 hours',
    durationSub: 'لجولة ممتعة ومتكاملة',
    durationSubEn: 'For a complete visit',
    payment: 'بطاقات إلكترونية وتذاكر',
    paymentEn: 'Electronic Cards & Tickets',
    paymentSub: 'بوابات الدخول الرسمية',
    paymentSubEn: 'Official ticketing gate',
  };

  const metrics = [
    { value: '4.8', label: 'تقييم الزوار' },
    { value: `${cityInfo.en}`, label: 'المحافظة / النطاق' },
    { value: '100%', label: 'تجربة موثقة' }
  ];

  const metricsEn = [
    { value: '4.8', label: 'Visitor Rating' },
    { value: `${cityInfo.en}`, label: 'Governorate' },
    { value: '100%', label: 'Verified Experience' }
  ];

  const tips = [
    {
      icon: 'schedule',
      title: 'الانطلاق صباحاً',
      titleEn: 'Morning Departure',
      desc: 'يُفضل الذهاب في الصباح الباكر للاستمتاع بالأجواء الهادئة وتفادي درجات الحرارة المرتفعة.',
      descEn: 'Arrive early in the morning for mild weather and calmer sightseeing.'
    },
    {
      icon: 'photo_camera',
      title: 'التصوير وتوثيق اللحظات',
      titleEn: 'Photography & Memories',
      desc: 'احرص على شحن الكاميرا أو هاتفك؛ فالموقع يضم زوايا معمارية وطبيعية استثنائية.',
      descEn: 'Keep your camera ready for remarkable architectural and natural photo opportunities.'
    }
  ];

  return {
    id: p.slug,
    slug: p.slug,
    alias: alias,
    name: p.name,
    nameEn: p.nameEn,
    city: p.city,
    cityEn: cityInfo.en,
    cityKey: cityInfo.key,
    locationShort: p.locationShort,
    locationShortEn: `${p.city}, Egypt`,
    category: p.category,
    categoryKey: p.categoryKey,
    categoryEn: p.categoryEn,
    rating: parseFloat(p.rating) || 4.8,
    reviewCount: p.reviewCount,
    coordinates: p.coordinates,
    latitude: p.latitude,
    longitude: p.longitude,
    mapsUrl: p.mapsUrl,
    badges: badges,
    badgesEn: badgesEn,
    image: specificImg,
    gallery: [
      {
        title: p.name,
        titleEn: p.nameEn,
        badge: p.category,
        badgeEn: p.categoryEn,
        url: specificImg,
        alt: `${p.name} - ${p.nameEn}`
      }
    ],
    quickInfo: quickInfo,
    description: p.description,
    historicalText: p.description,
    historicalTextEn: p.nameEn ? `${p.nameEn} — A prominent destination in ${cityInfo.en}, Egypt.` : p.description,
    metrics: metrics,
    metricsEn: metricsEn,
    tips: tips,
    is_published: true,
  };
});

// Update Giza Plateau (Place 1) with the full enriched original gallery
const gizaLead = finalPlaces[0];
if (gizaLead && gizaLead.slug === 'giza-plateau') {
  gizaLead.alias = 'giza-pyramids';
  gizaLead.rating = 4.9;
  gizaLead.reviewCount = '142,850';
  gizaLead.badges = ['تراث عالمي (اليونسكو)', 'عجائب الدنيا السبع', 'الأسرة الرابعة'];
  gizaLead.badgesEn = ['UNESCO World Heritage', 'Seven Wonders of the World', 'Fourth Dynasty'];
  gizaLead.gallery = [
    {
      title: 'الهرم الأكبر خوفو',
      titleEn: 'The Great Pyramid of Khufu',
      badge: 'خوفو',
      badgeEn: 'Khufu',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLeJC8xYEENQkqcRtSKJpLQCbh_2i_CxLLKHqlT_DOdGIsAdf3qVvT4zXZyp6GmiY117UELL4Hs4nMuf4_lDcDuLw0irbrz6e8bVsZvQPyzNl1ZNcMLToDBHCd8mxr9cDEJFb-LAiOMUFh_eTA7XPJvxZgs0DIbpSigJPfMK6-DT-n1TxCZMcVeg2MS3wMYexs2cYT1VsMFJgzUuTZG9aYAjCLRDOWWwmxu-gXVidyaKtxIxD0KWLUSA',
      alt: 'The Great Pyramid of Khufu viewed from base'
    },
    {
      title: 'هرم خفرع المتوج',
      titleEn: 'Pyramid of Khafre with Apex Casing',
      badge: 'خفرع',
      badgeEn: 'Khafre',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-JEDCXXp4rcFKjuHv9yU8rToLUfsBQTmLw9Ijksb2jmJjyqYcwQ06AcfOZts2cQH8i_7tGrdS-pj4QG79lnuC4nsdES7UXt1kukPgtqWYiwcWG1OU4jJyYN60vMdaTmOdLLkoMdJZaf9O8qLkLO9D_MxuohpTkg9WAPgLWJCp6liD2ayp4D-GZ8zOWBPyB872UZFBDrwlkUl7OOUQx9qQFw5gjd7Uxfv8dLr2O9WmUjmPCRpjYs53EA',
      alt: 'Pyramid of Khafre showcasing its iconic original limestone apex'
    },
    {
      title: 'أبو الهول العظيم',
      titleEn: 'The Great Sphinx of Giza',
      badge: 'أبو الهول',
      badgeEn: 'The Sphinx',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9drHxmx8bRzk3zmlT0j1kYyc146dhqMSaP-snw14QXhzYOfgMy5d67MmBO0qtcWFbkBv0J8yPEY2tPEZdRGsWhWq7tJdEq8YAIuXTbHV0i0I1QZH5Dmz-LqD-cnfSNrWPsL1FbKV3KborwqGf1NEs3SOA9kupHmyYX2sOlTzHFp0BEkJWDmCHvco644tQgAcIkenEoAI3m0N2n4eFLMPM7AHk70_GOTF-W_9_IknrdXbhofsbX9lQog',
      alt: 'Great Sphinx carved from bedrock'
    }
  ];
  gizaLead.metrics = [
    { value: '146.6م', label: 'ارتفاع خوفو الأصلي' },
    { value: '2.3M', label: 'كتلة حجرية جيرية' },
    { value: '73م', label: 'طول تمثال أبو الهول' }
  ];
  gizaLead.metricsEn = [
    { value: '146.6m', label: 'Khufu Original Height' },
    { value: '2.3M', label: 'Limestone Blocks' },
    { value: '73m', label: 'Great Sphinx Length' }
  ];
}

// Write the complete src/data/placesData.js
const fileContent = `/**
 * Discover Egypt — Master Curated Tourist Landmarks & Destinations
 * Total Destinations: ${finalPlaces.length} Verified Heritage & Travel Locations across Egypt
 */

export const PLACES_DATA = ${JSON.stringify(finalPlaces, null, 2)};

export const BRAND_PILLARS = [
  {
    icon: 'explore',
    title: 'Explore Authentically',
    titleAr: 'استكشف بأصالة',
    desc: 'جولات وتجارب واقعية تنبض بروح مصر الحقيقية وتفاصيلها العريقة.',
    descEn: 'Authentic tours and experiences capturing the true spirit and timeless details of Egypt.'
  },
  {
    icon: 'change_history',
    title: 'Rooted in Heritage',
    titleAr: 'متجذر في الحضارة',
    desc: 'أكثر من 7000 عام من السحر والآثار والمعابد الخالدة بين يديك.',
    descEn: 'Over 7,000 years of enchantment, monumental pyramids, and immortal temples in the palm of your hand.'
  },
  {
    icon: 'verified_user',
    title: 'Trusted & Reliable',
    titleAr: 'موثوق ومُعتمد',
    desc: 'معلومات رسمية، إرشادات محدثة، وتنسيق دقيق لرحلة ممتعة وآمنة.',
    descEn: 'Official verified information, updated travel guidelines, and accurate coordination for a seamless journey.'
  },
  {
    icon: 'navigation',
    title: 'Guiding Your Journey',
    titleAr: 'مرشدك في كل خطوة',
    desc: 'مسارات جغرافية ذكية وإحداثيات GPS مباشرة لأجمل الوجهات.',
    descEn: 'Intelligent geographic routes and direct GPS coordinates leading you to the finest destinations.'
  },
  {
    icon: 'favorite',
    title: 'Made for Egypt Lovers',
    titleAr: 'صُنع لعشاق مصر',
    desc: 'صُمم خصيصاً ليمنح كل زائر تجربة استثنائية لا تُنسى في أرض الكنانة.',
    descEn: 'Tailored with devotion to provide every explorer an unforgettable, magical voyage through Egypt.'
  }
];
`;

fs.writeFileSync('src/data/placesData.js', fileContent, 'utf-8');
console.log(`Generated src/data/placesData.js with ${finalPlaces.length} places successfully.`);
