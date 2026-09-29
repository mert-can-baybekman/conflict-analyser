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

  // Esri World Dark Gray Canvas (Tamamen ücretsiz, API Key gerektirmez)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }).addTo(State.map);

  // Ülke sınırları ve şehir etiketleri katmanı
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    opacity: 0.65
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

    const marker = L.marker([country.lat, country.lon], { icon: customIcon }).addTo(State.map);

    // Marker tooltip
    marker.bindTooltip(`
      <div style="font-family: var(--font-mono); font-size: 0.75rem;">
        <strong style="color: #fff; font-family: var(--font-hud);">${country.name} (${country.code})</strong><br>
        <span style="color: ${color};">Tehdit: ${country.max_risk_score}/100 [${country.threat_level}]</span><br>
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

  // 2. Çatışma Çiftleri Arasındaki Kinetik Gerilim Hatları (Polylines)
  pairs.forEach(pair => {
    const latlngs = [pair.coordinates.a, pair.coordinates.b];
    const color = pair.color || Colors.MODERATE;

    const polyline = L.polyline(latlngs, {
      color: color,
      weight: Math.max(2, (pair.cri_score / 100) * 5),
      opacity: 0.75,
      dashArray: '6, 8',
      lineCap: 'round'
    }).addTo(State.map);

    polyline.bindTooltip(`
      <div style="font-family: var(--font-mono); font-size: 0.75rem;">
        <strong style="color: #fff;">${pair.country_a_name} ⚔️ ${pair.country_b_name}</strong><br>
        <span style="color: ${color}; font-weight: bold;">CRI: ${pair.cri_score} // ${pair.status_tr}</span>
      </div>
    `, { sticky: true });

    polyline.on('click', () => {
      selectPair(pair.id);
    });

    State.polylines[pair.id] = polyline;
  });
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
          <div class="pair-flags-names">
            <span class="country-tag">${p.country_a}</span>
            <span class="vs-badge">VS</span>
            <span class="country-tag">${p.country_b}</span>
          </div>
          <div class="pair-cri-score" style="color: ${color};">
            ${p.cri_score}
          </div>
        </div>

        <div class="pair-meta-row">
          <span>${p.country_a_name} - ${p.country_b_name}</span>
          <span class="tier-badge" style="background: rgba(${hexToRgb(color)}, 0.15); color: ${color}; border: 1px solid ${color};">
            DEFCON ${p.defcon}
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

  // İstihbarat Dosyasını Doldur
  renderPairDossier(pair);
}

function selectCountry(countryCode) {
  if (!State.data) return;
  const country = State.data.country_profiles[countryCode];
  if (!country) return;

  State.activeCountry = country;
  State.activeTab = 'country';

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
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 10 } }
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8b949e',
            font: { family: 'JetBrains Mono', size: 10 },
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
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8b949e',
            font: { family: 'JetBrains Mono', size: 10 },
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
