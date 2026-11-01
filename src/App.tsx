import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  MapPin,
  Clock,
  Car,
  Settings,
  Share2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { InvoiceHeader, InvoiceRow, InvoiceSettings } from './types';
import {
  MN,
  LD,
  LSPEC,
  HSPEC,
  DEFAULT_SETTINGS,
  HIGHLIGHT_OPTIONS,
} from './constants';
import { generatePdfDocument } from './pdfGenerator';
import { PWAInstallButton } from './PWAInstallButton';

const pad = (n: number | string) => String(n).padStart(2, '0');
const num = (v: any) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};
const fmt = (n: number) =>
  (Math.round((n || 0) * 100) / 100).toLocaleString('he-IL', {
    maximumFractionDigits: 2,
  });
const fdate = (d: string) => (d ? d.split('-').reverse().join('/') : '');
const fdate2 = (d: string) =>
  d ? d.split('-').reverse().map((x, i) => (i === 2 ? x.slice(2) : x)).join('/') : '';
const tm = (s: string) => {
  const [a, b] = (s || '0:0').split(':');
  return +a * 60 + +b;
};

export default function App() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const prevMonthDate = new Date(currentYear, today.getMonth() - 1, 1);

  // Settings State from LocalStorage
  const [settings, setSettings] = useState<InvoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('dm_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dm_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dm_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('dm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('dm_theme', 'light');
    }
  }, [darkMode]);

  // Invoice header state
  const [header, setHeader] = useState<InvoiceHeader>(() => {
    try {
      const saved = localStorage.getItem('dm_draft_header');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      client: '',
      desc: 'פעילות הדרכה',
      m: prevMonthDate.getMonth() + 1,
      my: prevMonthDate.getFullYear(),
      date: `${currentYear}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      rate: settings.rate || 80,
      kmRate: settings.kmRate || 1.3,
      park: false,
      parkLabel: 'חניה',
      parkAmt: '',
    };
  });

  // Rows state
  const [rows, setRows] = useState<InvoiceRow[]>(() => {
    try {
      const saved = localStorage.getItem('dm_draft_rows');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'r_' + Date.now(),
        t: 'n',
        date: '',
        origin: settings.origin || '',
        place: '',
        from: '',
        to: '',
        km: '',
        h: '',
        auto: false,
      },
    ];
  });

  // Auto-save draft
  useEffect(() => {
    try {
      localStorage.setItem('dm_draft_header', JSON.stringify(header));
      localStorage.setItem('dm_draft_rows', JSON.stringify(rows));
    } catch (e) {
      console.error(e);
    }
  }, [header, rows]);

  // UI state
  const [showDraft, setShowDraft] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Labels & Highlights with defaults
  const activeLabels = useMemo<Record<string, string>>(
    () => ({ ...LD, ...(settings.labels || {}) }),
    [settings.labels]
  );
  const activeHighlights = useMemo<Record<string, string>>(
    () => ({ total: 'y', ...(settings.hl || {}) }),
    [settings.hl]
  );

  const monthStr = useMemo(() => {
    return MN[(header.m || 1) - 1] + ' ' + header.my;
  }, [header.m, header.my]);

  // Unique places for datalist
  const placeSuggestions = useMemo(() => {
    const set = new Set<string>();
    Object.keys(settings.places || {}).forEach((k) => {
      k.split('|').forEach((x) => {
        if (x && x.trim()) set.add(x.trim());
      });
    });
    if (settings.origin) set.add(settings.origin);
    return Array.from(set);
  }, [settings.places, settings.origin]);

  // Calculations
  const calculatedData = useMemo(() => {
    let totQty = 0;
    let totAmt = 0;
    let totKm = 0;
    let totTrav = 0;

    const calcRows = rows.map((r) => {
      let q = 0;
      if (r.t === 'h') {
        q = num(r.h);
      } else if (r.from && r.to) {
        q = Math.max(0, (tm(r.to) - tm(r.from)) / 60);
      }
      const a = q * num(header.rate);
      const k = r.t === 'n' ? num(r.km) * 2 : 0;
      const t = k * num(header.kmRate);

      totQty += q;
      totAmt += a;
      totKm += k;
      totTrav += t;

      return {
        ...r,
        _q: q,
        _a: a,
        _k: k,
        _t: t,
      };
    });

    const parkAmount = header.park ? num(header.parkAmt) : 0;
    const grandTotal = totAmt + totTrav + parkAmount;

    return {
      rows: calcRows,
      _q: totQty,
      _a: totAmt,
      _k: totKm,
      _t: totTrav,
      _p: parkAmount,
      _g: grandTotal,
    };
  }, [rows, header]);

  // Place memory helpers
  const rkey = (origin: string, place: string) =>
    (origin || settings.origin || '').trim() + '|' + (place || '').trim();

  const getRememberedKm = (origin: string, place: string) => {
    const k = rkey(origin, place);
    if (settings.places?.[k] !== undefined) return String(settings.places[k]);
    if (settings.places?.[place.trim()] !== undefined)
      return String(settings.places[place.trim()]);
    return null;
  };

  const handleRowChange = (id: string, field: keyof InvoiceRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };

        // Auto-lookup KM when destination or origin changes
        if ((field === 'place' || field === 'origin') && updated.t === 'n') {
          if (updated.place && (!updated.km || updated.auto)) {
            const remembered = getRememberedKm(updated.origin, updated.place);
            if (remembered !== null) {
              updated.km = remembered;
              updated.auto = true;
            }
          }
        }

        // Cache KM to settings if user explicitly types KM and place is filled
        if (field === 'km') {
          updated.auto = false;
          if (updated.place && val) {
            const cacheKey = rkey(updated.origin, updated.place);
            setSettings((s) => ({
              ...s,
              places: { ...s.places, [cacheKey]: val },
            }));
          }
        }

        return updated;
      })
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: 'r_' + Date.now() + Math.random().toString(36).substring(2, 6),
        t: 'n',
        date: '',
        origin: settings.origin || '',
        place: '',
        from: '',
        to: '',
        km: '',
        h: '',
        auto: false,
      },
    ]);
  };

  const duplicateRow = (index: number) => {
    const source = rows[index];
    const newR: InvoiceRow = {
      ...source,
      id: 'r_' + Date.now() + Math.random().toString(36).substring(2, 6),
    };
    const next = [...rows];
    next.splice(index + 1, 0, newR);
    setRows(next);
  };

  const deleteRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const clearForm = () => {
    if (!window.confirm('האם לאפס את נתוני הדרישה הנוכחית?')) return;
    setHeader({
      client: '',
      desc: 'פעילות הדרכה',
      m: prevMonthDate.getMonth() + 1,
      my: prevMonthDate.getFullYear(),
      date: `${currentYear}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      rate: settings.rate || 80,
      kmRate: settings.kmRate || 1.3,
      park: false,
      parkLabel: 'חניה',
      parkAmt: '',
    });
    setRows([
      {
        id: 'r_' + Date.now(),
        t: 'n',
        date: '',
        origin: settings.origin || '',
        place: '',
        from: '',
        to: '',
        km: '',
        h: '',
        auto: false,
      },
    ]);
    setMsg({ text: 'הטופס אופס בהצלחה', ok: true });
  };

  // Generate and Share PDF
  const handleMakePdf = async () => {
    if (!header.client.trim()) {
      setMsg({ text: 'חסר שם לקוח (״לכבוד״)', ok: false });
      return;
    }
    const hasValidRow = calculatedData.rows.some((r) => (r._q ?? 0) > 0);
    if (!hasValidRow) {
      setMsg({
        text: 'אין שורה עם שעות פעילות. בדוק שעות התחלה וסיום.',
        ok: false,
      });
      return;
    }

    const missingKmIndex = calculatedData.rows.findIndex(
      (r) => r.t === 'n' && (r._q ?? 0) > 0 && !r.km
    );
    if (missingKmIndex >= 0) {
      const confirmNoKm = window.confirm(
        `בשורה ${missingKmIndex + 1} לא הוזנו ק״מ. האם להמשיך ללא נסיעות עבור שורה זו?`
      );
      if (!confirmNoKm) return;
    }

    setGenerating(true);
    setMsg({ text: 'מפיק קובץ PDF איכותי…', ok: true });

    try {
      const mp = {
        desc: header.desc,
        month: monthStr,
        acct: settings.acct,
        bank: settings.bank,
        branch: settings.branch,
      };

      const doc = generatePdfDocument({
        R: {
          ...header,
          _q: calculatedData._q,
          _a: calculatedData._a,
          _k: calculatedData._k,
          _t: calculatedData._t,
          _p: calculatedData._p,
          _g: calculatedData._g,
        },
        S: settings,
        rows: calculatedData.rows,
        L: activeLabels,
        H: activeHighlights,
        mp,
        showKmRate: settings.showKmRate !== false,
      });

      const blob = doc.output('blob');
      const filename = `דרישת תשלום - ${header.client.trim()} - ${monthStr}.pdf`;

      // Mobile share sheet integration
      const pdfFile = new File([blob], filename, {
        type: 'application/pdf',
      });

      if (
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] }) &&
        /iphone|ipad|ipod|android/i.test(navigator.userAgent)
      ) {
        try {
          await navigator.share({
            title: filename,
            text: `דרישת תשלום עבור ${header.client.trim()} לחודש ${monthStr}`,
            files: [pdfFile],
          });
          setMsg({ text: 'הקובץ שותף בהצלחה!', ok: true });
          setGenerating(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setMsg({ text: 'השיתוף בוטל.', ok: false });
            setGenerating(false);
            return;
          }
          // Fall back to download if share failed
        }
      }

      // Download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMsg({ text: 'הקובץ נוצר והורד למכשיר בהצלחה!', ok: true });
    } catch (err: any) {
      console.error(err);
      setMsg({
        text: 'שגיאה בהפקת ה-PDF: ' + (err?.message || 'שגיאה לא צפויה'),
        ok: false,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Export / Import Settings
  const exportSettings = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(settings, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'הגדרות_דרישת_תשלום_גיבוי.json';
    a.click();
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        setMsg({ text: 'ההגדרות יובאו בהצלחה!', ok: true });
      } catch (err) {
        setMsg({ text: 'קובץ לא תקין', ok: false });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper for split date selection (Day, Month, Year)
  const renderDateSelect = (
    value: string,
    onChange: (val: string) => void,
    shortYear = false
  ) => {
    const [y, m, d] = (value || '').split('-').map(Number);
    return (
      <div className="grid grid-cols-3 gap-1.5" dir="rtl">
        <select
          value={d || ''}
          onChange={(e) => {
            const newD = e.target.value ? pad(e.target.value) : '01';
            const newM = m ? pad(m) : '01';
            const newY = y || currentYear;
            onChange(`${newY}-${newM}-${newD}`);
          }}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">יום</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {pad(day)}
            </option>
          ))}
        </select>

        <select
          value={m || ''}
          onChange={(e) => {
            const newD = d ? pad(d) : '01';
            const newM = e.target.value ? pad(e.target.value) : '01';
            const newY = y || currentYear;
            onChange(`${newY}-${newM}-${newD}`);
          }}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">חודש</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mon) => (
            <option key={mon} value={mon}>
              {pad(mon)} ({MN[mon - 1]})
            </option>
          ))}
        </select>

        <select
          value={y || ''}
          onChange={(e) => {
            const newD = d ? pad(d) : '01';
            const newM = m ? pad(m) : '01';
            const newY = e.target.value || currentYear;
            onChange(`${newY}-${newM}-${newD}`);
          }}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">שנה</option>
          {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map((yr) => (
            <option key={yr} value={yr}>
              {shortYear ? String(yr).slice(2) : yr}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Helper for 24h Time select (Hour, Minute)
  const renderTimeSelect = (
    value: string,
    onChange: (val: string) => void
  ) => {
    const [h, mi] = (value || '').split(':');
    return (
      <div className="grid grid-cols-2 gap-1.5" dir="rtl">
        <select
          value={h ?? ''}
          onChange={(e) => {
            const newH = e.target.value;
            if (newH === '') {
              onChange('');
            } else {
              onChange(`${pad(newH)}:${pad(mi || '00')}`);
            }
          }}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">שעה</option>
          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
            <option key={hour} value={hour}>
              {pad(hour)}
            </option>
          ))}
        </select>

        <select
          value={mi !== undefined && mi !== '' ? Number(mi) : ''}
          onChange={(e) => {
            const newMi = e.target.value !== '' ? pad(e.target.value) : '00';
            const newH = h !== undefined && h !== '' ? pad(h) : '08';
            onChange(`${newH}:${newMi}`);
          }}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">דקה</option>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
            <option key={minute} value={minute}>
              {pad(minute)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Render draft HTML for preview
  const draftHtml = useMemo(() => {
    const L = activeLabels;
    const H = activeHighlights;
    const kr = settings.showKmRate !== false;
    const NC = kr ? 11 : 10;
    const mp = {
      desc: header.desc,
      month: monthStr,
      acct: settings.acct,
      bank: settings.bank,
      branch: settings.branch,
    };

    const cl = (k: string) =>
      (H[k] || '')
        .split('')
        .filter(Boolean)
        .map((c: string) =>
          c === 'y'
            ? 'bg-amber-200 dark:bg-amber-400 dark:text-neutral-900 px-1 rounded'
            : c === 'b'
            ? 'font-bold'
            : c === 'u'
            ? 'underline'
            : ''
        )
        .join(' ');

    const pl = (r: InvoiceRow) =>
      (r.origin ? r.origin + ' - ' : '') + (r.place || '');

    const tpl = (s: string) =>
      s.replace(/\{(\w+)\}/g, (_, k) => (mp as any)[k] || '');

    return {
      title: L.title,
      date: `${L.date}: ${fdate2(header.date)}`,
      lecturer: `${L.lecturer}: ${settings.name || '—'}`,
      id: `${L.idl} ${settings.id || '—'}`,
      to: `${L.to}: ${header.client || '—'}`,
      subject: L.subject,
      intro: tpl(L.intro),
      rows: calculatedData.rows.filter((r) => (r._q ?? 0) > 0),
      cl,
      pl,
      NC,
      L,
      kr,
      pay: tpl(L.pay),
      receipt: L.receipt,
      closing: L.closing,
    };
  }, [
    activeLabels,
    activeHighlights,
    settings,
    header,
    monthStr,
    calculatedData,
  ]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#14171d] text-[#1c2230] dark:text-[#ecebe6] transition-colors pb-28 pt-3 px-3 sm:px-6">
      <datalist id="placeSuggestions">
        {placeSuggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <main className="max-w-2xl mx-auto space-y-4">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-2 border-b border-[#ded8cb] dark:border-[#323946]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1d4e7a] to-[#0f2b48] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1c2230] dark:text-[#ecebe6]">
                דרישת תשלום
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                ללא צורך ברישום · נשמר בטלפון
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#fffdf9] dark:bg-[#1d222b] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-xs"
              title={darkMode ? 'מצב בהיר' : 'מצב כהה'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={clearForm}
              className="p-2 rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#fffdf9] dark:bg-[#1d222b] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-xs"
              title="נקה טופס"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Status Toast Message */}
        {msg && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-sm shadow-xs transition-all ${
              msg.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {msg.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="flex-1 font-medium">{msg.text}</span>
            <button
              onClick={() => setMsg(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Client & Activity Header Card */}
        <section className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                שם הלקוח (״לכבוד״) *
              </label>
              <input
                type="text"
                value={header.client}
                onChange={(e) =>
                  setHeader({ ...header, client: e.target.value })
                }
                placeholder="למשל: איחוד הצלה, עיריית ירושלים, מכללה…"
                className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3.5 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                תיאור הפעילות
              </label>
              <input
                type="text"
                value={header.desc}
                onChange={(e) => setHeader({ ...header, desc: e.target.value })}
                className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                חודש הפעילות
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={header.m}
                  onChange={(e) =>
                    setHeader({ ...header, m: Number(e.target.value) })
                  }
                  className="rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                >
                  {MN.map((mName, i) => (
                    <option key={mName} value={i + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={header.my}
                  onChange={(e) =>
                    setHeader({ ...header, my: Number(e.target.value) })
                  }
                  className="rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                >
                  {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map(
                    (yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                תאריך הדרישה (יום / חודש / שנה)
              </label>
              {renderDateSelect(
                header.date,
                (val) => setHeader({ ...header, date: val }),
                true
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                מחיר לשעה (₪)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={header.rate || ''}
                onChange={(e) =>
                  setHeader({ ...header, rate: num(e.target.value) })
                }
                className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                תעריף לק״מ (₪)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={header.kmRate || ''}
                onChange={(e) =>
                  setHeader({ ...header, kmRate: num(e.target.value) })
                }
                className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
              />
            </div>
          </div>
        </section>

        {/* Rows List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-[#1c2230] dark:text-[#ecebe6] flex items-center gap-2">
              <span>פירוט ימי הדרכה ונסיעות</span>
              <span className="text-xs font-normal bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-700 dark:text-neutral-300">
                {rows.length} שורות
              </span>
            </h2>
          </div>

          {calculatedData.rows.map((row, index) => {
            const originAddress = (row.origin || settings.origin || '').trim();
            const destinationAddress = (row.place || '').trim();
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(
              destinationAddress
            )}${
              originAddress
                ? `&origin=${encodeURIComponent(originAddress)}`
                : ''
            }`;

            return (
              <div
                key={row.id}
                className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-all"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#ded8cb]/60 dark:border-[#323946]/60">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#1d4e7a] dark:text-[#6aa7da]">
                      שורה {index + 1}
                    </span>
                    <select
                      value={row.t}
                      onChange={(e) =>
                        handleRowChange(row.id, 't', e.target.value as 'n' | 'h')
                      }
                      className="rounded-lg border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] text-xs font-semibold px-2 py-1"
                    >
                      <option value="n">רגילה (הדרכה + נסיעות)</option>
                      <option value="h">שעות בלבד (שעת בטלה / משרד)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateRow(index)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg"
                      title="שכפל שורה"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg"
                        title="מחק שורה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                      תאריך הפעילות
                    </label>
                    {renderDateSelect(
                      row.date,
                      (val) => handleRowChange(row.id, 'date', val),
                      false
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>מוצא (ריק = ברירת מחדל)</span>
                    </label>
                    <input
                      type="text"
                      list="placeSuggestions"
                      value={row.origin}
                      onChange={(e) =>
                        handleRowChange(row.id, 'origin', e.target.value)
                      }
                      placeholder={settings.origin || 'עיר / כתובת'}
                      className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>יעד (מקום הפעילות)</span>
                    </label>
                    <input
                      type="text"
                      list="placeSuggestions"
                      value={row.place}
                      onChange={(e) =>
                        handleRowChange(row.id, 'place', e.target.value)
                      }
                      placeholder="למשל: ירושלים, בני ברק, מטה..."
                      className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                    />
                  </div>

                  {/* Google maps link */}
                  <div className="sm:col-span-2 flex items-center justify-between text-xs pt-0.5">
                    {destinationAddress ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1d4e7a] dark:text-[#6aa7da] font-semibold hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>פתח מסלול נסיעה ב-Google Maps</span>
                      </a>
                    ) : (
                      <span className="text-neutral-400 text-xs">
                        📍 הזן יעד כדי לפתוח ניווט במפות
                      </span>
                    )}

                    {row.auto && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        ק״מ הושלם אוטומטית מזיכרון
                      </span>
                    )}
                  </div>

                  {row.t === 'n' ? (
                    <>
                      <div className="sm:col-span-2 pt-1 border-t border-[#ded8cb]/40 dark:border-[#323946]/40">
                        <div className="text-xs font-bold text-[#1d4e7a] dark:text-[#6aa7da] mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>שעות ההדרכה (24 שעות)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[11px] text-neutral-500 block mb-0.5">
                              שעת התחלה
                            </span>
                            {renderTimeSelect(row.from, (v) =>
                              handleRowChange(row.id, 'from', v)
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] text-neutral-500 block mb-0.5">
                              שעת סיום
                            </span>
                            {renderTimeSelect(row.to, (v) =>
                              handleRowChange(row.id, 'to', v)
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          <span>ק״מ בכיוון אחד (מוצא ← יעד)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={row.km}
                            onChange={(e) =>
                              handleRowChange(row.id, 'km', e.target.value)
                            }
                            placeholder="הזן מרחק בכיוון אחד..."
                            className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">
                            ק״מ
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 pt-1 border-t border-[#ded8cb]/40 dark:border-[#323946]/40">
                      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>כמות שעות (למשל: 2 או 1.5)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={row.h}
                        onChange={(e) =>
                          handleRowChange(row.id, 'h', e.target.value)
                        }
                        placeholder="שעות"
                        className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e7a]"
                      />
                    </div>
                  )}
                </div>

                {/* Live row calculation badge */}
                <div className="bg-[#f4f1ea] dark:bg-[#14171d] rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex flex-wrap items-center justify-between gap-1 border border-[#ded8cb]/50 dark:border-[#323946]/50">
                  <div className="flex items-center gap-1.5">
                    <span>⏱ {fmt(row._q ?? 0)} שעות</span>
                    <span className="text-neutral-400">×</span>
                    <span>{fmt(header.rate)} ₪</span>
                    <span className="text-neutral-400">=</span>
                    <span className="text-blue-700 dark:text-blue-300 font-bold">
                      {fmt(row._a ?? 0)} ₪
                    </span>
                  </div>

                  {row.t === 'n' && (
                    <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                      <span>🚗 {fmt(row._k ?? 0)} ק״מ (הלוך-חזור)</span>
                      <span>=</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        {fmt(row._t ?? 0)} ₪
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addRow}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[#ded8cb] dark:border-[#323946] hover:border-[#1d4e7a] dark:hover:border-[#6aa7da] bg-[#fffdf9]/50 dark:bg-[#1d222b]/50 text-[#1d4e7a] dark:text-[#6aa7da] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fffdf9] dark:hover:bg-[#1d222b] transition active:scale-98 shadow-xs"
          >
            <Plus className="w-5 h-5" />
            <span>הוסף שורת הדרכה נוספת</span>
          </button>
        </section>

        {/* Optional Parking Card */}
        <section className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl p-4 shadow-xs">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[#1c2230] dark:text-[#ecebe6]">
            <input
              type="checkbox"
              checked={header.park}
              onChange={(e) =>
                setHeader({ ...header, park: e.target.checked })
              }
              className="w-5 h-5 rounded-md accent-[#1d4e7a]"
            />
            <span>הוסף הוצאות חניה (אופציונלי)</span>
          </label>

          {header.park && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#ded8cb]/60 dark:border-[#323946]/60 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                  תיאור החניה
                </label>
                <input
                  type="text"
                  value={header.parkLabel}
                  onChange={(e) =>
                    setHeader({ ...header, parkLabel: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                  סכום החניה (₪)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={header.parkAmt}
                  onChange={(e) =>
                    setHeader({ ...header, parkAmt: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>
          )}
        </section>

        {/* Summary Card */}
        <section className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-2">
            סיכום דרישת התשלום
          </h3>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-400">
                סה״כ שעות הדרכה
              </span>
              <span className="font-semibold tabular-nums">
                {fmt(calculatedData._q)} ש׳ ({fmt(calculatedData._a)} ₪)
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-400">
                סה״כ ק״מ נסיעות (הלוך-חזור)
              </span>
              <span className="font-semibold tabular-nums">
                {fmt(calculatedData._k)} ק״מ
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-400">
                סה״כ סכום נסיעות
              </span>
              <span className="font-semibold tabular-nums">
                {fmt(calculatedData._t)} ₪
              </span>
            </div>

            {header.park && (
              <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {header.parkLabel || 'חניה'}
                </span>
                <span className="font-semibold tabular-nums">
                  {fmt(calculatedData._p)} ₪
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 text-lg font-black text-[#1d4e7a] dark:text-[#6aa7da]">
              <span>סה״כ לתשלום</span>
              <span className="text-xl tabular-nums">
                {fmt(calculatedData._g)} ₪
              </span>
            </div>
          </div>
        </section>

        {/* Draft Button & Toggle */}
        <button
          type="button"
          onClick={() => setShowDraft(!showDraft)}
          className="w-full py-2.5 rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#fffdf9] dark:bg-[#1d222b] text-neutral-800 dark:text-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-xs"
        >
          {showDraft ? (
            <>
              <EyeOff className="w-4 h-4 text-neutral-500" />
              <span>הסתר טיוטת מסמך</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-[#1d4e7a] dark:text-[#6aa7da]" />
              <span>הצג טיוטה מקדימה (איך ייראה ה-PDF)</span>
            </>
          )}
        </button>

        {/* Live Draft Preview Box */}
        {showDraft && (
          <div className="bg-white text-neutral-900 border border-neutral-300 rounded-2xl p-4 shadow-lg overflow-x-auto text-xs sm:text-sm animate-in fade-in">
            <div className="max-w-xl mx-auto space-y-3 font-['Heebo']">
              <h2 className="text-center text-xl font-black underline tracking-wide">
                {draftHtml.title}
              </h2>

              <div className="space-y-1 text-xs">
                <p>{draftHtml.date}</p>
                <p>
                  {draftHtml.lecturer}
                  <br />
                  {draftHtml.id}
                </p>
                <p className={draftHtml.cl('to')}>{draftHtml.to}</p>
                <p className={`font-bold ${draftHtml.cl('subject')}`}>
                  {draftHtml.subject}
                </p>
                <p className="leading-relaxed">{draftHtml.intro}</p>
              </div>

              {/* Table preview */}
              <div className="overflow-x-auto border border-neutral-300 rounded-lg">
                <table className="w-full border-collapse text-[11px] text-center">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-300 font-bold">
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_date}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_place}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_from}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_to}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_qty}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_amt}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_km}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_totkm}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_trav}</th>
                      <th className="p-1 border-r border-neutral-300">{draftHtml.L.c_rate}</th>
                      {draftHtml.kr && <th className="p-1">{draftHtml.L.c_kmrate}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {draftHtml.rows.map((r, i) => (
                      <tr key={r.id || i} className="border-b border-neutral-200">
                        <td className="p-1 border-r border-neutral-300">{fdate(r.date)}</td>
                        <td className="p-1 border-r border-neutral-300">{draftHtml.pl(r)}</td>
                        <td className="p-1 border-r border-neutral-300">{r.t === 'n' ? r.from : '-'}</td>
                        <td className="p-1 border-r border-neutral-300">{r.t === 'n' ? r.to : '-'}</td>
                        <td className="p-1 border-r border-neutral-300">{fmt(r._q ?? 0)}</td>
                        <td className="p-1 border-r border-neutral-300">{fmt(r._a ?? 0)}</td>
                        <td className="p-1 border-r border-neutral-300">{r.t === 'n' ? fmt(num(r.km)) : '-'}</td>
                        <td className="p-1 border-r border-neutral-300">{r.t === 'n' ? fmt(r._k ?? 0) : '-'}</td>
                        <td className="p-1 border-r border-neutral-300">{r.t === 'n' ? fmt(r._t ?? 0) : '-'}</td>
                        <td className="p-1 border-r border-neutral-300">{fmt(header.rate)}</td>
                        {draftHtml.kr && <td className="p-1">{r.t === 'n' ? fmt(header.kmRate) : '-'}</td>}
                      </tr>
                    ))}
                    {/* Summary lines */}
                    <tr className={`border-b border-neutral-300 font-bold bg-neutral-50 ${draftHtml.cl('trav')}`}>
                      <td colSpan={7} className="p-1 text-right border-r border-neutral-300">
                        {draftHtml.L.s_trav}
                      </td>
                      <td className="p-1 border-r border-neutral-300">{fmt(calculatedData._k)}</td>
                      <td className="p-1 border-r border-neutral-300">{fmt(calculatedData._t)}</td>
                      <td colSpan={draftHtml.kr ? 2 : 1}></td>
                    </tr>
                    <tr className={`border-b border-neutral-300 font-bold bg-neutral-50 ${draftHtml.cl('hours')}`}>
                      <td colSpan={4} className="p-1 text-right border-r border-neutral-300">
                        {draftHtml.L.s_hours}
                      </td>
                      <td className="p-1 border-r border-neutral-300">{fmt(calculatedData._q)}</td>
                      <td className="p-1 border-r border-neutral-300">{fmt(calculatedData._a)}</td>
                      <td colSpan={draftHtml.kr ? 5 : 4}></td>
                    </tr>
                    {header.park && (
                      <tr className={`border-b border-neutral-300 font-bold bg-neutral-50 ${draftHtml.cl('park')}`}>
                        <td colSpan={5} className="p-1 text-right border-r border-neutral-300">
                          {header.parkLabel || 'חניה'}
                        </td>
                        <td className="p-1 border-r border-neutral-300">{fmt(calculatedData._p)}</td>
                        <td colSpan={draftHtml.kr ? 5 : 4}></td>
                      </tr>
                    )}
                    <tr className={`font-black bg-neutral-100 ${draftHtml.cl('total')}`}>
                      <td colSpan={5} className="p-1 text-right border-r border-neutral-300 text-sm">
                        {draftHtml.L.s_total}
                      </td>
                      <td colSpan={draftHtml.kr ? 6 : 5} className="p-1 text-sm">
                        {fmt(calculatedData._g)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-xs pt-2">
                <p className={draftHtml.cl('pay')}>{draftHtml.pay}</p>
                <p>{draftHtml.receipt}</p>
                <p className="pt-3">
                  {draftHtml.closing}
                  <br />
                  <b>{settings.name || '—'}</b>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Produce PDF and Share Button */}
        <button
          type="button"
          onClick={handleMakePdf}
          disabled={generating}
          className="w-full py-4 rounded-2xl bg-[#1d4e7a] hover:bg-[#173f63] text-white font-extrabold text-lg sm:text-xl shadow-lg hover:shadow-xl active:scale-98 transition flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>מפיק PDF…</span>
            </>
          ) : (
            <>
              <Share2 className="w-6 h-6" />
              <span>הפק PDF ושתף בנייד</span>
            </>
          )}
        </button>

        {/* Collapsible Settings: Personal, Bank & Defaults */}
        <div className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full p-4 flex items-center justify-between text-right font-bold text-sm text-[#1c2230] dark:text-[#ecebe6] hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#1d4e7a] dark:text-[#6aa7da]" />
              <span>הגדרות קבועות (פרטים אישיים, בנק, כתובת מוצא)</span>
            </div>
            {showSettings ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {showSettings && (
            <div className="p-4 pt-1 border-t border-[#ded8cb]/60 dark:border-[#323946]/60 space-y-3.5 animate-in fade-in">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                פרטים אלו נשמרים בזיכרון המכשיר בלבד וממלאים אוטומטית כל דרישה
                חדשה.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    שם המרצה
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) =>
                      setSettings({ ...settings, name: e.target.value })
                    }
                    placeholder="ישראל ישראלי"
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    תעודת זהות
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.id}
                    onChange={(e) =>
                      setSettings({ ...settings, id: e.target.value })
                    }
                    placeholder="123456789"
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    שם הבנק
                  </label>
                  <input
                    type="text"
                    value={settings.bank}
                    onChange={(e) =>
                      setSettings({ ...settings, bank: e.target.value })
                    }
                    placeholder="פועלים / לאומי / דיסקונט..."
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    מספר סניף
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.branch}
                    onChange={(e) =>
                      setSettings({ ...settings, branch: e.target.value })
                    }
                    placeholder="600"
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    מספר חשבון
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.acct}
                    onChange={(e) =>
                      setSettings({ ...settings, acct: e.target.value })
                    }
                    placeholder="123456"
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    מחיר לשעה ברירת מחדל (₪)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={settings.rate || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, rate: num(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    תעריף לק״מ ברירת מחדל (₪)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={settings.kmRate || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, kmRate: num(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    כתובת מוצא למפות ברירת מחדל
                  </label>
                  <input
                    type="text"
                    value={settings.origin}
                    onChange={(e) =>
                      setSettings({ ...settings, origin: e.target.value })
                    }
                    placeholder="רחוב, עיר (למשל: יפו, ירושלים)"
                    className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Backup & Restore Buttons */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-[#ded8cb]/40 dark:border-[#323946]/40">
                <button
                  type="button"
                  onClick={exportSettings}
                  className="px-3 py-1.5 rounded-xl border border-[#ded8cb] dark:border-[#323946] text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>גיבוי הגדרות (JSON)</span>
                </button>

                <label className="px-3 py-1.5 rounded-xl border border-[#ded8cb] dark:border-[#323946] text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>שחזור הגדרות מקובץ</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={importSettings}
                    accept=".json"
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible: Customizable Labels & Texts */}
        <div className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className="w-full p-4 flex items-center justify-between text-right font-bold text-sm text-[#1c2230] dark:text-[#ecebe6] hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1d4e7a] dark:text-[#6aa7da]" />
              <span>כותרות וטקסטים בדרישה (עריכת תבנית)</span>
            </div>
            {showLabels ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {showLabels && (
            <div className="p-4 pt-1 border-t border-[#ded8cb]/60 dark:border-[#323946]/60 space-y-3 animate-in fade-in">
              <p className="text-xs text-neutral-500">
                כל מה שמודפס בדרישה ניתן לשינוי ולהתאמה אישית.
              </p>

              <div className="space-y-2.5">
                {LSPEC.map(([key, title]) => {
                  const isLong = ['intro', 'pay', 'receipt'].includes(key);
                  const currentVal = activeLabels[key] || '';
                  return (
                    <div key={key}>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">
                        {title}
                      </label>
                      {isLong ? (
                        <textarea
                          rows={2}
                          value={currentVal}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              labels: {
                                ...settings.labels,
                                [key]: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              labels: {
                                ...settings.labels,
                                [key]: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'האם לאפס את כל הכותרות והטקסטים לברירת המחדל?'
                    )
                  ) {
                    setSettings({ ...settings, labels: {} });
                  }
                }}
                className="w-full py-2 rounded-xl border border-rose-300 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition mt-2"
              >
                אפס את כל הטקסטים לברירת מחדל
              </button>
            </div>
          )}
        </div>

        {/* Collapsible: Highlighting & Table Columns */}
        <div className="bg-[#fffdf9] dark:bg-[#1d222b] border border-[#ded8cb] dark:border-[#323946] rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHighlights(!showHighlights)}
            className="w-full p-4 flex items-center justify-between text-right font-bold text-sm text-[#1c2230] dark:text-[#ecebe6] hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1d4e7a] dark:text-[#6aa7da]" />
              <span>סימון והדגשה ועמודת תעריף ק״מ</span>
            </div>
            {showHighlights ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {showHighlights && (
            <div className="p-4 pt-1 border-t border-[#ded8cb]/60 dark:border-[#323946]/60 space-y-3 animate-in fade-in">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-[#1c2230] dark:text-[#ecebe6]">
                <input
                  type="checkbox"
                  checked={settings.showKmRate !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, showKmRate: e.target.checked })
                  }
                  className="w-5 h-5 rounded-md accent-[#1d4e7a]"
                />
                <span>הצג בטבלה עמודה ייעודית של ״תעריף לק״מ״</span>
              </label>

              <div className="space-y-2 pt-2">
                {HSPEC.map(([key, title]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">
                      {title}
                    </label>
                    <select
                      value={activeHighlights[key] || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hl: { ...settings.hl, [key]: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[#ded8cb] dark:border-[#323946] bg-[#f4f1ea] dark:bg-[#14171d] px-3 py-2 text-sm"
                    >
                      {HIGHLIGHT_OPTIONS.map((opt) => (
                        <option key={opt.val} value={opt.val}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettings({ ...settings, hl: { total: 'y' } });
                }}
                className="w-full py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition mt-2"
              >
                אפס סימונים לברירת מחדל
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Quick Bar for Mobile */}
      <aside
        id="bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#fffdf9]/95 dark:bg-[#1d222b]/95 backdrop-blur-md border-t border-[#ded8cb] dark:border-[#323946] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between"
      >
        <div className="flex flex-col text-right">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">
            סה״כ כללי לתשלום
          </span>
          <span className="text-lg font-black text-[#1d4e7a] dark:text-[#6aa7da] tabular-nums">
            {fmt(calculatedData._g)} ₪
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 mr-2">
              ({fmt(calculatedData._q)} ש׳)
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleMakePdf}
          disabled={generating}
          className="px-5 py-2.5 rounded-xl bg-[#1d4e7a] hover:bg-[#173f63] text-white font-bold text-sm shadow-md active:scale-95 transition flex items-center gap-2 disabled:opacity-60"
        >
          <Share2 className="w-4 h-4" />
          <span>הפק ושתף</span>
        </button>
      </aside>
    </div>
  );
}
