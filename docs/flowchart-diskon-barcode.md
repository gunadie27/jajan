# Alur Sistem Diskon & Barcode Member

## Penjelasan Singkat
- **Owner** mengatur diskon di backend (tambah/edit/hapus aturan diskon).
- **Kasir** scan barcode member saat pembayaran di POS.
- Sistem otomatis fetch data member, terapkan diskon/tier, dan isi data pelanggan.
- Struk digital dengan QR code dikirim ke WhatsApp customer.

## Flowchart Alur Diskon & Barcode Member

```mermaid
flowchart TD
  subgraph Diskon
    A1["Owner buka Manajemen Diskon"] --> A2["Owner tambah/edit/hapus aturan diskon"]
    A2 --> A3["Aturan diskon tersimpan di backend"]
    A3 -->|"Saat transaksi"| B1
  end
  subgraph BarcodeMember
    B1["Kasir klik Scan Member di POS"] --> B2["Kasir scan QR code dari HP customer"]
    B2 --> B3["Sistem baca ID member dari QR"]
    B3 --> B4["Fetch data member dari backend"]
    B4 --> B5["Isi otomatis nama & no HP di form pembayaran"]
    B5 --> B6["Ambil aturan diskon & tier member"]
    B6 --> B7["Diskon otomatis diterapkan jika berlaku"]
    B7 --> B8["Kasir konfirmasi & selesaikan pembayaran"]
    B8 --> B9["Struk digital (dengan QR) dikirim ke WhatsApp customer"]
  end
  style Diskon fill:#e0e7ff,stroke:#6366f1,stroke-width:2px
  style BarcodeMember fill:#f0fdf4,stroke:#22c55e,stroke-width:2px
```

---

**File ini dapat di-preview langsung di VSCode, GitHub, atau tool markdown lain yang support Mermaid.** 