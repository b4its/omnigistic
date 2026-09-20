"""COD Plan kanonik — Pertanyaan 3 (analisis sistem COD).

Kanonik menurut analisis tim (Pertanyaan 3).

Tesis: masalah COD adalah **kegagalan insentif**, bukan sekadar masalah proses.
Kurir dibayar flat per paket, sehingga mengantar COD dengan benar menurunkan
pendapatan hariannya. Solusinya tiga lapis: perbaiki insentif, tambahkan empat
intervensi digital, dan lakukan rekonsiliasi kas tiga arah.

Sumber angka:
  * Figure 2 kasus: 8 paket non-COD = 75 menit, 8 paket COD = 138 menit.
  * Tarif kurir Rp2.000 sampai 2.213 per paket dan bauran COD = ASUMSI TIM.
  * Potensi hemat waktu per intervensi = ASUMSI TIM (diuji lewat pilot).
"""
from __future__ import annotations

from typing import Any

# --- Basis kasus (Figure 2) ---------------------------------------------------
NON_COD_PACKAGES = 8
COD_PACKAGES = 8
NON_COD_MINUTES = 75.0
COD_MINUTES = 138.0
PRODUCTIVE_MINUTES_PER_DAY = 420.0

# --- Asumsi tim (dilabel) -----------------------------------------------------
COURIER_RATE_LOW_IDR = 2_000.0
COURIER_RATE_HIGH_IDR = 2_213.0
UMP_DKI_2026_IDR = 5_729_876.0
DAYS_PER_MONTH = 30.0
HOURS_PER_DAY = 8.0
MINUTES_PER_HOUR = 60.0
# Bauran COD dari total paket (asumsi tim; dokumen menyajikan rentang 25% sampai 45%).
COD_MIX_PCT = 35.0
COD_MIX_RANGE_PCT = (25.0, 45.0)
PACKAGES_PER_YEAR_M = 1_110.0  # juta paket (basis 2023, Table 4)
# Realisasi potensi intervensi (asumsi tim; dokumen memakai 70%, rentang 50% sampai 90%).
REALIZATION_PCT = 70.0
# Nilai kerja tahunan dokumen (Rp1,95 T) memakai komponen tambahan berlabel asumsi.
WORKING_VALUE_IDR_T = 1.95
WORKING_EXTRA_PER_PACKAGE_IDR = 5_000.0  # retur yang dicegah + selisih rekonsiliasi (asumsi)

# Empat intervensi digital + potensi hemat waktu (menit per paket COD) = ASUMSI TIM.
INTERVENTIONS: list[dict[str, Any]] = [
    {"key": "qris", "label": "QRIS on Delivery", "minutes": 3.5,
     "mechanism": "Pembayaran nontunai menghapus waktu menghitung uang dan kembalian."},
    {"key": "prearrival", "label": "Konfirmasi pra-kedatangan", "minutes": 2.5,
     "mechanism": "Penerima siap saat kurir tiba; menunggu di depan pintu hilang."},
    {"key": "risk_route", "label": "Skor risiko dan rute dua-objektif", "minutes": 1.0,
     "mechanism": "Paket COD berisiko dikelompokkan dan diurutkan, tidak menyebar acak."},
    {"key": "pudo_small", "label": "PUDO atau loker untuk COD kecil", "minutes": 0.5,
     "mechanism": "COD bernilai kecil dialihkan ke titik ambil, kurir tak menunggu."},
]

# Perbandingan proses penugasan kurir COD vs non-COD (delapan tahap, dari dokumen).
PROCESS_COMPARISON: list[dict[str, str]] = [
    {"stage": "Seleksi", "nonCod": "KTP, SIM, kontak", "cod": "Ditambah rekam jejak kas, jaminan, pelatihan"},
    {"stage": "Ikatan finansial", "nonCod": "Tidak ada", "cod": "Deposit atau setoran harian"},
    {"stage": "Persiapan pra-kedatangan", "nonCod": "Tidak kritis", "cod": "Kritis, tetapi belum ada mekanisme konfirmasi"},
    {"stage": "Waktu di titik", "nonCod": "Singkat", "cod": "Lebih lama (verifikasi, menunggu, menghitung uang)"},
    {"stage": "Kegagalan", "nonCod": "Coba ulang atau titip", "cod": "Harus retur"},
    {"stage": "Rekonsiliasi", "nonCod": "Tidak ada", "cod": "Harian, manual, rawan salah"},
    {"stage": "Insentif", "nonCod": "Flat per paket", "cod": "Flat juga, tanpa kompensasi waktu dan risiko kas"},
    {"stage": "Risiko", "nonCod": "Paket hilang atau rusak", "cod": "Ditambah kas hilang dan penipuan"},
]

# Rekonsiliasi kas tiga arah (dokumen).
RECONCILIATION_SOURCES = [
    "Bukti serah-terima (POD)",
    "Mutasi dompet kurir",
    "Catatan merchant",
]


