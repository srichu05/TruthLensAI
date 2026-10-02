# TruthLens AI — Audit Test Suite Archive (T01 to T20)

This directory contains the complete archive of all **20 primary test inputs** used in the official pre-Vercel migration system audit. Use these files to reproduce, demonstrate, or benchmark the TruthLens AI verification engine.

---

## Folder Organization

```
audit_inputs/
├── text/      --> T01 to T05 (Plain text claim files ready for copy-paste)
├── url/       --> T06 to T10 (Real article URLs + Windows .url shortcuts)
├── txt/       --> T11 to T15 (Pre-generated .txt documents for file upload mode)
├── pdf/       --> T16 to T20 (Pre-generated .pdf documents for file upload mode)
└── README.md  --> Master test index and usage instructions
```

---

## Master Test Matrix

| ID | Modality | File / Target | Category | Ground Truth | TruthLens Verdict | Confidence | Evidence |
|---|---|---|---|---|---|---|---|
| **T01** | Text | `text/T01_nasa_exoplanet_atmosphere.txt` | True / Supported | REAL | **REAL** | 94% | 1 (USA Today) |
| **T02** | Text | `text/T02_lemon_water_cancer_hoax.txt` | False / Refuted | FAKE | **UNCERTAIN** | 56% | 0 |
| **T03** | Text | `text/T03_who_coffee_ban_rumor.txt` | Misleading / Rumor | UNCERTAIN | **UNCERTAIN** | 56% | 0 |
| **T04** | Text | `text/T04_ai_consciousness_prediction.txt` | Uncertain / Speculation | UNCERTAIN | **UNCERTAIN** | 56% | 0 |
| **T05** | Text | `text/T05_federal_reserve_rate_hike.txt` | Neutral / Factual | REAL | **UNCERTAIN** | 56% | 0 |
| **T06** | URL | `https://en.wikipedia.org/wiki/Moon_landing` | True / Established History | REAL | **UNCERTAIN** | 56% | 0 |
| **T07** | URL | `https://en.wikipedia.org/wiki/Moon_landing_conspiracy_theories` | Conspiracy Refutation | FAKE | **UNCERTAIN** | 55% | 1 |
| **T08** | URL | `https://en.wikipedia.org/wiki/COVID-19_vaccine` | Medical / Factual | REAL | **REAL** | 79% | 2 |
| **T09** | URL | `https://en.wikipedia.org/wiki/Flat_Earth` | False / Pseudoscience | FAKE | **UNCERTAIN** | 56% | 0 |
| **T10** | URL | `https://www.bbc.com/news` | Recent / Neutral Journalism | REAL | **UNCERTAIN** | 56% | 0 |
| **T11** | TXT | `txt/T11_nasa_artemis_mission.txt` | True / Supported | REAL | **REAL** | 79% | 2 |
| **T12** | TXT | `txt/T12_5g_microchip_conspiracy.txt` | False / Refuted | FAKE | **UNCERTAIN** | 56% | 0 |
| **T13** | TXT | `txt/T13_chocolate_weight_loss_study.txt` | Misleading / Flawed Study | UNCERTAIN | **UNCERTAIN** | 56% | 0 |
| **T14** | TXT | `txt/T14_quantum_cryptography_breakthrough.txt` | Uncertain / Tech Bulletin | UNCERTAIN | **REAL** | 80% | 2 |
| **T15** | TXT | `txt/T15_renewable_energy_grid_report.txt` | Neutral / Factual | REAL | **UNCERTAIN** | 55% | 1 |
| **T16** | PDF | `pdf/T16_ipcc_climate_summary.pdf` | True / Supported | REAL | **UNCERTAIN** | 56% | 1 |
| **T17** | PDF | `pdf/T17_miracle_mineral_cure_alert.pdf` | False / Refuted | FAKE | **FAKE** | 77% | 1 (FDA/WHO) |
| **T18** | PDF | `pdf/T18_electric_vehicle_fire_hazard_claim.pdf` | Misleading / Exaggerated | UNCERTAIN | **FAKE** | 77% | 1 |
| **T19** | PDF | `pdf/T19_mars_subsurface_water_discovery.pdf` | Uncertain / Scientific Debate | UNCERTAIN | **UNCERTAIN** | 56% | 0 |
| **T20** | PDF | `pdf/T20_world_bank_economic_outlook_2026.pdf` | Neutral / Factual | REAL | **UNCERTAIN** | 56% | 0 |

---

## How to Test / Demonstrate

### Mode A: Plain Text Claims
1. Open any `.txt` file in `audit_inputs/text/`.
2. Copy the exact text under `EXACT INPUT TEXT`.
3. In TruthLens UI (`http://localhost:5173`), navigate to **News Analyzer**.
4. Select the **Text** tab, paste the claim, and click **Analyze Credibility**.

### Mode B: News Article URLs
1. Open `audit_inputs/url/urls_master_list.txt` or any file in `audit_inputs/url/`.
2. Copy the exact URL (e.g., `https://en.wikipedia.org/wiki/Moon_landing`).
3. In TruthLens UI, select the **URL** tab, paste the link, and click **Analyze Credibility**.

### Mode C: TXT File Uploads
1. In TruthLens UI, select the **File Upload** tab.
2. Drag and drop or browse to `audit_inputs/txt/T11_nasa_artemis_mission.txt` (or any T11–T15 file).
3. Click **Analyze Credibility**.

### Mode D: PDF File Uploads
1. In TruthLens UI, select the **File Upload** tab.
2. Drag and drop or browse to `audit_inputs/pdf/T17_miracle_mineral_cure_alert.pdf` (or any T16–T20 file).
3. Click **Analyze Credibility**.
