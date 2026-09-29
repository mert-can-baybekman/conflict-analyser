"""
Geopolitical Conflict Risk Pipeline - Mathematical Risk Engine
Computes 0-100 Conflict Risk Index (CRI) based on:
1. Media Tension Score (40% weight) - GDELT news volume & negative tone
2. Economic Interdependence Vulnerability (30% weight) - Trade decoupling & severed ties
3. Military Readiness & Expenditure Score (20% weight) - World Bank % of GDP vs global baseline
4. Cyber Threat & Alliance Mismatch Bonus (10% weight) - Hostile alliance alignment & cyber hostility

Outputs final analytical payload to:
- data/risk_outputs.json
- docs/data/risk_outputs.json
"""

import os
import sys
import json
import logging
import shutil
from datetime import datetime, timezone
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("process_risk")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DOCS_DATA_DIR = os.path.join(BASE_DIR, "docs", "data")
COUNTRIES_FILE = os.path.join(DATA_DIR, "countries.json")
RAW_METRICS_FILE = os.path.join(DATA_DIR, "raw_metrics.json")
OUTPUT_RISK_FILE = os.path.join(DATA_DIR, "risk_outputs.json")
DOCS_OUTPUT_RISK_FILE = os.path.join(DOCS_DATA_DIR, "risk_outputs.json")


def clamp(val, min_val=0.0, max_val=100.0):
    return max(min_val, min(max_val, val))


def get_threat_tier(score):
    """0-100 arasındaki skora göre DEFCON ve uyarı kategorisi belirler."""
    if score >= 80.0:
        return {"level": "CRITICAL", "defcon": 1, "color": "#ff1a1a", "status_tr": "Kritik Savaş Tehdidi"}
    elif score >= 65.0:
        return {"level": "HIGH", "defcon": 2, "color": "#ff5500", "status_tr": "Yüksek Çatışma Riski"}
    elif score >= 45.0:
        return {"level": "ELEVATED", "defcon": 3, "color": "#ffaa00", "status_tr": "Yükseltilmiş Gerilim"}
    elif score >= 25.0:
        return {"level": "MODERATE", "defcon": 4, "color": "#00d4ff", "status_tr": "Orta Düzey Sürtüşme"}
    else:
        return {"level": "LOW", "defcon": 5, "color": "#00ff88", "status_tr": "Düşük Tehdit / İstikrarlı"}


def evaluate_alliance_friction(bloc_a, bloc_b):
    """
    İki ülkenin askeri ve jeopolitik blok uyumsuzluğunu puanlar (0 - 100).
    Karşıt bloklar (Örn: NATO vs CSTO veya Resistance Axis) en yüksek skoru alır.
    """
    hostile_pairs = [
        {"NATO", "CSTO"},
        {"NATO", "SCO"},
        {"Major Non-NATO Ally", "Resistance Axis"},
        {"Western-Aligned", "CSTO"},
        {"Western-Aligned", "SCO / Resistance Axis"},
        {"Western-Aligned", "Independent / Sino-Russian Ally"},
        {"Başlıca NATO Dışı Müttefik", "Bağlantısız / Rusya Stratejik Ortağı"},
        {"Sahel Devletleri İttifakı (AES)", "ECOWAS Lideri"}
    ]
    current = {bloc_a, bloc_b}
    for hp in hostile_pairs:
        if hp.issubset(current) or current == hp:
            return 95.0

    if bloc_a == bloc_b:
        # Aynı blokta olsalar bile yerel sürtüşme olabilir (Örn: GR ve TR ikisi de NATO)
        return 25.0

    return 65.0