def cod_plan() -> dict[str, Any]:
    """Rencana COD kanonik: waktu, insentif, intervensi, dampak, dan nilai."""
    non_cod_per_pkg = NON_COD_MINUTES / NON_COD_PACKAGES
    cod_per_pkg = COD_MINUTES / COD_PACKAGES
    gap_per_pkg = cod_per_pkg - non_cod_per_pkg
    prod_non_cod = PRODUCTIVE_MINUTES_PER_DAY / non_cod_per_pkg
    prod_cod = PRODUCTIVE_MINUTES_PER_DAY / cod_per_pkg
    lost_deliveries = prod_non_cod - prod_cod

    total_intervention_min = sum(i["minutes"] for i in INTERVENTIONS)
    realized_min = total_intervention_min * REALIZATION_PCT / 100.0
    target_per_pkg = cod_per_pkg - realized_min
    prod_target = PRODUCTIVE_MINUTES_PER_DAY / target_per_pkg

    courier_cost_per_min = UMP_DKI_2026_IDR / DAYS_PER_MONTH / HOURS_PER_DAY / MINUTES_PER_HOUR
    value_per_cod_pkg = realized_min * courier_cost_per_min
    cod_mix_f = COD_MIX_PCT / 100.0
    cod_packages_per_year_m = PACKAGES_PER_YEAR_M * cod_mix_f
    derivable_idr = cod_packages_per_year_m * 1e6 * value_per_cod_pkg
    # Pakai nilai bulat 20,45 (seperti dokumen) agar rupiahnya persis sama.
    lost_rounded = round(lost_deliveries, 2)
    range_vals = {
        f"{p:.0f}pct": round(PACKAGES_PER_YEAR_M * p / 100.0 * 1e6 * value_per_cod_pkg / 1e12, 2)
        for p in COD_MIX_RANGE_PCT
    }

    return {
        "engine": "COD Plan (insentif + intervensi digital + rekonsiliasi tiga arah)",
        "note": (
            "Waktu dasar dari Figure 2 kasus (8 paket: 75 menit non-COD, 138 menit COD). "
            "Tarif kurir, bauran COD, potensi hemat per intervensi, dan realisasi = ASUMSI TIM "
            "(dilabel). Nilai kerja tahunan memakai komponen tambahan berlabel asumsi."
        ),
        "timeBasis": {
            "packages": NON_COD_PACKAGES,
            "nonCodMinutes": NON_COD_MINUTES,
            "codMinutes": COD_MINUTES,
            "nonCodPerPackageMin": round(non_cod_per_pkg, 3),
            "codPerPackageMin": round(cod_per_pkg, 3),
            "gapPerPackageMin": round(gap_per_pkg, 3),
            "productiveMinutesPerDay": PRODUCTIVE_MINUTES_PER_DAY,
            "productivityNonCodPerDay": round(prod_non_cod, 1),
            "productivityCodPerDay": round(prod_cod, 1),
            "productivityDropPct": round((1 - prod_cod / prod_non_cod) * 100, 1),
        },
        "incentive": {
            "courierRateLowIdr": COURIER_RATE_LOW_IDR,
            "courierRateHighIdr": COURIER_RATE_HIGH_IDR,
            "lostDeliveriesPerDay": lost_rounded,
            "lostIncomePerDayLowIdr": round(lost_rounded * COURIER_RATE_LOW_IDR),
            "lostIncomePerDayHighIdr": round(lost_rounded * COURIER_RATE_HIGH_IDR),
            "note": (
                "Kurir dibayar flat per paket, sehingga mengantar COD dengan benar "
                "menurunkan pendapatan hariannya. Perilaku rasional menjadi menghindari "
                "COD, mengurangi verifikasi, atau menolak di tempat (yang melahirkan retur)."
            ),
        },
        "interventions": INTERVENTIONS,
        "interventionTotalMin": round(total_intervention_min, 1),
        "realization": {
            "realizationPct": REALIZATION_PCT,
            "realizedMinutesPerPackage": round(realized_min, 2),
            "targetMinutesPerPackage": round(target_per_pkg, 2),
            "productivityTargetPerDay": round(prod_target, 1),
            "productivityUpliftPct": round((prod_target / prod_cod - 1) * 100, 1),
        },
        "targets": [
            {"metric": "Waktu per paket COD", "baseline": f"{cod_per_pkg:.2f} menit", "target": f"{target_per_pkg:.1f} menit"},
            {"metric": "Produktivitas COD", "baseline": f"{prod_cod:.1f} per hari", "target": f"{prod_target:.0f} per hari"},
            {"metric": "Retur COD", "baseline": "10%", "target": "6,5%"},
            {"metric": "Selisih rekonsiliasi kas", "baseline": "0,10%", "target": "0,02%"},
        ],
        "processComparison": PROCESS_COMPARISON,
        "reconciliation": {
            "sources": RECONCILIATION_SOURCES,
            "note": "Rekonsiliasi kas tiga arah antara bukti serah-terima, mutasi dompet kurir, dan catatan merchant.",
        },
        "value": {
            "courierCostPerMinuteIdr": round(courier_cost_per_min),
            "valuePerCodPackageIdr": round(value_per_cod_pkg),
            "codMixPct": COD_MIX_PCT,
            "codPackagesPerYearM": round(cod_packages_per_year_m, 1),
            "derivableIdrT": round(derivable_idr / 1e12, 2),
            "rangeIdrT": range_vals,
            "workingValueIdrT": WORKING_VALUE_IDR_T,
            "workingExtraPerPackageIdr": WORKING_EXTRA_PER_PACKAGE_IDR,
            "note": (
                "Nilai yang dapat diturunkan dari data dokumen: penghematan waktu kurir "
                f"(Rp{value_per_cod_pkg:,.0f} per paket COD, bauran {COD_MIX_PCT:.0f}%) = "
                f"Rp{derivable_idr / 1e12:.2f} triliun per tahun. Angka kerja Rp{WORKING_VALUE_IDR_T} triliun "
                "memakai tambahan komponen retur yang dicegah dan selisih rekonsiliasi "
                "(berlabel asumsi tim), karena biaya retur dan nilai kas tidak tersedia di kasus."
            ),
        },
        "assumptions": {
            "umpDki2026Idr": UMP_DKI_2026_IDR,
            "codMixRangePct": list(COD_MIX_RANGE_PCT),
            "realizationRangePct": [50.0, 90.0],
        },
    }
