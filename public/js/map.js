const ISO_NUM_TO_A2 = {
  '004':'AF','008':'AL','012':'DZ','016':'AS','020':'AD','024':'AO','028':'AG','032':'AR',
  '036':'AU','040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE',
  '060':'BM','064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','086':'IO',
  '090':'SB','092':'VG','096':'BN','100':'BG','104':'MM','108':'BI','112':'BY','116':'KH',
  '120':'CM','124':'CA','132':'CV','136':'KY','140':'CF','144':'LK','148':'TD','152':'CL',
  '156':'CN','158':'TW','170':'CO','174':'KM','175':'YT','178':'CG','180':'CD','184':'CK',
  '188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ','208':'DK','212':'DM',
  '214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE','238':'FK',
  '242':'FJ','246':'FI','248':'AX','250':'FR','254':'GF','258':'PF','262':'DJ','266':'GA',
  '268':'GE','270':'GM','275':'PS','276':'DE','288':'GH','292':'GI','296':'KI','300':'GR',
  '304':'GL','308':'GD','312':'GP','316':'GU','320':'GT','324':'GN','328':'GY','332':'HT',
  '334':'HM','340':'HN','344':'HK','348':'HU','356':'IN','360':'ID','364':'IR','368':'IQ',
  '372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO',
  '404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS',
  '428':'LV','430':'LR','434':'LY','438':'LI','440':'LT','442':'LU','446':'MO','450':'MG',
  '454':'MW','458':'MY','462':'MV','466':'ML','470':'MT','474':'MQ','478':'MR','480':'MU',
  '484':'MX','492':'MC','496':'MN','498':'MD','499':'ME','500':'MS','504':'MA','508':'MZ',
  '516':'NA','520':'NR','524':'NP','528':'NL','531':'CW','533':'AW','535':'BQ','540':'NC',
  '548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','570':'NU','574':'NF','578':'NO',
  '580':'MP','583':'FM','584':'MH','585':'PW','586':'PK','591':'PA','598':'PG','600':'PY',
  '604':'PE','608':'PH','612':'PN','616':'PL','620':'PT','624':'GW','626':'TL','630':'PR',
  '634':'QA','638':'RE','642':'RO','643':'RU','646':'RW','652':'BL','654':'SH','659':'KN',
  '660':'AI','662':'LC','663':'MF','666':'PM','670':'VC','674':'SM','678':'ST','682':'SA',
  '686':'SN','688':'RS','690':'SC','694':'SL','703':'SK','705':'SI','706':'SO','710':'ZA',
  '716':'ZW','724':'ES','728':'SS','729':'SD','740':'SR','744':'SJ','748':'SZ','752':'SE',
  '756':'CH','760':'SY','762':'TJ','764':'TH','768':'TG','772':'TK','776':'TO','780':'TT',
  '784':'AE','788':'TN','792':'TR','795':'TM','796':'TC','798':'TV','800':'UG','804':'UA',
  '807':'MK','818':'EG','826':'GB','831':'GG','832':'JE','833':'IM','834':'TZ','840':'US',
  '850':'VI','854':'BF','858':'UY','860':'UZ','862':'VE','876':'WF','882':'WS','887':'YE',
  '894':'ZM'
};

let rootEl = null;
let svgEl = null;
let countriesGeo = null;

let d3Geo = null;
let topojson = null;
let libsPromise = null;

const ALL_ISO_A2 = [...new Set(Object.values(ISO_NUM_TO_A2))];

function loadLibraries() {
  if (!libsPromise) {
    libsPromise = Promise.all([
      import('https://esm.sh/d3-geo@3.1.1'),
      import('https://esm.sh/topojson-client@3.1.0')
    ]).then(([d3m, topom]) => {
      d3Geo = d3m;
      topojson = topom;
    });
  }
  return libsPromise;
}

function normalizeCountryName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCountryCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function buildCountryNameIndex() {
  const index = Object.create(null);
  const displayNames = [];

  try { displayNames.push(new Intl.DisplayNames(['en'], { type: 'region' })); } catch {}
  try { displayNames.push(new Intl.DisplayNames(['fr'], { type: 'region' })); } catch {}

  ALL_ISO_A2.forEach(code => {
    index[code] = code;
    displayNames.forEach(dn => {
      const label = dn.of(code);
      if (label) index[normalizeCountryName(label)] = code;
    });
  });

  return index;
}