def calculate_media_tension_score(avg_tone, volume_score):
    """
    Medya Gerilim Skoru (%40 Ağırlık):
    - GDELT ortalama haber tonu negatife (-10'a doğru) kaydıkça yükselir.
    - Haber hacmi arttıkça gerilim skoru katlanır.
    """
    # Ortalama ton dönüşümü: +5 (çok olumlu barış) -> 0 puan, -10 (ağır çatışma) -> 100 puan
    # tone_score = ((5 - tone) / 15) * 100
    tone_normalized = clamp(((5.0 - avg_tone) / 15.0) * 100.0, 0.0, 100.0)
    
    # Hacim normalizasyonu: 0-150 arası hacim indeksi 0-100 puan
    vol_normalized = clamp((volume_score / 150.0) * 100.0, 0.0, 100.0)
    
    # Bileşik medya gerilimi: %65 ton, %35 hacim etkisi
    score = (0.65 * tone_normalized) + (0.35 * vol_normalized)
    return round(clamp(score), 2)


def calculate_economic_vulnerability_score(dependency_baseline):
    """
    Ekonomik Karşılıklı Bağımlılık Skoru (%30 Ağırlık):
    - Karşılıklı ekonomik bağımlılık azaldıkça (veya yaptırımlarla sıfırlandıkça)
      caydırıcılık yok olur ve risk skoru yükselir.
    """
    # dependency_baseline (0-100): 100 yüksek karşılıklı ticaret -> risk 0
    # 0 tamamen kopmuş bağlar -> risk 100
    score = 100.0 - float(dependency_baseline)
    return round(clamp(score), 2)


def calculate_military_readiness_score(mil_a_pct, mil_b_pct, world_avg):
    """
    Askeri Hazırlık Skoru (%20 Ağırlık):
    - Ülkelerin askeri harcamalarının GSYİH'ye oranı dünya ortalamasının üzerindeyse
      risk skoru çarpan olarak yükselir.
    """
    world_avg = max(0.5, world_avg)
    # Çiftin efektif askeri yoğunluğu
    max_mil = max(mil_a_pct, mil_b_pct)
    avg_mil = (mil_a_pct + mil_b_pct) / 2.0
    effective_mil = (0.65 * max_mil) + (0.35 * avg_mil)

    # Dünya ortalamasına göre oran: R = effective_mil / world_avg
    ratio = effective_mil / world_avg
    
    # Eğer oran 1.0 (dünya ortalaması) ise ~25 puan, 3x ise ~75 puan, 5x ve üstü 100 puan
    score = (ratio - 0.4) * 28.0
    return round(clamp(score), 2)


def calculate_cyber_alliance_score(bloc_a, bloc_b, cyber_baseline):
    """
    Siber Tehdit & İttifak Bonusu (%10 Ağırlık):
    - Farklı askeri bloklar ve aralarındaki siber düşmanlık taban riski artırır.
    """
    alliance_friction = evaluate_alliance_friction(bloc_a, bloc_b)
    # %50 ittifak uyuşmazlığı + %50 siber hasımlık temeli
    score = (0.50 * alliance_friction) + (0.50 * float(cyber_baseline))
    return round(clamp(score), 2)


