/**
 * AEGIS // GEOPOLITICAL CYBER-WAR ROOM DASHBOARD
 * Core Frontend Application Logic: Leaflet Map, Chart.js Integrations,
 * Bilateral Conflict Matrix, Dynamic Intelligence Dossier & Escalation Simulator.
 */

// Global State
const State = {
  data: null,
  activePair: null,
  activeCountry: null,
  activeTab: 'pair', // 'pair' or 'country'
  filter: 'ALL',
  searchQuery: '',
  map: null,
  markers: {},
  polylines: {},
  cyprusOverlayGroup: null,
  charts: {
    tone: null,
    military: null,
    countryMil: null
  }
};

// Tactical Color Mapping
const Colors = {
  CRITICAL: '#ff2b3e',
  HIGH: '#ff7700',
  ELEVATED: '#ffbb00',
  MODERATE: '#00e5ff',
  LOW: '#00ff88',
  NEON_CYAN: '#00e5ff',
  BACKGROUND_DARK: '#07080b'
};

// ==========================================================================
// INITIALIZATION ENTRY POINT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initMap();
  initFilterControls();
  initTabs();
  initPanelToggles();
  loadData();
});

// Real-time UTC System Clock
function initClock() {
  const clockEl = document.getElementById('liveUtcClock');
  function update() {
    const now = new Date();
    const utcStr = now.toUTCString().split(' ')[4] + ' UTC';
    if (clockEl) clockEl.textContent = utcStr;
  }
  update();
  setInterval(update, 1000);
}

// ==========================================================================
// COLLAPSIBLE PANELS LOGIC (SOL VE SAĞ PANEL AÇMA/KAPAMA)
// ==========================================================================
function initPanelToggles() {
  const btnCollapseLeft = document.getElementById('btnCollapseLeft');
  const floatingToggleLeft = document.getElementById('floatingToggleLeft');
  const hudToggleLeft = document.getElementById('hudToggleLeft');

  const btnCollapseRight = document.getElementById('btnCollapseRight');
  const floatingToggleRight = document.getElementById('floatingToggleRight');
  const hudToggleRight = document.getElementById('hudToggleRight');

  // Sol Panel Düğmeleri
  if (btnCollapseLeft) {
    btnCollapseLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLeftPanel();
    });
  }
  if (floatingToggleLeft) {
    floatingToggleLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLeftPanel();
    });
  }
  if (hudToggleLeft) {
    hudToggleLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLeftPanel();
    });
  }

  // Sağ Panel Düğmeleri
  if (btnCollapseRight) {
    btnCollapseRight.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRightPanel();
    });
  }
  if (floatingToggleRight) {
    floatingToggleRight.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRightPanel();
    });
  }
  if (hudToggleRight) {
    hudToggleRight.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRightPanel();
    });
  }
}

function toggleLeftPanel(forceOpen = null) {
  const panel = document.getElementById('hotspotPanel');
  const floatBtn = document.getElementById('floatingToggleLeft');
  const hudBtn = document.getElementById('hudToggleLeft');
  const btnCollapse = document.getElementById('btnCollapseLeft');
  if (!panel) return;

  const willOpen = forceOpen !== null ? forceOpen : panel.classList.contains('collapsed');

  if (willOpen) {
    panel.classList.remove('collapsed');
    if (btnCollapse) btnCollapse.textContent = '◀';
    if (hudBtn) hudBtn.classList.add('active');
    if (floatBtn) {
      floatBtn.classList.remove('panel-closed');
      floatBtn.innerHTML = '<i class="fa-solid fa-table-list"></i><span>KRİZ MATRİSİ</span>';
      floatBtn.title = "Kriz Matrisini Gizle";
    }
  } else {
    panel.classList.add('collapsed');
    if (btnCollapse) btnCollapse.textContent = '▶';
    if (hudBtn) hudBtn.classList.remove('active');
    if (floatBtn) {
      floatBtn.classList.add('panel-closed');
      floatBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i><span>MATRİSİ AÇ</span>';
      floatBtn.title = "Kriz Matrisini Aç";
    }
  }

  triggerMapResize();
}

function toggleRightPanel(forceOpen = null) {
  const panel = document.getElementById('intelligenceSidebar');
  const floatBtn = document.getElementById('floatingToggleRight');
  const hudBtn = document.getElementById('hudToggleRight');
  const btnCollapse = document.getElementById('btnCollapseRight');
  if (!panel) return;

  const willOpen = forceOpen !== null ? forceOpen : panel.classList.contains('collapsed');

  if (willOpen) {
    panel.classList.remove('collapsed');
    if (btnCollapse) btnCollapse.textContent = '▶';
    if (hudBtn) hudBtn.classList.add('active');
    if (floatBtn) {
      floatBtn.classList.remove('panel-closed');
      floatBtn.innerHTML = '<i class="fa-solid fa-chart-column"></i><span>İSTİHBARAT DOSYASI</span>';
      floatBtn.title = "İstihbarat Dosyasını Gizle";
    }
  } else {
    panel.classList.add('collapsed');
    if (btnCollapse) btnCollapse.textContent = '◀';
    if (hudBtn) hudBtn.classList.remove('active');
    if (floatBtn) {
      floatBtn.classList.add('panel-closed');
      floatBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i><span>İSTİHBARATI AÇ</span>';
      floatBtn.title = "İstihbarat Dosyasını Aç";
    }
  }

  triggerMapResize();
}

