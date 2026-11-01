import { jsPDF } from 'jspdf';
import { FONT_R, FONT_B } from './pdfFonts';
import { InvoiceHeader, InvoiceRow, InvoiceSettings } from './types';

export interface PdfData {
  R: InvoiceHeader;
  S: InvoiceSettings;
  rows: InvoiceRow[];
  L: Record<string, string>;
  H: Record<string, string>;
  mp: Record<string, string>;
  showKmRate: boolean;
}

export function generatePdfDocument(data: PdfData): jsPDF {
  const { R, S, rows, L, H, mp, showKmRate: KR } = data;
  const YEL = [255, 235, 59] as [number, number, number];
  const tpl = (s: string, m: Record<string, string>) =>
    String(s).replace(/\{(\w+)\}/g, (x, k) => (m[k] !== undefined ? m[k] : x));

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  // Add embedded Hebrew Heebo Regular & Bold fonts
  doc.addFileToVFS('H-r.ttf', FONT_R);
  doc.addFont('H-r.ttf', 'H', 'normal');
  doc.addFileToVFS('H-b.ttf', FONT_B);
  doc.addFont('H-b.ttf', 'H', 'bold');

  const RT = 200;
  const PGB = 282;
  const MIR: Record<string, string> = { '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[' };

  // Visual text ordering for RTL Hebrew in PDF
  function vis(s: string | number): string {
    const str = String(s ?? '');
    const ch = [...str];
    const hasH = ch.some((c) => {
      const k = c.charCodeAt(0);
      return k >= 1424 && k <= 1535;
    });
    const t = ch.map((c) =>
      /[A-Za-z0-9]/.test(c)
        ? 'L'
        : c.charCodeAt(0) >= 1424 && c.charCodeAt(0) <= 1535
        ? 'R'
        : 'N'
    );
    for (let i = 1; i < ch.length - 1; i++) {
      if (t[i] === 'N' && t[i - 1] === 'L' && t[i + 1] === 'L' && '/.:,-% '.includes(ch[i])) {
        t[i] = 'L';
      }
    }
    for (let i = 0; i < ch.length; i++) {
      if (t[i] === 'N') t[i] = 'R';
    }
    const runs: { t: string; s: string[] }[] = [];
    ch.forEach((c, i) => {
      const l = runs[runs.length - 1];
      if (l && l.t === t[i]) l.s.push(c);
      else runs.push({ t: t[i], s: [c] });
    });
    return runs
      .reverse()
      .map((r) =>
        r.t === 'R'
          ? r.s
              .reverse()
              .map((c) => MIR[c] || c)
              .join('')
          : hasH
          ? r.s.reverse().join('')
          : r.s.join('')
      )
      .join('');
  }

  const font = (b: boolean, sz: number) => {
    doc.setFont('H', b ? 'bold' : 'normal');
    doc.setFontSize(sz);
  };

  const tw = (s: string | number, b: boolean, sz: number) => {
    font(b, sz);
    return doc.getTextWidth(vis(s));
  };

  function wrap(s: string | number, maxw: number, b: boolean, sz: number): string[] {
    const words = String(s ?? '').split(' ');
    const out: string[] = [];
    let cur = '';
    words.forEach((w) => {
      const n = cur ? cur + ' ' + w : w;
      if (cur && tw(n, b, sz) > maxw) {
        out.push(cur);
        cur = w;
      } else {
        cur = n;
      }
    });
    if (cur) out.push(cur);
    return out;
  }

  const txt = (s: string | number, x: number, y: number, al: 'center' | 'right' | 'left', b: boolean, sz: number) => {
    font(b, sz);
    doc.text(vis(s), x, y, { align: al });
  };

  const fmt = (n: number) =>
    (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const fdate = (d: string) => (d ? d.split('-').reverse().join('/') : '');
  const fdate2 = (d: string) =>
    d ? d.split('-').reverse().map((x, i) => (i === 2 ? x.slice(2) : x)).join('/') : '';

  let y = 20;

  // Title
  txt(L.title, 105, y, 'center', true, 22);
  const tww = tw(L.title, true, 22);
  doc.setLineWidth(0.5);
  doc.line(105 - tww / 2, y + 1.8, 105 + tww / 2, y + 1.8);
  y += 13;

  const para = (s: string, b = false, sz = 11, gap = 6.2, hk = '') => {
    const st = H[hk] || '';
    const bb = b || st.includes('b');
    wrap(s, 190, bb, sz).forEach((l) => {
      if (y > PGB) {
        doc.addPage();
        y = 15;
      }
      const w = tw(l, bb, sz);
      if (st.includes('y')) {
        doc.setFillColor(...YEL);
        doc.rect(RT - w - 1.5, y - 4.3, w + 3, 6, 'F');
      }
      txt(l, RT, y, 'right', bb, sz);
      if (st.includes('u')) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.35);
        doc.line(RT - w, y + 1.1, RT, y + 1.1);
      }
      y += gap;
    });
  };

  para(L.date + ': ' + fdate2(R.date), false);
  para(L.lecturer + ': ' + S.name, false);
  para(L.idl + ' ' + S.id, false);
  y += 2;
  para(L.to + ': ' + R.client, true, 11, 6.2, 'to');
  y += 1;
  para(L.subject, true, 11, 6.2, 'subject');
  y += 1;
  para(tpl(L.intro, mp), false);
  y += 2;

  // Table setup
  const cols: [string, number][] = KR
    ? [
        [L.c_date, 19],
        [L.c_place, 26],
        [L.c_from, 14],
        [L.c_to, 14],
        [L.c_qty, 14],
        [L.c_amt, 16],
        [L.c_km, 15],
        [L.c_totkm, 16],
        [L.c_trav, 20],
        [L.c_rate, 20],
        [L.c_kmrate, 16],
      ]
    : [
        [L.c_date, 20],
        [L.c_place, 34],
        [L.c_from, 14],
        [L.c_to, 14],
        [L.c_qty, 14],
        [L.c_amt, 16],
        [L.c_km, 16],
        [L.c_totkm, 16],
        [L.c_trav, 22],
        [L.c_rate, 24],
      ];

  const NC = cols.length;
  const xr: number[] = [];
  let acc = RT;
  cols.forEach((c) => {
    xr.push(acc);
    acc -= c[1];
  });
  const FS = 9;
  const LH = 4.2;
  const PADV = 2.4;

  function cell(
    i: number,
    span: number,
    lines: string[],
    b: boolean,
    al: 'right' | 'center',
    top: number,
    h: number,
    fill?: [number, number, number],
    ul = false
  ) {
    const wid = cols.slice(i, i + span).reduce((a, c) => a + c[1], 0);
    const right = xr[i];
    const left = right - wid;
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(left, top, wid, h, 'F');
    }
    doc.setDrawColor(40);
    doc.setLineWidth(0.2);
    doc.rect(left, top, wid, h);
    const th = lines.length * LH;
    let yy = top + (h - th) / 2 + LH * 0.78;
    lines.forEach((l) => {
      const w = tw(l, b, FS);
      if (al === 'right') {
        txt(l, right - 1.5, yy, 'right', b, FS);
        if (ul) {
          doc.setDrawColor(0);
          doc.setLineWidth(0.3);
          doc.line(right - 1.5 - w, yy + 0.9, right - 1.5, yy + 0.9);
        }
      } else {
        txt(l, left + wid / 2, yy, 'center', b, FS);
        if (ul) {
          doc.setDrawColor(0);
          doc.setLineWidth(0.3);
          doc.line(left + wid / 2 - w / 2, yy + 0.9, left + wid / 2 + w / 2, yy + 0.9);
        }
      }
      yy += LH;
    });
  }

  function rowLines(vals: string[]) {
    return vals.map((v, i) => wrap(v, cols[i][1] - 2, false, FS));
  }

  function header() {
    const Llines = cols.map((c) => wrap(c[0], c[1] - 2, true, FS));
    const h = Math.max(...Llines.map((l) => l.length)) * LH + PADV;
    if (y + h > PGB) {
      doc.addPage();
      y = 15;
    }
    Llines.forEach((l, i) => cell(i, 1, l, true, 'center', y, h, [233, 237, 242]));
    y += h;
  }

  header();

  const validRows = rows.filter((r) => (r._q ?? 0) > 0);
  validRows.forEach((r) => {
    const place = (r.origin ? r.origin + ' - ' : '') + r.place;
    const v =
      r.t === 'n'
        ? [
            fdate(r.date),
            place,
            r.from,
            r.to,
            fmt(r._q ?? 0),
            fmt(r._a ?? 0),
            fmt(+r.km || 0),
            fmt(r._k ?? 0),
            fmt(r._t ?? 0),
            fmt(+R.rate || 0),
          ].concat(KR ? [fmt(+R.kmRate || 0)] : [])
        : [
            fdate(r.date),
            place,
            '-',
            '-',
            fmt(r._q ?? 0),
            fmt(r._a ?? 0),
            '-',
            '-',
            '-',
            fmt(+R.rate || 0),
          ].concat(KR ? ['-'] : []);

    const Llines = rowLines(v);
    const h = Math.max(...Llines.map((l) => l.length)) * LH + PADV;
    if (y + h > PGB) {
      doc.addPage();
      y = 15;
      header();
    }
    Llines.forEach((l, i) => cell(i, 1, l, false, 'center', y, h));
    y += h;
  });

  function srow(parts: [number, number, string, ('right' | 'center')?][], key: string) {
    const st = H[key] || '';
    const h = LH + PADV + 0.6;
    if (y + h > PGB) {
      doc.addPage();
      y = 15;
    }
    parts.forEach((p) =>
      cell(
        p[0],
        p[1],
        p[2] === '' ? [] : [p[2]],
        true,
        p[3] || 'center',
        y,
        h,
        st.includes('y') ? YEL : [244, 244, 244],
        st.includes('u')
      )
    );
    y += h;
  }

  srow(
    [
      [0, 7, L.s_trav, 'right'],
      [7, 1, fmt(R._k ?? 0)],
      [8, 1, fmt(R._t ?? 0)],
      [9, NC - 9, ''],
    ],
    'trav'
  );

  srow(
    [
      [0, 4, L.s_hours, 'right'],
      [4, 1, fmt(R._q ?? 0)],
      [5, 1, fmt(R._a ?? 0)],
      [6, NC - 6, ''],
    ],
    'hours'
  );

  if (R.park) {
    srow(
      [
        [0, 5, R.parkLabel || 'חניה', 'right'],
        [5, 1, fmt(R._p ?? 0)],
        [6, NC - 6, ''],
      ],
      'park'
    );
  }

  srow(
    [
      [0, 5, L.s_total, 'right'],
      [5, NC - 5, fmt(R._g ?? 0)],
    ],
    'total'
  );

  y += 7;
  para(tpl(L.pay, mp), false, 11, 6.2, 'pay');
  para(L.receipt, false);
  y += 5;
  para(L.closing, false);
  para(S.name, true);

  return doc;
}
