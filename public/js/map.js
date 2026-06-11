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

let map = null;
let geoLayer = null;
let currentStats = null;

function getCountryStats(statsCountries, a2) {
  if (!statsCountries || !a2) return null;
  return statsCountries[a2] || statsCountries[a2.toUpperCase()] || statsCountries[a2.toLowerCase()] || null;
}

function getColor(count, maxCount) {
  if (!count || count === 0) return '#1a1a2e';
  if (maxCount === 0) return '#1a1a2e';
  const t = Math.log(count + 1) / Math.log(maxCount + 1);
  if (t < 0.2) return '#fee08b';
  if (t < 0.4) return '#fdae61';
  if (t < 0.6) return '#f46d43';
  if (t < 0.8) return '#d73027';
  return '#a50026';
}

export async function initMap(containerId, stats) {
  currentStats = stats;
  if (map) { map.remove(); map = null; geoLayer = null; }

  map = L.map(containerId, { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);
  map.setView([20, 0], 2);

  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    const topo = await res.json();
    const geo = topojson.feature(topo, topo.objects.countries);

    const maxCount = Math.max(...Object.values(stats.countries || {}).map(c => c.count), 1);

    geoLayer = L.geoJSON(geo, {
      style: feature => {
        const numId = String(feature.id).padStart(3, '0');
        const a2 = ISO_NUM_TO_A2[numId];
        const country = getCountryStats(stats.countries || {}, a2);
        const count = country ? country.count : 0;
        return {
          fillColor: getColor(count, maxCount),
          fillOpacity: 0.8,
          color: '#2a2a4a',
          weight: 0.5
        };
      },
      onEachFeature: (feature, layer) => {
        const numId = String(feature.id).padStart(3, '0');
        const a2 = ISO_NUM_TO_A2[numId];
        const country = getCountryStats(stats.countries || {}, a2);
        layer.on({
          mouseover: e => {
            e.target.setStyle({ weight: 2, color: '#e94560' });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
          },
          mouseout: e => geoLayer && geoLayer.resetStyle(e.target),
          click: e => {
            const name = country ? country.name : (a2 || 'Unknown');
            const count = country ? country.count : 0;
            const pct = country ? country.percent.toFixed(2) : '0.00';
            L.popup().setLatLng(e.latlng)
              .setContent(`<b>${name}</b><br>${count.toLocaleString()} IPs (${pct}%)`)
              .openOn(map);
          }
        });
      }
    }).addTo(map);

    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.cssText = 'background:#1a1a2e;padding:8px 12px;border-radius:8px;border:1px solid #2a2a4a;color:#eaeaea;font-size:12px';
      div.innerHTML = '<b>IPs par pays</b><br>' +
        ['#fee08b','#fdae61','#f46d43','#d73027','#a50026'].map((c,i) =>
          `<span style="display:inline-block;width:12px;height:12px;background:${c};margin-right:4px;border-radius:2px"></span>${['Faible','','Moyen','','Élevé'][i]}<br>`
        ).join('');
      return div;
    };
    legend.addTo(map);
  } catch (err) {
    console.warn('Map geo data failed:', err);
  }
}

export function updateMap(stats) {
  if (!map || !geoLayer) { return; }
  currentStats = stats;
  const maxCount = Math.max(...Object.values(stats.countries || {}).map(c => c.count), 1);
  geoLayer.setStyle(feature => {
    const numId = String(feature.id).padStart(3, '0');
    const a2 = ISO_NUM_TO_A2[numId];
    const country = getCountryStats(stats.countries || {}, a2);
    return {
      fillColor: getColor(country ? country.count : 0, maxCount),
      fillOpacity: 0.8, color: '#2a2a4a', weight: 0.5
    };
  });
}

export function destroyMap() {
  if (map) { map.remove(); map = null; geoLayer = null; }
}