function triggerMapResize() {
  if (!State.map) return;
  // Panel animasyonu esnasında ve bittiğinde Leaflet viewport'unu yenile
  setTimeout(() => {
    State.map.invalidateSize({ pan: false });
  }, 60);
  setTimeout(() => {
    State.map.invalidateSize({ pan: false });
  }, 380);
}

// ==========================================================================
// DATA LOADING LAYER (With Multi-Path Fallback for GitHub Pages & Local)
// ==========================================================================
async function loadData() {
  // Olası veri yolları: GitHub Pages root veya yerel klasör
  const possiblePaths = [
    'data/risk_outputs.json',
    './data/risk_outputs.json',
    '../data/risk_outputs.json',
    '/data/risk_outputs.json'
  ];

  let rawData = null;
  for (const path of possiblePaths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        rawData = await res.json();
        console.log(`[AEGIS] Başarıyla yüklendi: ${path}`);
        break;
      }
    } catch (e) {
      // sonraki yolu dene
    }
  }

  if (!rawData) {
    console.warn('[AEGIS] Veri dosyası doğrudan çekilemedi, acil durum veri yükleyicisi devreye alınıyor.');
    renderErrorState('Veri matrisi bulunamadı. Lütfen fetch_data.py ve process_risk.py çalıştırıldığından emin olun.');
    return;
  }

  State.data = rawData;
  updateTopHudCounters(rawData.metadata);
  renderPairsList();
  renderMapElements();

  // İlk varsayılan kritik kriz çiftini seç
  if (rawData.pairs && rawData.pairs.length > 0) {
    selectPair(rawData.pairs[0].id);
  }
}

function renderErrorState(msg) {
  const container = document.getElementById('pairsListContainer');
  if (container) {
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--neon-red); font-family: var(--font-mono); font-size: 0.8rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.8rem;"></i>
        <div>${msg}</div>
      </div>
    `;
  }
}

// ==========================================================================
// TOP HUD TELEMETRY COUNTERS
// ==========================================================================
function updateTopHudCounters(meta) {
  if (!meta) return;

  const critEl = document.getElementById('statCriticalCount');
  const pairsEl = document.getElementById('statMonitoredPairs');
  const avgEl = document.getElementById('statGlobalAvg');
  const defconLevel = document.getElementById('defconLevelText');
  const defconStatus = document.getElementById('defconStatusText');

  if (critEl) critEl.textContent = meta.critical_count ?? '--';
  if (pairsEl) pairsEl.textContent = meta.monitored_pairs ?? '--';
  if (avgEl) avgEl.textContent = `${meta.global_cri_average ?? '--'} / 100`;

  if (meta.critical_count > 0) {
    if (defconLevel) defconLevel.textContent = 'DEFCON 1';
    if (defconStatus) defconStatus.textContent = 'KRİTİK SICAK ÇATIŞMA TEHDİDİ';
  } else if (meta.high_count > 0) {
    if (defconLevel) defconLevel.textContent = 'DEFCON 2';
    if (defconStatus) defconStatus.textContent = 'YÜKSEK ASKERİ YIĞINAK';
  }
}

// ==========================================================================
// TACTICAL LEAFLET MAP
// ==========================================================================
function initMap() {
  // Leaflet haritasını oluştur - CartoDB Dark Matter tabanlı
  State.map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 9
  }).setView([28.0, 42.0], 3);

  // CARTO Basemaps API Key (Kişiselleştirilmiş lisans anahtarı)
  const CARTO_API_KEY = 'cb1_43sk_1_5d98ca50e8986be54b191b4f';
  const cartoDarkUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;

  // Orijinal CARTO Dark Matter Harita Katmanı (Filigransız)
  L.tileLayer(cartoDarkUrl, {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(State.map);

  // Zoom kontrollerini sağ alt köşeye al
  L.control.zoom({ position: 'bottomright' }).addTo(State.map);
}

function renderMapElements() {
  if (!State.map || !State.data) return;

  const { pairs, country_profiles } = State.data;

  // 1. Ülke Merkezleri ve Yanıp Sönen Radar Markerları
  Object.values(country_profiles).forEach(country => {
    const color = country.color || Colors.MODERATE;

    // Özel SVG radar simgesi
    const customIcon = L.divIcon({
      className: 'radar-marker-container',
      html: `
        <div class="radar-marker" style="--marker-color: ${color};">
          <div class="radar-marker-ring"></div>
          <div class="radar-marker-core"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const capitalInfo = country.capital ? `Başkent: ${country.capital}` : '';
    const marker = L.marker([country.lat, country.lon], { icon: customIcon }).addTo(State.map);

    // Marker tooltip
    marker.bindTooltip(`
      <div style="font-family: var(--font-mono); font-size: 0.75rem;">
        <strong style="color: #fff; font-family: var(--font-hud);">${country.name} (${country.code})</strong><br>
        <span style="color: var(--neon-cyan);">${capitalInfo}</span><br>
        <span style="color: ${color}; font-weight: bold;">Tehdit: ${country.max_risk_score}/100 [${country.threat_level}]</span><br>
        <span style="color: var(--text-secondary);">Askeri/GSYİH: %${country.military_gdp_pct}</span>
      </div>
    `, {
      direction: 'top',
      offset: [0, -10],
      className: 'cyber-tooltip'
    });

    marker.on('click', () => {
      selectCountry(country.code);
    });

    State.markers[country.code] = marker;
  });

  // 2. Çatışma Çiftleri Arasındaki Kinetik Gerilim Hatları (Başkentleri Bağlayan Vektörler)
  pairs.forEach(pair => {
    const latlngs = [pair.coordinates.a, pair.coordinates.b];
    const color = pair.color || Colors.MODERATE;

    const polyline = L.polyline(latlngs, {
      color: color,
      weight: Math.max(2, (pair.cri_score / 100) * 5),
      opacity: 0.8,
      dashArray: '6, 8',
      lineCap: 'round'
    }).addTo(State.map);

    polyline.bindTooltip(`
      <div style="font-family: var(--font-mono); font-size: 0.75rem;">
        <strong style="color: #fff;">${pair.country_a_name} ⚔️ ${pair.country_b_name}</strong><br>
        <span style="color: var(--neon-cyan); font-size: 0.7rem;">Başkentler Arası Kinetik Gerilim Hattı</span><br>
        <span style="color: ${color}; font-weight: bold;">CRI: ${pair.cri_score} // ${pair.status_tr}</span>
      </div>
    `, { sticky: true });

    polyline.on('click', () => {
      selectPair(pair.id);
    });

    State.polylines[pair.id] = polyline;
  });

  // 3. Kıbrıs Adası Taktik Ayrım & Yeşil Hat (BM Tampon Bölgesi) Katmanı
  renderCyprusTacticalOverlay();
}

