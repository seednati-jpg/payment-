import { InvoiceSettings } from './types';

export const MN = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export const LD: Record<string, string> = {
  title: 'דרישת תשלום',
  date: 'תאריך',
  lecturer: 'שם המרצה',
  idl: 'ת.ז',
  to: 'לכבוד',
  subject: 'הנדון: דרישת תשלום',
  intro:
    'במסגרת ביצוע {desc} {month} בוצעה עבודה. בהתאם לכך, אבקשכם לשלם לי תמורת העבודה שבוצעה, לפי הפירוט הבא:',
  c_date: 'תאריך',
  c_place: 'מקום',
  c_from: 'משעה',
  c_to: 'עד שעה',
  c_qty: 'כמות',
  c_amt: 'סכום',
  c_km: 'נסיעות בק״מ',
  c_totkm: 'סה״כ ק״מ',
  c_trav: 'סכום הנסיעות',
  c_rate: 'שעת עבודה',
  c_kmrate: 'תעריף לק״מ',
  s_trav: 'סה״כ נסיעות',
  s_hours: 'סה״כ שעות',
  s_global: 'סה״כ גלובלי',
  s_total: 'סה״כ כללי',
  pay: 'את התשלום נא להעביר לחשבון מס׳ {acct} בבנק {bank} סניף {branch}.',
  receipt: 'קבלה תשלח לאחר קבלת התשלום בפועל.',
  closing: 'בברכה:',
};

export const LSPEC: [string, string][] = [
  ['title', 'כותרת ראשית'],
  ['date', 'תווית תאריך'],
  ['lecturer', 'תווית שם המרצה'],
  ['idl', 'תווית ת.ז'],
  ['to', 'תווית ״לכבוד״'],
  ['subject', 'שורת ״הנדון״ (כולל המילה הנדון)'],
  ['intro', 'פסקת הפתיחה. אפשר להשתמש ב- {desc} {month}'],
  ['c_date', 'עמודה: תאריך'],
  ['c_place', 'עמודה: מקום'],
  ['c_from', 'עמודה: משעה'],
  ['c_to', 'עמודה: עד שעה'],
  ['c_qty', 'עמודה: כמות'],
  ['c_amt', 'עמודה: סכום'],
  ['c_km', 'עמודה: נסיעות בק״מ'],
  ['c_totkm', 'עמודה: סה״כ ק״מ'],
  ['c_trav', 'עמודה: סכום הנסיעות'],
  ['c_rate', 'עמודה: שעת עבודה'],
  ['c_kmrate', 'עמודה: תעריף לק״מ'],
  ['s_trav', 'סיכום: סה״כ נסיעות'],
  ['s_hours', 'סיכום: סה״כ שעות'],
  ['s_global', 'סיכום: סה״כ גלובלי'],
  ['s_total', 'סיכום: סה״כ כללי'],
  ['pay', 'משפט התשלום. אפשר להשתמש ב- {acct} {bank} {branch}'],
  ['receipt', 'משפט הקבלה'],
  ['closing', 'ברכת סיום'],
];

export const HSPEC: [string, string][] = [
  ['total', 'שורת סה״כ כללי'],
  ['trav', 'שורת סה״כ נסיעות'],
  ['hours', 'שורת סה״כ שעות'],
  ['global', 'שורת סה״כ גלובלי'],
  ['park', 'שורת חניה'],
  ['to', 'שורת ״לכבוד״ (שם הלקוח)'],
  ['subject', 'שורת ״הנדון״'],
  ['pay', 'משפט התשלום (פרטי הבנק)'],
];

export const HD: Record<string, string> = { total: 'y' };

export const DEFAULT_SETTINGS: InvoiceSettings = {
  name: '',
  id: '',
  acct: '',
  bank: '',
  branch: '',
  rate: 80,
  kmRate: 1.3,
  origin: '',
  places: {},
  labels: {},
  hl: { ...HD },
  showKmRate: true,
};

export const HIGHLIGHT_OPTIONS = [
  { val: '', label: 'ללא' },
  { val: 'b', label: 'מודגש' },
  { val: 'u', label: 'קו תחתון' },
  { val: 'y', label: 'צהוב' },
  { val: 'yb', label: 'צהוב + מודגש' },
  { val: 'bu', label: 'מודגש + קו תחתון' },
  { val: 'yu', label: 'צהוב + קו תחתון' },
];
