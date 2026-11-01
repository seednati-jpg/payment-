export interface InvoiceRow {
  id: string;
  t: 'n' | 'h' | 'g'; // 'n' = regular with travel, 'h' = hours only, 'g' = global (fixed price)
  date: string;
  origin: string;
  place: string;
  from: string;
  to: string;
  km: string;
  h: string;
  g?: string; // global fixed price (only for t === 'g')
  auto?: boolean;
  // Computed
  _q?: number; // quantity (hours)
  _a?: number; // amount (hours * rate)
  _k?: number; // total km (km * 2 roundtrip for 'n')
  _t?: number; // travel amount (_k * kmRate)
  _gl?: number; // global fixed amount (t === 'g')
}

export interface InvoiceSettings {
  name: string;
  id: string;
  acct: string;
  bank: string;
  branch: string;
  rate: number;
  kmRate: number;
  origin: string;
  places: Record<string, string | number>;
  labels?: Record<string, string>;
  hl?: Record<string, string>;
  showKmRate?: boolean;
}

export interface InvoiceHeader {
  client: string;
  desc: string;
  m: number; // 1-12
  my: number; // full year e.g. 2026
  date: string; // YYYY-MM-DD
  rate: number;
  kmRate: number;
  park: boolean;
  parkLabel: string;
  parkAmt: string;
  // Computed
  _q?: number;
  _a?: number;
  _t?: number;
  _k?: number;
  _p?: number;
  _g?: number;
  _gl?: number; // total of global rows
}