function renderCyprusTacticalOverlay() {
  if (!State.map) return;

  if (!State.cyprusOverlayGroup) {
    State.cyprusOverlayGroup = L.layerGroup();
  } else {
    State.cyprusOverlayGroup.clearLayers();
  }

  // BM Yeşil Hat & KKTC Fiili Sınırı (126 Noktalı Gerçek Jeodezik Sınır Hattı)
  const realGreenLineCoords = [
    [35.1816, 32.7114], [35.1753, 32.7106], [35.1634, 32.7127], [35.1534, 32.7206],
    [35.1432, 32.7315], [35.1378, 32.744],  [35.1338, 32.7596], [35.1268, 32.7948],
    [35.1166, 32.8143], [35.1002, 32.8299], [35.0799, 32.8392], [35.0792, 32.8549],
    [35.0878, 32.861],  [35.098, 32.8704],  [35.1002, 32.8767], [35.1026, 32.8884],
    [35.1002, 32.9118], [35.0987, 32.9227], [35.1002, 32.9344], [35.1026, 32.9469],
    [35.1128, 32.9695], [35.1314, 32.9891], [35.1416, 33.014],  [35.1494, 33.0311],
    [35.1557, 33.0561], [35.1651, 33.0787], [35.1697, 33.0958], [35.1588, 33.1091],
    [35.1603, 33.1201], [35.1806, 33.1419], [35.1853, 33.1575], [35.1899, 33.1903],
    [35.1791, 33.224],  [35.1713, 33.2402], [35.169, 33.2708],  [35.1627, 33.2996],
    [35.1619, 33.3153], [35.1666, 33.3262], [35.1666, 33.3448], [35.1743, 33.3745],
    [35.1783, 33.3808], [35.1884, 33.3885], [35.1977, 33.4003], [35.1994, 33.4135],
    [35.1939, 33.4214], [35.1822, 33.4245], [35.1681, 33.4277], [35.1487, 33.44],
    [35.1322, 33.451],  [35.1042, 33.4698], [35.0948, 33.4768], [35.0768, 33.4768],
    [35.0574, 33.4768], [35.0385, 33.4713], [35.0144, 33.4658], [35.0051, 33.4666],
    [35.0027, 33.4768], [35.009, 33.4768],  [35.0191, 33.4783], [35.0316, 33.4814],
    [35.0385, 33.4862], [35.0566, 33.4939], [35.0613, 33.5002], [35.0613, 33.5072],
    [35.0597, 33.5164], [35.0558, 33.529],  [35.0566, 33.5352], [35.0667, 33.5368],
    [35.0731, 33.5407], [35.0731, 33.5469], [35.0667, 33.5555], [35.0582, 33.5618],
    [35.0433, 33.5664], [35.0355, 33.579],  [35.0339, 33.5915], [35.0417, 33.6023],
    [35.0464, 33.6141], [35.0308, 33.6375], [35.0308, 33.6522], [35.0324, 33.6561],
    [35.0308, 33.671],  [35.0339, 33.6794], [35.037, 33.6756],  [35.0464, 33.6741],
    [35.0558, 33.6789], [35.0582, 33.6945], [35.0667, 33.7053], [35.0667, 33.7147],
    [35.0628, 33.7194], [35.041, 33.7115],  [35.0293, 33.7076], [35.0324, 33.7185],
    [35.0472, 33.7397], [35.0316, 33.7661], [35.0402, 33.7755], [35.0385, 33.7865],
    [35.0402, 33.7944], [35.0526, 33.7983], [35.0667, 33.824],  [35.0636, 33.8349],
    [35.0566, 33.8427], [35.0582, 33.8536], [35.0667, 33.8669], [35.0731, 33.8716],
    [35.0768, 33.8769], [35.0855, 33.8716], [35.1002, 33.8716], [35.119, 33.8762],
    [35.119, 33.8894],  [35.1105, 33.8918], [35.1088, 33.8988], [35.0995, 33.9036],
    [35.0964, 33.9059], [35.0909, 33.9059], [35.0909, 33.9136], [35.0807, 33.9215],
    [35.0731, 33.9144], [35.0707, 33.9082], [35.0691, 33.9065], [35.0659, 33.9129],
    [35.0628, 33.9254], [35.0597, 33.9411], [35.0683, 33.9629], [35.0597, 34.0089],
    [35.0638, 34.0123]
  ];

  // Erenköy (Kokkina) Askeri Eksklav Sınırı
  const kokkinaCoords = [
    [35.1871, 32.6407], [35.1786, 32.6019], [35.1634, 32.6152]
  ];

  const greenLine = L.polyline(realGreenLineCoords, {
    color: '#00e5ff',
    weight: 2,
    dashArray: '4, 4',
    opacity: 0.85,
    lineCap: 'round',
    lineJoin: 'round'
  });

  const kokkinaLine = L.polyline(kokkinaCoords, {
    color: '#00e5ff',
    weight: 2,
    dashArray: '4, 4',
    opacity: 0.85
  });

  greenLine.bindTooltip(`
    <div style="font-family: var(--font-mono); font-size: 0.75rem;">
      <strong style="color: var(--neon-cyan);">BM Yeşil Hat / KKTC Fiili Sınırı</strong><br>
      <span style="color: #bbb;">1974 Ateşkes Hattı & BM Barış Gücü Tampon Bölgesi</span>
    </div>
  `, { sticky: true });

  // Ülke İsimleri: Harita üzerindeki diğer ülke isimleriyle (CartoDB Dark Matter) birebir aynı ton, boyut ve font
  const trncLabel = L.marker([35.26, 33.50], {
    icon: L.divIcon({
      className: 'map-country-label',
      html: '<div id="trncMapLabelText" class="map-country-label-text">KKTC</div>',
      iconSize: [140, 18],
      iconAnchor: [70, 9]
    })
  });
  trncLabel.on('click', () => selectCountry('TRNC'));

  const cyLabel = L.marker([34.88, 33.15], {
    icon: L.divIcon({
      className: 'map-country-label',
      html: '<div id="cyMapLabelText" class="map-country-label-text">GÜNEY KIBRIS</div>',
      iconSize: [140, 18],
      iconAnchor: [70, 9]
    })
  });
  cyLabel.on('click', () => selectCountry('CY'));

  State.cyprusOverlayGroup.addLayer(greenLine);
  State.cyprusOverlayGroup.addLayer(kokkinaLine);
  State.cyprusOverlayGroup.addLayer(trncLabel);
  State.cyprusOverlayGroup.addLayer(cyLabel);

  // Zoom seviyesi kontrolü:
  // Diğer ülkeler gibi harita uzakken (yalnızca kıtalar veya büyük bölgeler görünürken - zoom < 7) GİZLE,
  // Harita adaya/bölgeye yaklaştırıldığında (zoom >= 7) GÖSTER.
  function updateCyprusVisibility() {
    if (!State.map || !State.cyprusOverlayGroup) return;
    const zoom = State.map.getZoom();

    if (zoom < 7) {
      if (State.map.hasLayer(State.cyprusOverlayGroup)) {
        State.map.removeLayer(State.cyprusOverlayGroup);
      }
    } else {
      if (!State.map.hasLayer(State.cyprusOverlayGroup)) {
        State.map.addLayer(State.cyprusOverlayGroup);
      }
      const trncEl = document.getElementById('trncMapLabelText');
      if (trncEl) {
        trncEl.textContent = zoom >= 8 ? 'KUZEY KIBRIS (KKTC)' : 'KKTC';
      }
    }
  }

  State.map.off('zoomend', updateCyprusVisibility);
  State.map.on('zoomend', updateCyprusVisibility);

  // İlk durumu zoom seviyesine göre uygula
  updateCyprusVisibility();
}