def process_conflict_matrix():
    """Tüm verileri pandas ile işleyerek nihai risk matrisini ve ülke skorlarını üretir."""
    logger.info("=== Matematiksel Risk Hesaplama Motoru (process_risk.py) Başlatıldı ===")
    
    if not os.path.exists(COUNTRIES_FILE):
        raise FileNotFoundError(f"Ülke tanım dosyası bulunamadı: {COUNTRIES_FILE}")
    if not os.path.exists(RAW_METRICS_FILE):
        raise FileNotFoundError(f"Ham veri dosyası bulunamadı: {RAW_METRICS_FILE}. Önce fetch_data.py çalıştırılmalıdır.")

    with open(COUNTRIES_FILE, "r", encoding="utf-8") as f:
        spec = json.load(f)

    with open(RAW_METRICS_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    countries = spec.get("countries", [])
    pairs = spec.get("conflict_pairs", [])
    world_avg = raw_data.get("world_military_gdp_avg", 2.3)
    wb_data = raw_data.get("world_bank", {})
    gdelt_signals = raw_data.get("gdelt_signals", {})

    country_map = {c["code"]: c for c in countries}

    # İkili risk skorlarını hesapla
    calculated_pairs = []
    
    for pair in pairs:
        pair_id = pair["id"]
        c_a_code = pair["country_a"]
        c_b_code = pair["country_b"]

        country_a = country_map.get(c_a_code, {})
        country_b = country_map.get(c_b_code, {})

        wb_a = wb_data.get(c_a_code, {})
        wb_b = wb_data.get(c_b_code, {})

        cyber_base = pair.get("cyber_hostility_baseline", 50)
        gdelt = gdelt_signals.get(pair_id, {})
        if not gdelt:
            synthetic_tone = round(-1.5 - (cyber_base / 100.0) * 6.0, 2)
            avg_tone = synthetic_tone
            vol_score = int(cyber_base * 1.6 + 25)
            tone_series = [{"day_offset": day, "tone": round(synthetic_tone + (day * 0.12 - 0.4), 2)} for day in range(7, 0, -1)]
        else:
            avg_tone = gdelt.get("avg_tone", -3.0)
            vol_score = gdelt.get("volume_score", 60)
            tone_series = gdelt.get("tone_series", [])
            if not tone_series:
                tone_series = [{"day_offset": day, "tone": round(avg_tone + (day * 0.1 - 0.35), 2)} for day in range(7, 0, -1)]

        mil_a = wb_a.get("military_gdp_pct", country_a.get("default_mil_gdp_pct", 2.0))
        mil_b = wb_b.get("military_gdp_pct", country_b.get("default_mil_gdp_pct", 2.0))

        bloc_a = country_a.get("military_bloc", "Independent")
        bloc_b = country_b.get("military_bloc", "Independent")

        trade_dep = pair.get("trade_dependency_baseline", 20)

        # 4 Ana parametreyi hesapla
        media_score = calculate_media_tension_score(avg_tone, vol_score)
        econ_score = calculate_economic_vulnerability_score(trade_dep)
        mil_score = calculate_military_readiness_score(mil_a, mil_b, world_avg)
        cyber_score = calculate_cyber_alliance_score(bloc_a, bloc_b, cyber_base)

        # Ağırlıklı Toplam:
        # Medya: %40 | Ekonomi: %30 | Askeri: %20 | Siber & İttifak: %10
        composite_cri = (
            (0.40 * media_score) +
            (0.30 * econ_score) +
            (0.20 * mil_score) +
            (0.10 * cyber_score)
        )
        composite_cri = round(clamp(composite_cri), 1)

        tier = get_threat_tier(composite_cri)

        calculated_pairs.append({
            "id": pair_id,
            "country_a": c_a_code,
            "country_b": c_b_code,
            "country_a_name": country_a.get("name", c_a_code),
            "country_b_name": country_b.get("name", c_b_code),
            "region": pair.get("region", "Global"),
            "historical_dispute": pair.get("historical_dispute", ""),
            "cri_score": composite_cri,
            "threat_level": tier["level"],
            "defcon": tier["defcon"],
            "color": tier["color"],
            "status_tr": tier["status_tr"],
            "components": {
                "media_tension": {
                    "score": media_score,
                    "weight_pct": 40,
                    "avg_tone": avg_tone,
                    "volume_index": vol_score
                },
                "economic_vulnerability": {
                    "score": econ_score,
                    "weight_pct": 30,
                    "trade_dependency": trade_dep
                },
                "military_readiness": {
                    "score": mil_score,
                    "weight_pct": 20,
                    "country_a_mil_pct": mil_a,
                    "country_b_mil_pct": mil_b,
                    "world_avg": world_avg
                },
                "cyber_and_alliances": {
                    "score": cyber_score,
                    "weight_pct": 10,
                    "bloc_a": bloc_a,
                    "bloc_b": bloc_b,
                    "cyber_baseline": cyber_base
                }
            },
            "tone_history": tone_series,
            "coordinates": {
                "a": [country_a.get("lat", 0), country_a.get("lon", 0)],
                "b": [country_b.get("lat", 0), country_b.get("lon", 0)]
            }
        })

    # Pandas DataFrame ile sıralama ve analitik özet
    df_pairs = pd.DataFrame(calculated_pairs)
    df_sorted = df_pairs.sort_values(by="cri_score", ascending=False)
    sorted_pairs_list = df_sorted.to_dict(orient="records")

    # Ülke bazında kümülatif tehdit profillerini derle
    country_profiles = {}
    for country in countries:
        code = country["code"]
        wb = wb_data.get(code, {})

        # Ülkenin dahil olduğu kriz çiftleri
        involved_pairs = [p for p in sorted_pairs_list if p["country_a"] == code or p["country_b"] == code]
        if involved_pairs:
            max_threat = max(p["cri_score"] for p in involved_pairs)
            avg_threat = round(sum(p["cri_score"] for p in involved_pairs) / len(involved_pairs), 1)
            primary_adversary_pair = involved_pairs[0]
            adv_code = primary_adversary_pair["country_b"] if primary_adversary_pair["country_a"] == code else primary_adversary_pair["country_a"]
            adv_name = primary_adversary_pair["country_b_name"] if primary_adversary_pair["country_a"] == code else primary_adversary_pair["country_a_name"]
        else:
            max_threat = 20.0
            avg_threat = 20.0
            adv_code = "None"
            adv_name = "None"

        tier = get_threat_tier(max_threat)

        country_profiles[code] = {
            "code": code,
            "iso3": country.get("iso3"),
            "name": country["name"],
            "lat": country["lat"],
            "lon": country["lon"],
            "military_bloc": country.get("military_bloc"),
            "cyber_baseline": country.get("baseline_cyber_threat", 60),
            "military_gdp_pct": wb.get("military_gdp_pct", country.get("default_mil_gdp_pct", 2.0)),
            "military_history": wb.get("military_history", []),
            "gdp_usd": wb.get("gdp_usd", country.get("default_gdp_usd", 1e11)),
            "max_risk_score": max_threat,
            "avg_risk_score": avg_threat,
            "primary_adversary_code": adv_code,
            "primary_adversary_name": adv_name,
            "threat_level": tier["level"],
            "defcon": tier["defcon"],
            "color": tier["color"],
            "status_tr": tier["status_tr"],
            "involved_pair_ids": [p["id"] for p in involved_pairs]
        }

    # Genel sistem özeti
    global_cri_avg = round(float(df_pairs["cri_score"].mean()), 1)
    critical_hotspots = int((df_pairs["cri_score"] >= 80.0).sum())
    high_hotspots = int(((df_pairs["cri_score"] >= 65.0) & (df_pairs["cri_score"] < 80.0)).sum())

    final_payload = {
        "metadata": {
            "title": "Global Cyber-Geopolitical Conflict Risk Matrix",
            "version": "2.0.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "pipeline_status": "OPERATIONAL",
            "global_cri_average": global_cri_avg,
            "critical_count": critical_hotspots,
            "high_count": high_hotspots,
            "monitored_pairs": len(pairs),
            "monitored_countries": len(countries)
        },
        "pairs": sorted_pairs_list,
        "country_profiles": country_profiles
    }

    # Çıktıları data/risk_outputs.json ve docs/data/risk_outputs.json dosyalarına kaydet
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(DOCS_DATA_DIR, exist_ok=True)

    with open(OUTPUT_RISK_FILE, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)
    logger.info(f"Risk hesaplama tamamlandı: {OUTPUT_RISK_FILE}")

    with open(DOCS_OUTPUT_RISK_FILE, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)
    logger.info(f"Web frontend kopyası güncellendi: {DOCS_OUTPUT_RISK_FILE}")

    # countries.json'ı da docs/data içine senkronize et
    docs_countries_file = os.path.join(DOCS_DATA_DIR, "countries.json")
    shutil.copy2(COUNTRIES_FILE, docs_countries_file)
    logger.info(f"Ülke verileri docs içine kopyalandı: {docs_countries_file}")

    return final_payload


if __name__ == "__main__":
    process_conflict_matrix()
