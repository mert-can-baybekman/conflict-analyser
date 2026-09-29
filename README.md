# AEGIS // Geopolitical Conflict & Cyber-War Room Pipeline

> **Uçtan Uca Küresel Jeopolitik Savaş ve Sıcak Çatışma Riski Tahmin Platformu**  
> GitHub Actions + GitHub Pages üzerinde tamamen **ÜCRETSİZ** ve **SUNUCUSUZ (Serverless)** çalışan veri analitiği ve erken uyarı paneli.

---

## 🛰️ Proje Mimarisi

```text
conflict-analyser/
├── .github/
│   └── workflows/
│       └── main.yml           # Her gece 00:00 UTC'de veriyi toplayıp güncelleyen GitHub Action
├── data/
│   ├── countries.json         # Hedef ülkelerin ISO kodları, blokları ve koordinatları
│   ├── raw_metrics.json       # API'lerden çekilen ham sinyaller
│   └── risk_outputs.json      # Matematiksel risk motorunun nihai analitik çıktısı
├── src/
│   ├── fetch_data.py          # GDELT v2 ve World Bank Open Data API katmanı (+Fallback)
│   └── process_risk.py        # 4 parametreli matematiksel risk hesaplama motoru (Pandas)
└── docs/                      # GitHub Pages statik web sitesi barındırma dizini
    ├── index.html             # Geopolitical Cyber-War Room Dashboard arayüzü
    ├── css/
    │   └── style.css          # Taktiksel karanlık tema, HUD ve radar animasyonları
    ├── js/
    │   └── app.js             # Leaflet.js taktik harita, Chart.js ve simülasyon mantığı
    └── data/                  # Web arayüzünün doğrudan eriştiği veri kopyaları
        ├── countries.json
        └── risk_outputs.json
```

---

## 🧮 Matematiksel Risk Modeli (0 - 100 CRI)

İki ülke arasındaki **Savaş ve Kinetik Çatışma Riski İndeksi (Conflict Risk Index - CRI)**, 4 bağımsız jeopolitik parametrenin ağırlıklı toplamıyla hesaplanır:

$$\text{CRI} = (0.40 \times \text{MTS}) + (0.30 \times \text{EVS}) + (0.20 \times \text{MRS}) + (0.10 \times \text{CAR})$$

### 1. Medya Gerilim Skoru ($\text{MTS}$ - Ağırlık: %40)
- **Veri Kaynağı:** GDELT Project v2 DOC API.
- Son 7 günde iki ülkeyi ve askeri çatışma terimlerini içeren haberlerin hacmi ($V$) ve ortalama haber tonu ($T$).
- Ton negatife ($-10$'a doğru) indikçe ve haber hacmi arttıkça gerilim skoru lineer olarak 100'e yaklaşır:
  $$\text{ToneNormalized} = \text{clamp}\left(\frac{5 - T}{15} \times 100, 0, 100\right)$$
  $$\text{VolumeNormalized} = \text{clamp}\left(\frac{V}{150} \times 100, 0, 100\right)$$
  $$\text{MTS} = 0.65 \times \text{ToneNormalized} + 0.35 \times \text{VolumeNormalized}$$

### 2. Ekonomik Karşılıklı Bağımlılık Skoru ($\text{EVS}$ - Ağırlık: %30)
- **Teori:** Karşılıklı ekonomik bağımlılık yüksekse savaşın maliyeti artar (caydırıcılık). Ticaret hacmi sıfırlandığında veya yaptırımlarla bağlar koptuğunda caydırıcılık ortadan kalkar.
- Bağımlılık ($D \in [0, 100]$):
  $$\text{EVS} = 100 - D$$

### 3. Askeri Hazırlık Skoru ($\text{MRS}$ - Ağırlık: %20)
- **Veri Kaynağı:** World Bank Open Data API (`MS.MIL.XPND.GD.ZS`).
- Ülkelerin askeri bütçelerinin GSYİH'ye oranı dünya ortalaması (~%2.3) ile kıyaslanır. Efektif askeri harcama dünya ortalamasını aştıkça risk katsayısı çarpan olarak yükselir.

### 4. Siber Tehdit ve İttifak Bonusu ($\text{CAR}$ - Ağırlık: %10)
- Ülkeler farklı/hasım askeri bloklardaysa (Örn: NATO vs CSTO / Direniş Ekseni) ve aralarında yüksek siber saldırı anomalisi varsa taban risk artar.

---

## 🚨 Tehdit Seviyesi Sınıflandırması

| Skor Aralığı | Tehdit Seviyesi | DEFCON | Durum Tanımı |
| :--- | :--- | :---: | :--- |
| **80.0 - 100** | `CRITICAL` | **DEFCON 1** | Kritik Sıcak Çatışma / Yüksek Savaş Riski |
| **65.0 - 79.9** | `HIGH` | **DEFCON 2** | Yüksek Gerilim & Askeri Yığınak |
| **45.0 - 64.9** | `ELEVATED` | **DEFCON 3** | Yükseltilmiş Gerilim & Diplomatik Kriz |
| **25.0 - 44.9** | `MODERATE` | **DEFCON 4** | Orta Düzey Bölgesel Sürtüşme |
| **0.0 - 24.9** | `LOW` | **DEFCON 5** | Düşük Tehdit / İstikrarlı Caydırıcılık |

---

## ⚡ Yerel Çalıştırma & Test

```bash
# 1. Gerekli kütüphaneleri yükleyin
pip install requests pandas

# 2. Veri toplama katmanını çalıştırın (GDELT + World Bank)
python src/fetch_data.py

# 3. Matematiksel risk motorunu çalıştırın
python src/process_risk.py

# 4. Web arayüzünü yerel sunucuda başlatın
cd docs
python -m http.server 8000
# Tarayıcınızda açın: http://localhost:8000
```

---

## 🌐 GitHub Pages Üzerinde Yayına Alma (Tamamen Ücretsiz)

1. Depoyu GitHub'a pushlayın:
   ```bash
   git add .
   git commit -m "feat: complete geopolitical conflict analyzer pipeline"
   git push origin main
   ```
2. GitHub Repository **Settings** > **Pages** menüsüne gidin:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (veya `master`)
   - **Folder:** `/docs`
   - **Save** butonuna tıklayın.
3. GitHub Actions her gece saat **00:00 UTC**'de `src/fetch_data.py` ve `src/process_risk.py` adımlarını çalıştıracak ve güncel verileri otomatik olarak commit atıp pushlayacaktır.