// ==========================================================================
// HOTSPOTS LIST & FILTERING (LEFT PANEL)
// ==========================================================================
function initFilterControls() {
  const searchInput = document.getElementById('pairSearchInput');
  const filterButtons = document.querySelectorAll('.filter-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase().trim();
      renderPairsList();
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.filter = btn.getAttribute('data-filter');
      renderPairsList();
    });
  });
}

function renderPairsList() {
  const container = document.getElementById('pairsListContainer');
  const countEl = document.getElementById('activePairsCount');
  if (!container || !State.data) return;

  const pairs = State.data.pairs;

  // Filtreleme mantığı
  const filtered = pairs.filter(p => {
    const matchesFilter = (State.filter === 'ALL') || (p.threat_level === State.filter);
    const query = State.searchQuery;
    const matchesSearch = !query ||
      p.country_a_name.toLowerCase().includes(query) ||
      p.country_b_name.toLowerCase().includes(query) ||
      p.country_a.toLowerCase().includes(query) ||
      p.country_b.toLowerCase().includes(query) ||
      p.region.toLowerCase().includes(query) ||
      p.historical_dispute.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  if (countEl) countEl.textContent = `${filtered.length} Aktif`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">
        Eşleşen kriz noktası bulunamadı.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isActive = State.activePair && State.activePair.id === p.id;
    const color = p.color || Colors.MODERATE;
    const comp = p.components;

    return `
      <div class="pair-card ${isActive ? 'active' : ''}" 
           style="--card-accent: ${color};" 
           onclick="selectPair('${p.id}')">
        <div class="pair-top-row">
          <div class="pair-countries-title">
            <span class="country-full-name">${p.country_a_name}</span>
            <span class="vs-swords">⚔️</span>
            <span class="country-full-name">${p.country_b_name}</span>
          </div>
          <div class="pair-cri-score" style="color: ${color};">
            ${p.cri_score}
          </div>
        </div>

        <div class="pair-meta-row">
          <span class="pair-region-label"><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${p.region}</span>
          <span class="tier-badge" style="background: rgba(${hexToRgb(color)}, 0.15); color: ${color}; border: 1px solid ${color};">
            DEFCON ${p.defcon} - ${p.status_tr}
          </span>
        </div>

        <!-- Bileşen Dağılım Çubuğu (Medya %40, Ekonomi %30, Askeri %20, Siber %10) -->
        <div class="card-breakdown-bar" title="Medya: ${comp.media_tension.score} | Ekonomi: ${comp.economic_vulnerability.score} | Askeri: ${comp.military_readiness.score} | Siber: ${comp.cyber_and_alliances.score}">
          <div class="card-breakdown-segment" style="width: 40%; background: #ff2b3e;" title="Medya Gerilimi"></div>
          <div class="card-breakdown-segment" style="width: 30%; background: #ffaa00;" title="Ekonomik Bağımlılık"></div>
          <div class="card-breakdown-segment" style="width: 20%; background: #00e5ff;" title="Askeri Hazırlık"></div>
          <div class="card-breakdown-segment" style="width: 10%; background: #b545ff;" title="Siber ve İttifak"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// SELECTION HANDLERS
// ==========================================================================
function selectPair(pairId) {
  if (!State.data) return;
  const pair = State.data.pairs.find(p => p.id === pairId);
  if (!pair) return;

  State.activePair = pair;
  State.activeTab = 'pair';

  // Sekme butonlarını güncelle
  updateTabUI();

  // Kart aktifliğini güncelle
  renderPairsList();

  // Haritayı iki ülkenin ortasına yumuşakça odakla
  const midLat = (pair.coordinates.a[0] + pair.coordinates.b[0]) / 2;
  const midLon = (pair.coordinates.a[1] + pair.coordinates.b[1]) / 2;
  State.map.flyTo([midLat, midLon], 4, { duration: 1.2 });

  // İlgili çizgiyi vurgula
  Object.entries(State.polylines).forEach(([id, poly]) => {
    if (id === pairId) {
      poly.setStyle({ weight: 6, opacity: 1 });
      poly.bringToFront();
    } else {
      poly.setStyle({ weight: 2.5, opacity: 0.5 });
    }
  });

  // Sağ panel kapalıysa otomatik aç
  const rightPanel = document.getElementById('intelligenceSidebar');
  if (rightPanel && rightPanel.classList.contains('collapsed')) {
    toggleRightPanel(true);
  }

  // İstihbarat Dosyasını Doldur
  renderPairDossier(pair);
}

function selectCountry(countryCode) {
  if (!State.data) return;
  const country = State.data.country_profiles[countryCode];
  if (!country) return;

  State.activeCountry = country;
  State.activeTab = 'country';

  // Sağ panel kapalıysa otomatik aç
  const rightPanel = document.getElementById('intelligenceSidebar');
  if (rightPanel && rightPanel.classList.contains('collapsed')) {
    toggleRightPanel(true);
  }

  updateTabUI();
  State.map.flyTo([country.lat, country.lon], 5, { duration: 1.2 });
  renderCountryProfile(country);
}

// ==========================================================================
// TABS & SIDEBAR INTELLIGENCE DOSSIER (RIGHT PANEL)
// ==========================================================================
function initTabs() {
  const tabPairBtn = document.getElementById('tabPairBtn');
  const tabCountryBtn = document.getElementById('tabCountryBtn');

  if (tabPairBtn && tabCountryBtn) {
    tabPairBtn.addEventListener('click', () => {
      State.activeTab = 'pair';
      updateTabUI();
      if (State.activePair) renderPairDossier(State.activePair);
    });

    tabCountryBtn.addEventListener('click', () => {
      State.activeTab = 'country';
      updateTabUI();
      if (!State.activeCountry && State.activePair) {
        // Varsayılan olarak aktif çiftin A ülkesini göster
        selectCountry(State.activePair.country_a);
      } else if (State.activeCountry) {
        renderCountryProfile(State.activeCountry);
      }
    });
  }
}

function updateTabUI() {
  const tabPairBtn = document.getElementById('tabPairBtn');
  const tabCountryBtn = document.getElementById('tabCountryBtn');
  if (!tabPairBtn || !tabCountryBtn) return;

  if (State.activeTab === 'pair') {
    tabPairBtn.classList.add('active');
    tabCountryBtn.classList.remove('active');
  } else {
    tabCountryBtn.classList.add('active');
    tabPairBtn.classList.remove('active');
  }
}

function renderPairDossier(pair) {
  const container = document.getElementById('sidebarDetailContent');
  if (!container) return;

  const color = pair.color || Colors.MODERATE;
  const comp = pair.components;

  container.innerHTML = `
    <!-- Hero Risk Kartı -->
    <div class="dossier-hero-card" style="--hero-accent: ${color}; --hero-border: rgba(${hexToRgb(color)}, 0.4);">
      <div class="hero-header">
        <div class="hero-title">
          <h3>${pair.country_a_name} ⚔️ ${pair.country_b_name}</h3>
          <p><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>Bölge: ${pair.region}</p>
        </div>
        <div class="hero-score-badge">
          <div class="score-val">${pair.cri_score}</div>
          <div class="score-sub">CRI / 100</div>
        </div>
      </div>

      <div class="threat-tier-strip">
        <i class="fa-solid fa-radiation" style="color: ${color};"></i>
        <strong style="color: ${color};">DEFCON ${pair.defcon}</strong>
        <span style="color: var(--text-secondary);">| ${pair.status_tr}</span>
      </div>
    </div>

    <!-- 4 Matematiksel Risk Faktörü Dağılımı -->
    <div class="factor-breakdown-section">
      <div class="factor-section-title">Matematiksel Ağırlık Dağılımı</div>

      <!-- Faktör 1: Medya Gerilimi (%40) -->
      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-newspaper" style="color: var(--neon-red);"></i> Medya Gerilimi</span>
          <span class="factor-weight">Ağırlık: %40</span>
          <span class="factor-score" style="color: var(--neon-red);">${comp.media_tension.score} / 100</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width: ${comp.media_tension.score}%; background: var(--neon-red);"></div>
        </div>
        <div class="factor-detail-subtext">
          GDELT Haber Tonu: <strong>${comp.media_tension.avg_tone}</strong> (Negatiflik Gerilimi) | Hacim: ${comp.media_tension.volume_index}
        </div>
      </div>

      <!-- Faktör 2: Ekonomik Bağımlılık (%30) -->
      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-handshake-slash" style="color: var(--neon-amber);"></i> Ekonomik Ayrışma</span>
          <span class="factor-weight">Ağırlık: %30</span>
          <span class="factor-score" style="color: var(--neon-amber);">${comp.economic_vulnerability.score} / 100</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width: ${comp.economic_vulnerability.score}%; background: var(--neon-amber);"></div>
        </div>
        <div class="factor-detail-subtext">
          Karşılıklı Ticari Bağımlılık İndeksi: %${comp.economic_vulnerability.trade_dependency} (Düşük bağımlılık caydırıcılığı düşürür)
        </div>
      </div>

      <!-- Faktör 3: Askeri Hazırlık (%20) -->
      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-jet-fighter" style="color: var(--neon-cyan);"></i> Askeri Hazırlık</span>
          <span class="factor-weight">Ağırlık: %20</span>
          <span class="factor-score" style="color: var(--neon-cyan);">${comp.military_readiness.score} / 100</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width: ${comp.military_readiness.score}%; background: var(--neon-cyan);"></div>
        </div>
        <div class="factor-detail-subtext">
          ${pair.country_a}: %${comp.military_readiness.country_a_mil_pct} | ${pair.country_b}: %${comp.military_readiness.country_b_mil_pct} (Dünya Ort: %${comp.military_readiness.world_avg})
        </div>
      </div>

      <!-- Faktör 4: Siber Tehdit ve İttifak Bonusu (%10) -->
      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-network-wired" style="color: var(--neon-purple);"></i> Siber Tehdit & İttifak</span>
          <span class="factor-weight">Ağırlık: %10</span>
          <span class="factor-score" style="color: var(--neon-purple);">${comp.cyber_and_alliances.score} / 100</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width: ${comp.cyber_and_alliances.score}%; background: var(--neon-purple);"></div>
        </div>
        <div class="factor-detail-subtext">
          Blok Uyuşmazlığı: ${comp.cyber_and_alliances.bloc_a} vs ${comp.cyber_and_alliances.bloc_b}
        </div>
      </div>
    </div>

    <!-- Chart.js 1: GDELT Haber Tonu Trendi (Son 7 Gün) -->
    <div class="chart-box">
      <div class="chart-title">
        <h4><i class="fa-solid fa-chart-line" style="margin-right: 5px; color: var(--neon-red);"></i>Haber Tonu Trendi (GDELT v2)</h4>
        <span class="chart-source-badge">Son 7 Gün</span>
      </div>
      <div class="canvas-wrapper">
        <canvas id="toneChartCanvas"></canvas>
      </div>
    </div>

    <!-- Chart.js 2: Askeri Harcama Karşılaştırması (% GSYİH) -->
    <div class="chart-box">
      <div class="chart-title">
        <h4><i class="fa-solid fa-chart-simple" style="margin-right: 5px; color: var(--neon-cyan);"></i>Askeri Harcama vs Dünya Ort.</h4>
        <span class="chart-source-badge">World Bank</span>
      </div>
      <div class="canvas-wrapper">
        <canvas id="militaryChartCanvas"></canvas>
      </div>
    </div>

    <!-- Tarihsel ve Jeopolitik İstihbarat Notu -->
    <div class="intel-notes-card">
      <h5><i class="fa-solid fa-bullhorn" style="margin-right: 6px;"></i>Kriz Özeti & Kinetik Risk</h5>
      <p>${pair.historical_dispute}</p>
    </div>

    <!-- İnteraktif Kriz Simülatörü (What-If Analysis) -->
    <div class="simulator-box">
      <h5><i class="fa-solid fa-sliders" style="margin-right: 6px;"></i>Gerilim Tırmanma Simülatörü</h5>
      
      <div class="sim-slider-group">
        <div class="sim-slider-label">
          <span>Medya Gerilimi Artışı (Negatif Haber Sıçraması)</span>
          <span id="simToneLabel">+0 Puan</span>
        </div>
        <input type="range" id="simToneDelta" min="0" max="30" value="0">
      </div>

      <div class="sim-slider-group">
        <div class="sim-slider-label">
          <span>Askeri Yığınak & Seferberlik İndeksi</span>
          <span id="simMilLabel">+0 Puan</span>
        </div>
        <input type="range" id="simMilDelta" min="0" max="30" value="0">
      </div>

      <div class="sim-result-row">
        <span>Simüle Edilen Yeni CRI Skoru:</span>
        <strong id="simResultScore" style="color: ${color}; font-size: 1rem;">${pair.cri_score}</strong>
      </div>
    </div>
  `;

  // Chart'ları render et
  renderToneChart(pair.tone_history);
  renderMilitaryChart(pair);
  setupSimulator(pair);
}

// ==========================================================================
// COUNTRY PROFILE VIEW
// ==========================================================================
function renderCountryProfile(country) {
  const container = document.getElementById('sidebarDetailContent');
  if (!container) return;

  const color = country.color || Colors.MODERATE;

  container.innerHTML = `
    <!-- Ülke Hero Kartı -->
    <div class="dossier-hero-card" style="--hero-accent: ${color}; --hero-border: rgba(${hexToRgb(color)}, 0.4);">
      <div class="hero-header">
        <div class="hero-title">
          <h3>${country.name}</h3>
          <p><i class="fa-solid fa-earth-americas" style="margin-right: 4px;"></i>ISO: ${country.code} / ${country.iso3 || '--'}</p>
        </div>
        <div class="hero-score-badge">
          <div class="score-val">${country.max_risk_score}</div>
          <div class="score-sub">Max Tehdit / 100</div>
        </div>
      </div>

      <div class="threat-tier-strip">
        <i class="fa-solid fa-shield-cat" style="color: ${color};"></i>
        <strong style="color: ${color};">DEFCON ${country.defcon}</strong>
        <span style="color: var(--text-secondary);">| ${country.status_tr}</span>
      </div>
    </div>

    <!-- Ülke Parametreleri Tablosu -->
    <div class="factor-breakdown-section">
      <div class="factor-section-title">Stratejik ve Askeri Göstergeler</div>

      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-flag"></i> Askeri İttifak / Blok</span>
          <span class="factor-score" style="color: var(--neon-cyan);">${country.military_bloc}</span>
        </div>
      </div>

      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-crosshairs"></i> Birincil Hasım</span>
          <span class="factor-score" style="color: var(--neon-red);">${country.primary_adversary_name} (${country.primary_adversary_code})</span>
        </div>
      </div>

      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-coins"></i> GSYİH (USD)</span>
          <span class="factor-score">$${(country.gdp_usd / 1e9).toFixed(1)} Milyar</span>
        </div>
      </div>

      <div class="factor-card">
        <div class="factor-row">
          <span class="factor-name"><i class="fa-solid fa-shield-virus"></i> Siber Tehdit Taban Seviyesi</span>
          <span class="factor-score" style="color: var(--neon-purple);">${country.cyber_baseline} / 100</span>
        </div>
      </div>
    </div>

    <!-- Chart.js 3: Ülkenin Tarihsel Askeri Harcama Trendi -->
    <div class="chart-box">
      <div class="chart-title">
        <h4><i class="fa-solid fa-chart-line" style="margin-right: 5px; color: var(--neon-cyan);"></i>Tarihsel Askeri Bütçe (% GSYİH)</h4>
        <span class="chart-source-badge">World Bank</span>
      </div>
      <div class="canvas-wrapper">
        <canvas id="countryMilHistoryCanvas"></canvas>
      </div>
    </div>

    <div class="intel-notes-card">
      <h5><i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>Dahil Olduğu Kriz Odakları</h5>
      <p>${country.involved_pair_ids.length > 0 ? country.involved_pair_ids.join(', ') : 'Doğrudan aktif kriz çifti listelenmedi.'}</p>
    </div>
  `;

  renderCountryMilChart(country.military_history, country.name);
}

// ==========================================================================
// CHART.JS RENDERING ENGINES
// ==========================================================================
function renderToneChart(toneHistory) {
  const canvas = document.getElementById('toneChartCanvas');
  if (!canvas) return;

  if (State.charts.tone) {
    State.charts.tone.destroy();
  }

  const labels = toneHistory && toneHistory.length > 0
    ? toneHistory.map((_, i) => `Gün -${toneHistory.length - i}`)
    : ['G-6', 'G-5', 'G-4', 'G-3', 'G-2', 'G-1', 'Bugün'];

  const values = toneHistory && toneHistory.length > 0
    ? toneHistory.map(d => d.tone ?? -3.0)
    : [-3.2, -4.1, -5.0, -4.8, -6.2, -7.1, -7.5];

  const ctx = canvas.getContext('2d');
  State.charts.tone = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'GDELT Haber Tonu (Negatif Gerilim)',
        data: values,
        borderColor: '#ff2b3e',
        backgroundColor: 'rgba(255, 43, 62, 0.15)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#ff2b3e',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 6, bottom: 6, left: 4, right: 6 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0c0f16',
          titleColor: '#00e5ff',
          bodyColor: '#fff',
          borderColor: 'rgba(0, 229, 255, 0.3)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 9 } }
        }
      }
    }
  });
}

function renderMilitaryChart(pair) {
  const canvas = document.getElementById('militaryChartCanvas');
  if (!canvas) return;

  if (State.charts.military) {
    State.charts.military.destroy();
  }

  const comp = pair.components.military_readiness;
  const ctx = canvas.getContext('2d');

  State.charts.military = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [pair.country_a_name, pair.country_b_name, 'Dünya Ort.'],
      datasets: [{
        label: 'Askeri Harcama (% GSYİH)',
        data: [comp.country_a_mil_pct, comp.country_b_mil_pct, comp.world_avg],
        backgroundColor: [
          'rgba(0, 229, 255, 0.8)',
          'rgba(255, 119, 0, 0.8)',
          'rgba(255, 255, 255, 0.25)'
        ],
        borderColor: [
          '#00e5ff',
          '#ff7700',
          '#ffffff'
        ],
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 6, bottom: 6, left: 4, right: 6 }
      },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8b949e',
            font: { family: 'JetBrains Mono', size: 9 },
            callback: v => `%${v}`
          }
        }
      }
    }
  });
}

function renderCountryMilChart(history, countryName) {
  const canvas = document.getElementById('countryMilHistoryCanvas');
  if (!canvas) return;

  if (State.charts.countryMil) {
    State.charts.countryMil.destroy();
  }

  let labels = ['2019', '2020', '2021', '2022', '2023'];
  let values = [2.1, 2.3, 2.5, 3.1, 3.4];

  if (history && history.length > 0) {
    labels = history.map(h => h.year).reverse();
    values = history.map(h => h.value).reverse();
  }

  const ctx = canvas.getContext('2d');
  State.charts.countryMil = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${countryName} (% GSYİH)`,
        data: values,
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#00e5ff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 6, bottom: 6, left: 4, right: 6 }
      },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8b949e',
            font: { family: 'JetBrains Mono', size: 9 },
            callback: v => `%${v}`
          }
        }
      }
    }
  });
}