function resolveCountryCode(country, nameIndex) {
  if (!country) return '';
  const code = normalizeCountryCode(country.code);
  if (code) return code;

  const name = normalizeCountryName(country.name || '');
  if (name && nameIndex[name]) return nameIndex[name];

  const key = normalizeCountryName(country.key || '');
  if (key && nameIndex[key]) return nameIndex[key];

  return '';
}

function buildCountryIndex(statsCountries, nameIndex) {
  const index = Object.create(null);
  Object.entries(statsCountries || {}).forEach(([key, country]) => {
    if (!country) return;
    const resolved = resolveCountryCode({ ...country, key }, nameIndex) || normalizeCountryCode(key);
    if (resolved) index[resolved] = country;
  });
  return index;
}

function getColor(count, maxCount) {
  if (!count || count === 0) return '#101828';
  if (maxCount === 0) return '#101828';
  const t = Math.log(count + 1) / Math.log(maxCount + 1);
  if (t < 0.2) return '#fee08b';
  if (t < 0.4) return '#fdae61';
  if (t < 0.6) return '#f46d43';
  if (t < 0.8) return '#d73027';
  return '#a50026';
}

function clearContainer(container) {
  container.innerHTML = '';
  rootEl = document.createElement('div');
  rootEl.style.width = '100%';
  rootEl.style.height = '100%';
  rootEl.style.display = 'flex';
  rootEl.style.flexDirection = 'column';
  rootEl.style.gap = '8px';

  svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('viewBox', '0 0 1000 480');
  svgEl.style.background = '#0b1220';
  svgEl.style.border = '1px solid #2a2a4a';
  svgEl.style.borderRadius = '10px';

  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:#eaeaea;font-size:12px';
  legend.innerHTML = '<b>IPs par pays</b>' +
    ['#fee08b','#fdae61','#f46d43','#d73027','#a50026'].map((c, i) =>
      `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:${c};display:inline-block;border-radius:2px"></span>${['faible','','moyen','','eleve'][i]}</span>`
    ).join('');

  rootEl.appendChild(svgEl);
  rootEl.appendChild(legend);
  container.appendChild(rootEl);
}

function renderChoropleth(stats) {
  if (!svgEl || !countriesGeo || !d3Geo) return;

  const statsCountries = stats.countries || {};
  const maxCount = Math.max(...Object.values(statsCountries).map(c => c.count), 1);
  const nameIndex = buildCountryNameIndex();
  const countryIndex = buildCountryIndex(statsCountries, nameIndex);

  const projection = d3Geo.geoNaturalEarth1().fitExtent([[8, 8], [992, 472]], countriesGeo);
  const path = d3Geo.geoPath(projection);

  const borderPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  borderPath.setAttribute('d', path({ type: 'Sphere' }) || '');
  borderPath.setAttribute('fill', '#0b1220');
  borderPath.setAttribute('stroke', '#334155');
  borderPath.setAttribute('stroke-width', '0.6');
  svgEl.appendChild(borderPath);

  for (const feature of countriesGeo.features) {
    const numId = String(feature.id).padStart(3, '0');
    const a2 = ISO_NUM_TO_A2[numId];
    const country = a2 ? countryIndex[a2] : null;
    const count = country ? country.count : 0;

    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path(feature) || '');
    p.setAttribute('fill', getColor(count, maxCount));
    p.setAttribute('stroke', '#1f2937');
    p.setAttribute('stroke-width', '0.45');
    svgEl.appendChild(p);
  }
}

export async function initMap(containerId, stats) {
  const container = document.getElementById(containerId);
  if (!container) return;

  clearContainer(container);

  try {
    await loadLibraries();
    if (!countriesGeo) {
      const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
      const topo = await res.json();
      countriesGeo = topojson.feature(topo, topo.objects.countries);
    }
    renderChoropleth(stats);
  } catch (err) {
    container.innerHTML = '<div style="color:#fca5a5;padding:12px">Impossible de charger la carte.</div>';
    console.warn('Static map render failed:', err);
  }
}

export function updateMap(stats) {
  if (!svgEl) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  renderChoropleth(stats);
}

export function destroyMap() {
  if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  rootEl = null;
  svgEl = null;
}
