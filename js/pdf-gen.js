'use strict';

function _compressImage(dataUrl, maxW, maxH, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function _precompressPhotos(insp) {
  const copy = JSON.parse(JSON.stringify(insp));
  for (const section of copy.sections) {
    for (const q of section.questions) {
      if (q.photos && q.photos.length) {
        q.photos = await Promise.all(q.photos.map(p => _compressImage(p, 1200, 1200, 0.75)));
      }
    }
  }
  return copy;
}


function _imgFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/png'))  return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function _buildPDF(insp) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const ML = 14, MR = 14, MT = 14;
  const CW = W - ML - MR;

  const SGM_GREEN  = [46, 125, 50];
  const PASS_COL   = [46, 125, 50];
  const ACTION_COL = [230, 81, 0];
  const FAIL_COL   = [198, 40, 40];
  const NA_COL     = [97, 97, 97];

  let pageNum = 0;
  let y = MT;

  const overall = calcOverallScore(insp);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function newPage() {
    if (pageNum > 0) doc.addPage();
    pageNum++;
    y = MT;
  }

  function checkY(needed) {
    if (y + (needed || 15) > H - 22) newPage();
  }

  function setFont(style, size, color) {
    doc.setFont('helvetica', style || 'normal');
    doc.setFontSize(size || 10);
    doc.setTextColor(...(color || [30, 30, 30]));
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Page 1 header band ────────────────────────────────────────────────────
  function pdfHeader() {
    doc.setFillColor(...SGM_GREEN);
    doc.rect(0, 0, W, 22, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(ML, 5, 22, 12, 2, 2, 'F');
    setFont('bold', 11, SGM_GREEN);
    doc.text('SGM', ML + 11, 12.5, { align: 'center' });

    setFont('bold', 14, [255, 255, 255]);
    doc.text('Factory Inspection v' + AUDIT_CONFIG.appVersion, ML + 26, 10);
    setFont('normal', 9, [200, 230, 200]);
    doc.text(AUDIT_CONFIG.company, ML + 26, 16);

    y = 28;
  }

  // ── Metadata table ────────────────────────────────────────────────────────
  function drawMetaTable() {
    const rows = [
      ['Audit Title',     insp.title || '—'],
      ['Conducted On',    fmtDate(insp.conductedOn)],
      ['Prepared By',     insp.preparedBy || '—'],
      ['Location',        insp.location || '—'],
      ['Units Inspected', (insp.units || []).join(', ') || '—'],
    ];
    const rh = 8;
    rows.forEach((row, i) => {
      doc.setFillColor(...(i % 2 === 0 ? [248, 252, 248] : [255, 255, 255]));
      doc.rect(ML, y, CW, rh, 'F');
      doc.setDrawColor(220, 230, 220);
      doc.rect(ML, y, CW, rh, 'S');
      setFont('bold', 9, [60, 100, 60]);
      doc.text(row[0], ML + 2, y + 5.5);
      setFont('normal', 9, [30, 30, 30]);
      doc.text(doc.splitTextToSize(String(row[1]), CW - 50)[0] || '—', ML + 48, y + 5.5);
      y += rh;
    });
    y += 4;
  }

  // ── Score banner ──────────────────────────────────────────────────────────
  function drawScoreBanner() {
    const pct = overall.pct !== null ? overall.pct + '%' : '—';
    doc.setFillColor(...SGM_GREEN);
    doc.roundedRect(ML, y, CW, 26, 3, 3, 'F');

    setFont('bold', 26, [255, 255, 255]);
    doc.text(pct, ML + 8, y + 18);
    setFont('normal', 10, [200, 230, 200]);
    doc.text(overall.pass + ' of ' + overall.scored + ' questions passed', ML + 44, y + 11);
    doc.text(overall.flagged + ' flagged  |  ' + overall.actions + ' actions raised', ML + 44, y + 17);

    const gcRating = insp.generalComment && insp.generalComment.rating;
    if (gcRating) {
      setFont('bold', 11, [255, 255, 255]);
      doc.text('Overall: ' + gcRating, ML + 44, y + 23);
    }
    y += 30;
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  function drawStatusBadge(status, bx, by) {
    const map = {
      pass:   { col: PASS_COL,   bg: [232, 245, 233], label: 'PASS' },
      action: { col: ACTION_COL, bg: [255, 243, 224], label: 'ACTION' },
      fail:   { col: FAIL_COL,   bg: [255, 235, 238], label: 'FAIL' },
      na:     { col: NA_COL,     bg: [245, 245, 245], label: 'N/A' },
    };
    const b = map[status];
    if (!b) return;
    const bw = 22, bh = 6;
    doc.setFillColor(...b.bg);
    doc.roundedRect(bx, by, bw, bh, 1.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...b.col);
    doc.text(b.label, bx + bw / 2, by + 4.3, { align: 'center' });
  }

  // ── Actions summary page ──────────────────────────────────────────────────
  function drawActionsSummary() {
    const hasAny = insp.sections.some(s => s.questions.some(q => q.actions.length > 0));
    if (!hasAny) return;

    checkY(16);
    doc.setFillColor(...SGM_GREEN);
    doc.rect(ML, y, CW, 9, 'F');
    setFont('bold', 11, [255, 255, 255]);
    doc.text('Actions Summary', ML + 3, y + 6.2);
    y += 13;

    let actionNum = 0;
    AUDIT_CONFIG.sections.forEach((sec, si) => {
      const sd = insp.sections[si];
      const acts = sd.questions.flatMap(q => q.actions.map(a => ({ ...a, qText: q.text })));
      if (!acts.length) return;

      checkY(10);
      setFont('bold', 9, [...SGM_GREEN]);
      doc.text(sec.name, ML + 2, y);
      y += 6;

      acts.forEach(act => {
        actionNum++;
        checkY(16);
        doc.setFillColor(255, 243, 224);
        doc.roundedRect(ML, y, CW, 13, 1.5, 1.5, 'F');
        doc.setDrawColor(...ACTION_COL);
        doc.roundedRect(ML, y, CW, 13, 1.5, 1.5, 'S');

        const priCol = act.priority === 'High' ? FAIL_COL : act.priority === 'Medium' ? ACTION_COL : PASS_COL;
        doc.setFillColor(...priCol);
        doc.roundedRect(ML + 1, y + 2, 1.5, 9, 0.5, 0.5, 'F');

        setFont('bold', 8.5, [...ACTION_COL]);
        doc.text('#' + actionNum, ML + 4, y + 6);
        setFont('normal', 8, [40, 20, 0]);
        const descLines = doc.splitTextToSize(act.description || '(no description)', CW - 55);
        doc.text(descLines[0], ML + 14, y + 6);
        setFont('bold', 7.5, [100, 60, 0]);
        doc.text(
          'Assignee: ' + (act.assignees.join(', ') || '—') +
          '  |  Priority: ' + (act.priority || '—') +
          '  |  Due: ' + (act.dueDate || '—'),
          ML + 14, y + 11
        );
        y += 15;
      });
      y += 3;
    });
    y += 4;
  }

  // ── Full audit body ───────────────────────────────────────────────────────
  function drawFullAudit() {
    AUDIT_CONFIG.sections.forEach((sec, si) => {
      const sd = insp.sections[si];
      const sc = calcSectionScore(sd);
      checkY(22);

      // Section header bar
      doc.setFillColor(...SGM_GREEN);
      doc.rect(ML, y, CW, 9, 'F');
      setFont('bold', 10, [255, 255, 255]);
      doc.text((si + 1) + '. ' + sec.name, ML + 3, y + 6.2);
      y += 11;

      setFont('italic', 8, [100, 130, 100]);
      doc.text(sec.regulation, ML + 2, y);
      y += 5;

      setFont('bold', 9, [...SGM_GREEN]);
      doc.text(
        'Score: ' + (sc.pct !== null ? sc.pct + '%' : '—') +
        '   Flagged: ' + sc.flagged +
        '   Actions: ' + sc.actions,
        ML + 2, y
      );
      y += 7;

      sd.questions.forEach((q, qi) => {
        const hasNotes   = !!(q.notes && q.notes.trim());
        const hasPhotos  = q.photos.length > 0;
        const hasActions = q.actions.length > 0;
        const noteLines  = hasNotes ? doc.splitTextToSize(q.notes, CW - 32) : [];
        const qLines     = doc.splitTextToSize(q.text, CW - 42);

        // Estimate text block height (no photos — drawn separately below)
        const baseH    = Math.max(8, qLines.length * 5);
        const notesH   = noteLines.length * 4.5;
        const actionsH = hasActions ? q.actions.length * 14 : 0;
        const totalH   = baseH + notesH + actionsH + 4;

        checkY(totalH);

        // Row background
        doc.setFillColor(...(qi % 2 === 0 ? [252, 255, 252] : [255, 255, 255]));
        doc.rect(ML, y, CW, totalH, 'F');
        doc.setDrawColor(220, 230, 220);
        doc.rect(ML, y, CW, totalH, 'S');

        // Q number
        setFont('bold', 8, [...SGM_GREEN]);
        doc.text('Q' + (qi + 1), ML + 2, y + 5.5);

        // Question text
        setFont('normal', 9, [30, 30, 30]);
        doc.text(qLines, ML + 11, y + 5.5, { lineHeightFactor: 1.4 });

        // Status badge (right-aligned)
        if (q.status) drawStatusBadge(q.status, ML + CW - 24, y + 1.5);

        let iy = y + baseH;

        // Notes
        if (hasNotes) {
          setFont('italic', 8, [80, 80, 80]);
          noteLines.forEach(line => { doc.text(line, ML + 14, iy); iy += 4.5; });
        }

        // Inline action summaries
        if (hasActions) {
          q.actions.forEach((act, ai) => {
            doc.setFillColor(255, 243, 224);
            doc.roundedRect(ML + 12, iy, CW - 14, 12, 1, 1, 'F');
            setFont('bold', 8, [...ACTION_COL]);
            doc.text('Action ' + (ai + 1) + ':', ML + 14, iy + 5.5);
            setFont('normal', 8, [60, 30, 0]);
            const adesc = doc.splitTextToSize(act.description || '(no description)', CW - 62);
            doc.text(adesc[0], ML + 34, iy + 5.5);
            setFont('bold', 7.5, [80, 40, 0]);
            doc.text(
              (act.assignees.join(', ') || '—') +
              '  |  ' + (act.priority || '—') +
              '  |  Due: ' + (act.dueDate || '—'),
              ML + 14, iy + 10
            );
            iy += 14;
          });
        }

        y = iy + 3;

        // Photos inline — drawn directly below the question block
        if (hasPhotos) {
          const imgW = (CW - 4) / 2;
          const imgH = 56;
          let col = 0;
          q.photos.forEach(ph => {
            if (col === 0) checkY(imgH + 8);
            const px = ML + col * (imgW + 4);
            try {
              doc.addImage(ph, _imgFormat(ph), px, y, imgW, imgH, undefined, 'MEDIUM');
            } catch (e) {
              doc.setFillColor(220, 220, 220);
              doc.rect(px, y, imgW, imgH, 'F');
              setFont('normal', 8, [140, 140, 140]);
              doc.text('[Image unavailable]', px + imgW / 2, y + imgH / 2, { align: 'center' });
            }
            doc.setDrawColor(200, 215, 200);
            doc.rect(px, y, imgW, imgH, 'S');
            col++;
            if (col >= 2) { col = 0; y += imgH + 4; }
          });
          if (col === 1) y += imgH + 4;
          y += 4;
        }
      });

      y += 6;
    });
  }

  // ── Page numbers + compliance footer ─────────────────────────────────────
  function addPageNumbers() {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      setFont('normal', 7.5, [140, 140, 140]);
      doc.text(p + ' / ' + total, W - MR, H - 7, { align: 'right' });
      doc.text(AUDIT_CONFIG.complianceFooter, ML, H - 7, { maxWidth: CW - 22 });
    }
  }

  // ── Assemble ──────────────────────────────────────────────────────────────
  newPage();
  pdfHeader();
  drawMetaTable();
  drawScoreBanner();
  drawActionsSummary();
  drawFullAudit();
  addPageNumbers();

  // ── Output ────────────────────────────────────────────────────────────────
  const safeTitle = (insp.title || 'Inspection').replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
  const dateStr   = insp.conductedOn ? insp.conductedOn.slice(0, 10) : 'undated';
  const filename  = 'SGM_Inspection_' + safeTitle + '_' + dateStr + '.pdf';

  return { doc, filename };
}