// ==========================================================================
// INTERACTIVE ESCALATION SIMULATOR
// ==========================================================================
function setupSimulator(pair) {
  const toneSlider = document.getElementById('simToneDelta');
  const milSlider = document.getElementById('simMilDelta');
  const toneLabel = document.getElementById('simToneLabel');
  const milLabel = document.getElementById('simMilLabel');
  const resultScore = document.getElementById('simResultScore');

  if (!toneSlider || !milSlider || !resultScore) return;

  function recalculate() {
    const toneDelta = parseFloat(toneSlider.value);
    const milDelta = parseFloat(milSlider.value);

    toneLabel.textContent = `+${toneDelta} Puan`;
    milLabel.textContent = `+${milDelta} Puan`;

    // Medya faktörü (%40) ve Askeri faktör (%20) üzerinde simülasyon etkisi
    const comp = pair.components;
    const simMedia = Math.min(100, comp.media_tension.score + toneDelta);
    const simMil = Math.min(100, comp.military_readiness.score + milDelta);

    const newCri = (
      (0.40 * simMedia) +
      (0.30 * comp.economic_vulnerability.score) +
      (0.20 * simMil) +
      (0.10 * comp.cyber_and_alliances.score)
    ).toFixed(1);

    resultScore.textContent = newCri;
    if (newCri >= 80) {
      resultScore.style.color = '#ff2b3e';
    } else if (newCri >= 65) {
      resultScore.style.color = '#ff7700';
    } else {
      resultScore.style.color = '#00e5ff';
    }
  }

  toneSlider.addEventListener('input', recalculate);
  milSlider.addEventListener('input', recalculate);
}

// Helper: Hex color to RGB string
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
