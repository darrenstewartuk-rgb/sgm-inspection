'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  screen: 'home',
  inspection: null,      // current inspection object
  sectionIdx: null,
  questionIdx: null,
  customAssignees: [],
  installPrompt: null,
};

let saveTimer = null;

// ── Data model helpers ─────────────────────────────────────────────────────────
function createInspection() {
  const now = new Date();
  const insp = {
    id: Date.now(),
    title: '',
    conductedOn: now.toISOString(),
    preparedBy: '',
    location: AUDIT_CONFIG.defaultLocation,
    units: [],
    status: 'in-progress',
    sections: AUDIT_CONFIG.sections.map(sec => ({
      id: sec.id,
      questions: sec.questions.map(q => ({
        text: q,
        status: null,     // pass | action | fail | na | null
        notes: '',
        photos: [],       // dataURLs
        actions: []
      }))
    })),
    generalComment: { text: '', rating: null }
  };
  return insp;
}

function createAction() {
  return {
    id: Date.now() + Math.random(),
    description: '',
    assignees: [],
    priority: 'Medium',
    dueDate: '',
  };
}

// ── Scoring ────────────────────────────────────────────────────────────────────
function calcSectionScore(sectionData) {
  let pass = 0, scored = 0, flagged = 0, actions = 0;
  for (const q of sectionData.questions) {
    if (q.status === null || q.status === 'na') continue;
    scored++;
    if (q.status === 'pass') pass++;
    if (q.status === 'action' || q.status === 'fail') flagged++;
    actions += q.actions.length;
  }
  const total = sectionData.questions.length;
  const answered = sectionData.questions.filter(q => q.status !== null).length;
  return { pass, scored, flagged, actions, total, answered, pct: scored ? Math.round(pass / scored * 100) : null };
}

function calcOverallScore(insp) {
  let pass = 0, scored = 0, flagged = 0, actions = 0;
  for (const sec of insp.sections) {
    const s = calcSectionScore(sec);
    pass += s.pass; scored += s.scored; flagged += s.flagged; actions += s.actions;
  }
  const pct = scored ? Math.round(pass / scored * 100) : null;
  return { pass, scored, flagged, actions, pct };
}

function getScoreClass(pct) {
  if (pct === null) return 'score-none';
  if (pct >= 90) return 'score-good';
  if (pct >= 70) return 'score-mid';
  return 'score-low';
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigate(screen, opts = {}) {
  Object.assign(state, opts, { screen });
  render();
  window.scrollTo(0, 0);
}

// ── Auto-save ──────────────────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (state.inspection) {
      await DB.save(state.inspection);
    }
  }, 600);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function getAllAssignees() {
  return [...AUDIT_CONFIG.defaultAssignees, ...state.customAssignees];
}

function statusLabel(s) {
  return { pass: 'Pass', action: 'Action Required', fail: 'Fail', na: 'N/A' }[s] || '—';
}

function getStatusBadge(s) {
  const map = { pass: 'pill-green', action: 'pill-amber', fail: 'pill-red', na: 'pill-grey' };
  const cls = map[s] || 'pill-outline';
  return `<span class="pill ${cls}">${statusLabel(s)}</span>`;
}

// ── Main render dispatcher ─────────────────────────────────────────────────────
function render() {
  switch (state.screen) {
    case 'home': renderHome(); break;
    case 'setup': renderSetup(); break;
    case 'audit': renderAudit(); break;
    case 'section': renderSection(); break;
    case 'question': renderQuestion(); break;
    case 'general-comment': renderGeneralComment(); break;
    case 'report': renderReport(); break;
  }
}

// ── Home screen ────────────────────────────────────────────────────────────────
async function renderHome() {
  setHeader('SGM Factory Inspection', null, null);
  const inspections = await DB.list();

  let rows = '';
  for (const insp of inspections) {
    const sc = calcOverallScore(insp);
    const scorePct = sc.pct !== null ? sc.pct + '%' : 'In progress';
    const cls = getScoreClass(sc.pct);
    const unitsStr = insp.units.length ? insp.units.join(', ') : 'No units selected';
    rows += `
      <div class="inspection-row" data-id="${insp.id}">
        <div class="inspection-row-info">
          <div class="inspection-row-title">${esc(insp.title || 'Untitled inspection')}</div>
          <div class="inspection-row-meta">${esc(unitsStr)} &bull; ${fmt(insp.conductedOn)}</div>
        </div>
        <span class="inspection-row-score ${cls}">${scorePct}</span>
        <button class="inspection-row-delete" data-del="${insp.id}" title="Delete" onclick="event.stopPropagation()">&#x2715;</button>
      </div>`;
  }

  const installBanner = state.installPrompt ? `
    <div class="install-banner" id="install-banner">
      <span style="flex:1">Install SGM Inspect on your device for offline access</span>
      <button id="install-btn">Install</button>
    </div>` : '';

  el('app-content').innerHTML = `
    <div class="home-hero">
      <h2>Factory Inspection v${AUDIT_CONFIG.appVersion}</h2>
      <p>${AUDIT_CONFIG.company}</p>
    </div>
    ${installBanner}
    <button class="btn btn-primary home-new-btn" id="new-btn">+ New Inspection</button>
    ${inspections.length ? `<div class="inspection-list-header">Past Inspections</div><div class="card" style="margin:0 12px">${rows}</div>` :
      `<div class="empty-state"><div class="icon">&#x1F4CB;</div><p>No inspections yet.<br>Tap New Inspection to begin.</p></div>`}
    <div style="height:20px"></div>`;

  el('new-btn').addEventListener('click', () => {
    state.inspection = createInspection();
    navigate('setup');
  });

  if (state.installPrompt) {
    el('install-btn').addEventListener('click', () => {
      state.installPrompt.prompt();
      state.installPrompt.userChoice.then(() => { state.installPrompt = null; renderHome(); });
    });
  }

  document.querySelectorAll('.inspection-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = parseInt(row.dataset.id);
      state.inspection = await DB.load(id);
      navigate('audit');
    });
  });

  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this inspection? This cannot be undone.')) return;
      await DB.remove(parseInt(btn.dataset.del));
      renderHome();
    });
  });
}

// ── Setup screen ───────────────────────────────────────────────────────────────
function renderSetup() {
  const insp = state.inspection;
  setHeader('Inspection Details', () => navigate('home'), insp.status !== 'template' ? 'Save' : null);

  const unitChips = AUDIT_CONFIG.units.map(u => `
    <div class="unit-chip${insp.units.includes(u) ? ' selected' : ''}" data-unit="${esc(u)}">${esc(u)}</div>`).join('');

  el('app-content').innerHTML = `
    <div class="form-section">
      <div class="field">
        <label>Audit Title</label>
        <input id="f-title" type="text" value="${esc(insp.title)}" placeholder="e.g. Unit 6 monthly inspection">
      </div>
      <div class="field">
        <label>Conducted On</label>
        <input id="f-date" type="datetime-local" value="${insp.conductedOn ? insp.conductedOn.slice(0,16) : ''}">
      </div>
      <div class="field">
        <label>Prepared By</label>
        <input id="f-by" type="text" value="${esc(insp.preparedBy)}" placeholder="Inspector name">
      </div>
      <div class="field">
        <label>Location</label>
        <div class="gps-row">
          <div class="field" style="margin:0;flex:1">
            <textarea id="f-loc" rows="2">${esc(insp.location)}</textarea>
          </div>
          <button class="btn btn-ghost btn-sm gps-btn" id="gps-btn" title="Get GPS">&#x1F4CD; GPS</button>
        </div>
      </div>
      <div class="field">
        <label>Units Inspected</label>
        <div class="unit-grid" id="unit-grid">${unitChips}</div>
      </div>
    </div>
    <div class="bottom-bar">
      <button class="btn btn-primary" id="start-btn">Start / Continue Inspection &rarr;</button>
    </div>`;

  document.querySelectorAll('.unit-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const u = chip.dataset.unit;
      if (insp.units.includes(u)) insp.units = insp.units.filter(x => x !== u);
      else insp.units.push(u);
      chip.classList.toggle('selected', insp.units.includes(u));
    });
  });

  el('gps-btn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('GPS not available'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      el('f-loc').value = loc;
      toast('Location captured');
    }, () => toast('Could not get location'));
  });

  el('start-btn').addEventListener('click', async () => {
    insp.title = el('f-title').value.trim();
    insp.conductedOn = el('f-date').value ? new Date(el('f-date').value).toISOString() : insp.conductedOn;
    insp.preparedBy = el('f-by').value.trim();
    insp.location = el('f-loc').value.trim();
    await DB.save(insp);
    navigate('audit');
  });
}

// ── Audit overview ─────────────────────────────────────────────────────────────
function renderAudit() {
  const insp = state.inspection;
  const overall = calcOverallScore(insp);
  setHeader(insp.title || 'Inspection', () => navigate('home'),
    null, `<button class="header-btn" id="edit-header-btn" style="font-size:18px">&#x2699;</button>`);

  const pctTxt = overall.pct !== null ? overall.pct + '%' : '—';
  const scoreTxt = `${overall.pass}/${overall.scored} questions passed`;

  let sectionRows = '';
  AUDIT_CONFIG.sections.forEach((sec, si) => {
    const sd = insp.sections[si];
    const sc = calcSectionScore(sd);
    const done = sd.questions.every(q => q.status !== null);
    const completePill = done
      ? `<span class="pill pill-green">Complete</span>`
      : `<span class="pill pill-outline">${sc.answered}/${sc.total}</span>`;
    const scorePill = sc.pct !== null
      ? `<span class="pill ${sc.pct === 100 ? 'pill-green' : sc.pct >= 70 ? 'pill-amber' : 'pill-red'}">${sc.pct}%</span>`
      : '';
    const flagPill = sc.flagged ? `<span class="pill pill-amber">${sc.flagged} flagged</span>` : '';
    sectionRows += `
      <div class="section-card" data-si="${si}">
        <div class="section-num">${si + 1}</div>
        <div class="section-info">
          <div class="section-name">${esc(sec.name)}</div>
          <div class="section-meta">${sc.total} questions</div>
        </div>
        <div class="section-right">
          ${completePill}
          ${scorePill}
          ${flagPill}
        </div>
        <span style="color:var(--text-muted);font-size:18px">&#x276F;</span>
      </div>`;
  });

  const gcData = insp.generalComment;
  const gcDone = gcData.rating !== null;
  sectionRows += `
    <div class="section-card" id="gc-card">
      <div class="section-num">${AUDIT_CONFIG.sections.length + 1}</div>
      <div class="section-info">
        <div class="section-name">General Comment</div>
        <div class="section-meta">Overall rating &amp; notes</div>
      </div>
      <div class="section-right">
        ${gcDone ? `<span class="pill pill-green">Complete</span>` : `<span class="pill pill-outline">Pending</span>`}
        ${gcData.rating ? `<span class="pill pill-grey">${esc(gcData.rating)}</span>` : ''}
      </div>
      <span style="color:var(--text-muted);font-size:18px">&#x276F;</span>
    </div>`;

  el('app-content').innerHTML = `
    <div class="audit-score-banner">
      <div>
        <div class="audit-score-big">${pctTxt}</div>
        <div class="audit-score-label">${scoreTxt}</div>
        <div class="audit-score-details">${overall.flagged} flagged &bull; ${overall.actions} actions</div>
      </div>
      <div class="audit-score-pill">
        ${overall.pass}<small>passed</small>
      </div>
    </div>
    <div class="card" style="margin:12px">${sectionRows}</div>
    <div class="bottom-bar">
      <button class="btn btn-secondary" id="report-btn" style="flex:1">View Report</button>
      <button class="btn btn-ghost" id="photos-btn" style="flex:1">Save Photos</button>
      <button class="btn btn-primary" id="pdf-btn" style="flex:1">Generate PDF</button>
    </div>`;

  document.querySelectorAll('.section-card[data-si]').forEach(card => {
    card.addEventListener('click', () => navigate('section', { sectionIdx: parseInt(card.dataset.si) }));
  });

  el('gc-card').addEventListener('click', () => navigate('general-comment'));
  el('report-btn').addEventListener('click', () => navigate('report'));
  el('photos-btn').addEventListener('click', () => saveAllPhotos(insp));
  setupPdfButton('pdf-btn', insp);

  const editBtn = document.getElementById('edit-header-btn');
  if (editBtn) editBtn.addEventListener('click', () => navigate('setup'));
}

// ── PDF generation (two-step: build async, save on fresh tap) ────────────────
function setupPdfButton(btnId, insp) {
  const btn = el(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => _preparePdf(btn, insp), { once: true });
}

async function _preparePdf(btn, insp) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library failed to load. Reload the page and try again.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Building…';
  toast('Building PDF…');

  let doc, filename;
  try {
    const inspData = await _precompressPhotos(insp);
    ({ doc, filename } = _buildPDF(inspData));
  } catch (err) {
    console.error('[PDF] build error:', err);
    btn.disabled = false;
    btn.textContent = 'Generate PDF';
    alert('PDF error: ' + err.message);
    return;
  }

  const blob = doc.output('blob');
  btn.disabled = false;
  btn.textContent = 'Save PDF ↓';
  toast('Ready — tap Save PDF');
  btn.onclick = () => _savePdf(blob, filename, doc);
}

function _savePdf(blob, filename, doc) {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: filename })
        .then(() => toast('PDF shared'))
        .catch(err => { if (err.name !== 'AbortError') _pdfFallback(doc, filename); });
      return;
    }
  }
  _pdfFallback(doc, filename);
}

function _pdfFallback(doc, filename) {
  const url = doc.output('bloburl');
  const w = window.open(url, '_blank');
  if (w) {
    toast('PDF opened — use your browser to save');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    doc.save(filename);
    toast('PDF saved — check Downloads');
  }
}

// ── Photo export ──────────────────────────────────────────────────────────────
function saveAllPhotos(insp) {
  const photos = [];
  insp.sections.forEach((sec, si) => {
    sec.questions.forEach((q, qi) => {
      q.photos.forEach((p, pi) => {
        photos.push({ dataUrl: p, name: `SGM_Photo_S${si + 1}_Q${qi + 1}_${pi + 1}.jpg` });
      });
    });
  });
  if (!photos.length) { toast('No photos in this inspection'); return; }
  photos.forEach((ph, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = ph.dataUrl;
      a.download = ph.name;
      a.click();
    }, i * 300);
  });
  toast(`Saving ${photos.length} photo${photos.length > 1 ? 's' : ''}…`);
}

// ── Section screen ─────────────────────────────────────────────────────────────
function renderSection() {
  const si = state.sectionIdx;
  const sec = AUDIT_CONFIG.sections[si];
  const sectionData = state.inspection.sections[si];

  setHeader(sec.name, () => navigate('audit'));

  let rows = '';
  sectionData.questions.forEach((q, qi) => {
    const dotClass = { pass: 'dot-pass', action: 'dot-action', fail: 'dot-fail', na: 'dot-na' }[q.status] || 'dot-none';
    const badge = q.status ? getStatusBadge(q.status) : '';
    const photoCount = q.photos.length;
    const actionCount = q.actions.length;
    const extras = [
      photoCount ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : '',
      actionCount ? `${actionCount} action${actionCount > 1 ? 's' : ''}` : ''
    ].filter(Boolean).join(', ');
    rows += `
      <div class="question-row" data-qi="${qi}">
        <div class="q-status-dot ${dotClass}"></div>
        <div class="q-text" style="flex:1">
          ${esc(q.text)}
          ${extras ? `<div class="text-muted" style="margin-top:2px">${extras}</div>` : ''}
        </div>
        ${badge}
        <span class="q-arrow">&#x276F;</span>
      </div>`;
  });

  el('app-content').innerHTML = `
    <div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">${esc(sec.regulation)}</div>
    <div class="card" style="margin:0 12px">${rows}</div>`;

  document.querySelectorAll('.question-row').forEach(row => {
    row.addEventListener('click', () => navigate('question', {
      sectionIdx: si,
      questionIdx: parseInt(row.dataset.qi)
    }));
  });
}

// ── Question screen ────────────────────────────────────────────────────────────
function renderQuestion() {
  const si = state.sectionIdx;
  const qi = state.questionIdx;
  const sec = AUDIT_CONFIG.sections[si];
  const sectionData = state.inspection.sections[si];
  const q = sectionData.questions[qi];
  const totalQ = sectionData.questions.length;

  setHeader(`${sec.name}`, () => navigate('section', { sectionIdx: si }));

  const statuses = [
    { key: 'pass', label: 'Pass', icon: '&#x2714;' },
    { key: 'action', label: 'Action Required', icon: '&#x26A0;' },
    { key: 'fail', label: 'Fail', icon: '&#x2716;' },
    { key: 'na', label: 'N/A', icon: '&#x2014;' }
  ];

  const statusBtns = statuses.map(s => `
    <button class="status-btn ${s.key}${q.status === s.key ? ' selected' : ''}" data-status="${s.key}">
      <span class="status-icon">${s.icon}</span>
      ${s.label}
    </button>`).join('');

  const photoGrid = buildPhotoGrid(q.photos, si, qi);
  const actionsHtml = buildActionsHtml(q.actions, si, qi, q.status);

  el('app-content').innerHTML = `
    <div class="question-header-card">
      <div class="q-num">Q${qi + 1} of ${totalQ} &bull; ${esc(sec.name)}</div>
      <div class="q-title">${esc(q.text)}</div>
    </div>

    <div class="status-grid">${statusBtns}</div>

    <div class="spacer"></div>
    <div class="field-section">
      <div class="field-section-title">Notes</div>
      <div class="field-section-body">
        <textarea id="q-notes" rows="3" placeholder="Optional observation or comment...">${esc(q.notes)}</textarea>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="field-section">
      <div class="field-section-title">Photos</div>
      <div class="field-section-body">
        ${photoGrid}
        <input type="file" id="photo-input" accept="image/*" capture="environment" multiple style="display:none">
      </div>
    </div>

    <div class="spacer"></div>
    <div id="actions-area">${actionsHtml}</div>

    <div class="nav-prev-next">
      <button id="prev-btn" ${qi === 0 ? 'disabled' : ''}>&#x2190; Prev</button>
      <button id="next-btn" ${qi === totalQ - 1 ? 'disabled' : ''}>Next &#x2192;</button>
    </div>
    <div style="height:16px"></div>`;

  // Status button handlers
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newStatus = btn.dataset.status;
      q.status = (q.status === newStatus) ? null : newStatus;
      scheduleSave();
      renderQuestion();
    });
  });

  // Notes
  el('q-notes').addEventListener('input', e => {
    q.notes = e.target.value;
    scheduleSave();
  });

  // Photos
  document.querySelectorAll('.photo-add-btn').forEach(pb => {
    pb.addEventListener('click', () => el('photo-input').click());
  });
  el('photo-input').addEventListener('change', e => handlePhotoInput(e, q, si, qi));

  document.querySelectorAll('[data-del-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      q.photos.splice(parseInt(btn.dataset.delPhoto), 1);
      scheduleSave();
      renderQuestion();
    });
  });

  // Actions
  bindActionHandlers(q, si, qi);

  // Nav
  el('prev-btn').addEventListener('click', () => navigate('question', { sectionIdx: si, questionIdx: qi - 1 }));
  el('next-btn').addEventListener('click', () => navigate('question', { sectionIdx: si, questionIdx: qi + 1 }));
}

function buildPhotoGrid(photos, si, qi) {
  const thumbs = photos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p}" alt="Photo ${i + 1}">
      <button class="del-btn" data-del-photo="${i}">&#x2715;</button>
      <a class="dl-btn" href="${p}" download="SGM_Photo_Q${qi + 1}_${i + 1}.jpg" title="Save photo">&#x2193;</a>
    </div>`).join('');
  const addBtn = `<button class="photo-add-btn"><span class="icon">&#x1F4F7;</span>Add</button>`;
  return `<div class="photo-grid">${thumbs}${addBtn}</div>`;
}

function handlePhotoInput(e, q, si, qi) {
  const files = Array.from(e.target.files);
  let pending = files.length;
  if (!pending) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      q.photos.push(ev.target.result);
      pending--;
      if (pending === 0) { scheduleSave(); renderQuestion(); }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function buildActionsHtml(actions, si, qi, currentStatus) {
  const showActions = currentStatus === 'action' || currentStatus === 'fail';
  if (!showActions) return '';

  const allAssignees = getAllAssignees();
  let html = `<div class="field-section" style="margin:0 12px">
    <div class="field-section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Actions</span>
      <button class="btn btn-sm" id="add-action-btn" style="background:var(--action);color:#fff;padding:4px 10px;min-height:28px">+ Add Action</button>
    </div>
    <div class="field-section-body" id="actions-list">`;

  actions.forEach((action, ai) => {
    const assigneeChips = allAssignees.map(name => `
      <div class="assignee-chip${action.assignees.includes(name) ? ' selected' : ''}" data-ai="${ai}" data-name="${esc(name)}">${esc(name)}</div>`).join('');

    const priorities = ['Low', 'Medium', 'High'];
    const priorityBtns = priorities.map(p => `
      <button class="priority-btn${action.priority === p ? ` selected ${p.toLowerCase()}` : ''}" data-ai="${ai}" data-priority="${p}">${p}</button>`).join('');

    html += `
      <div class="action-block" data-ai="${ai}">
        <div class="action-block-header">
          <span>Action ${ai + 1}</span>
          <button class="btn btn-sm btn-danger" data-del-action="${ai}" style="padding:2px 8px;min-height:24px;font-size:12px">Remove</button>
        </div>
        <div class="action-block-body">
          <div class="action-field">
            <label>Description</label>
            <textarea data-ai="${ai}" data-field="description" rows="2" placeholder="What needs to be done...">${esc(action.description)}</textarea>
          </div>
          <div class="action-field">
            <label>Assignees</label>
            <div class="assignee-grid">${assigneeChips}
              <div class="assignee-chip" id="add-assignee-${ai}" style="border-style:dashed">+ Add</div>
            </div>
          </div>
          <div class="action-field">
            <label>Priority</label>
            <div class="priority-row">${priorityBtns}</div>
          </div>
          <div class="action-field">
            <label>Due Date</label>
            <input type="date" data-ai="${ai}" data-field="dueDate" value="${esc(action.dueDate)}">
          </div>
        </div>
      </div>`;
  });

  html += `</div></div>`;
  return html;
}

function bindActionHandlers(q, si, qi) {
  const addBtn = el('add-action-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      q.actions.push(createAction());
      scheduleSave();
      renderQuestion();
    });
  }

  document.querySelectorAll('[data-del-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      q.actions.splice(parseInt(btn.dataset.delAction), 1);
      scheduleSave();
      renderQuestion();
    });
  });

  document.querySelectorAll('[data-ai][data-field]').forEach(input => {
    input.addEventListener('input', e => {
      const ai = parseInt(e.target.dataset.ai);
      const field = e.target.dataset.field;
      q.actions[ai][field] = e.target.value;
      scheduleSave();
    });
    input.addEventListener('change', e => {
      const ai = parseInt(e.target.dataset.ai);
      const field = e.target.dataset.field;
      q.actions[ai][field] = e.target.value;
      scheduleSave();
    });
  });

  document.querySelectorAll('.assignee-chip[data-ai]').forEach(chip => {
    chip.addEventListener('click', () => {
      const ai = parseInt(chip.dataset.ai);
      const name = chip.dataset.name;
      const action = q.actions[ai];
      if (action.assignees.includes(name)) {
        action.assignees = action.assignees.filter(x => x !== name);
      } else {
        action.assignees.push(name);
      }
      chip.classList.toggle('selected', action.assignees.includes(name));
      scheduleSave();
    });
  });

  document.querySelectorAll('[id^="add-assignee-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = prompt('Enter assignee name:');
      if (!name || !name.trim()) return;
      const trimmed = name.trim();
      if (!state.customAssignees.includes(trimmed) && !AUDIT_CONFIG.defaultAssignees.includes(trimmed)) {
        state.customAssignees.push(trimmed);
      }
      const ai = parseInt(btn.id.replace('add-assignee-', ''));
      if (!q.actions[ai].assignees.includes(trimmed)) q.actions[ai].assignees.push(trimmed);
      scheduleSave();
      renderQuestion();
    });
  });

  document.querySelectorAll('.priority-btn[data-priority]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ai = parseInt(btn.dataset.ai);
      q.actions[ai].priority = btn.dataset.priority;
      scheduleSave();
      renderQuestion();
    });
  });
}

// ── General Comment screen ─────────────────────────────────────────────────────
function renderGeneralComment() {
  const gc = state.inspection.generalComment;
  setHeader('General Comment', () => navigate('audit'));

  const ratings = ['Good', 'Satisfactory', 'Poor'];
  const ratingBtns = ratings.map(r => `
    <button class="rating-btn${gc.rating === r ? ` selected ${r.toLowerCase()}` : ''}" data-rating="${r}">${r}</button>`).join('');

  el('app-content').innerHTML = `
    <div class="form-section">
      <div class="field">
        <label>Overall Rating</label>
        <div class="rating-row">${ratingBtns}</div>
      </div>
      <div class="field">
        <label>Comment</label>
        <textarea id="gc-text" rows="5" placeholder="General observations, positives, areas for improvement...">${esc(gc.text)}</textarea>
      </div>
    </div>
    <div class="bottom-bar">
      <button class="btn btn-primary" id="gc-save">Save &amp; Return to Overview</button>
    </div>`;

  document.querySelectorAll('[data-rating]').forEach(btn => {
    btn.addEventListener('click', () => {
      gc.rating = btn.dataset.rating;
      scheduleSave();
      document.querySelectorAll('[data-rating]').forEach(b => {
        b.className = `rating-btn${gc.rating === b.dataset.rating ? ` selected ${b.dataset.rating.toLowerCase()}` : ''}`;
      });
    });
  });

  el('gc-text').addEventListener('input', e => { gc.text = e.target.value; scheduleSave(); });

  el('gc-save').addEventListener('click', async () => {
    gc.text = el('gc-text').value;
    await DB.save(state.inspection);
    navigate('audit');
    toast('Saved');
  });
}

// ── Report screen ──────────────────────────────────────────────────────────────
function renderReport() {
  const insp = state.inspection;
  const overall = calcOverallScore(insp);
  setHeader('Report Preview', () => navigate('audit'));

  const pct = overall.pct !== null ? overall.pct + '%' : '—';

  let sectionScores = '';
  AUDIT_CONFIG.sections.forEach((sec, si) => {
    const sc = calcSectionScore(insp.sections[si]);
    const p = sc.pct !== null ? sc.pct : 0;
    const barColor = p === 100 ? 'var(--pass)' : p >= 70 ? 'var(--action)' : 'var(--fail)';
    sectionScores += `
      <div class="section-score-row">
        <span class="section-score-name">${esc(sec.name)}</span>
        <div class="section-score-bar-wrap"><div class="section-score-bar" style="width:${p}%;background:${barColor}"></div></div>
        <span class="section-score-pct">${sc.pct !== null ? sc.pct + '%' : '—'}</span>
      </div>`;
  });

  el('app-content').innerHTML = `
    <div class="report-score-card">
      <div class="report-score-pct">${pct}</div>
      <div class="report-score-sub">${overall.pass} of ${overall.scored} questions passed</div>
      <div class="report-stats">
        <div class="report-stat">
          <div class="report-stat-val">${overall.flagged}</div>
          <div class="report-stat-lbl">Flagged</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-val">${overall.actions}</div>
          <div class="report-stat-lbl">Actions</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-val">${insp.units.length || '—'}</div>
          <div class="report-stat-lbl">Units</div>
        </div>
      </div>
    </div>

    <div class="section-label">Score by Section</div>
    <div class="card" style="margin:0 12px">${sectionScores}</div>

    <div class="section-label">Inspection Details</div>
    <div class="card" style="margin:0 12px;padding:14px;font-size:14px;display:flex;flex-direction:column;gap:8px">
      <div><strong>Title:</strong> ${esc(insp.title || '—')}</div>
      <div><strong>Date:</strong> ${fmt(insp.conductedOn)}</div>
      <div><strong>Prepared by:</strong> ${esc(insp.preparedBy || '—')}</div>
      <div><strong>Location:</strong> ${esc(insp.location || '—')}</div>
      <div><strong>Units:</strong> ${esc(insp.units.join(', ') || '—')}</div>
    </div>

    <div class="bottom-bar">
      <button class="btn btn-secondary" style="flex:1" id="back-btn">&#x2190; Back</button>
      <button class="btn btn-primary" style="flex:1" id="pdf-btn2">Generate PDF</button>
    </div>`;

  el('back-btn').addEventListener('click', () => navigate('audit'));
  setupPdfButton('pdf-btn2', insp);
}

// ── Header helper ─────────────────────────────────────────────────────────────
function setHeader(title, backFn, rightLabel, extraHtml) {
  const hdr = el('app-header');
  hdr.innerHTML = `
    <span class="logo-badge">SGM</span>
    ${backFn ? `<button class="header-btn icon-only" id="back-hdr">&#x2190;</button>` : ''}
    <h1>${esc(title)}</h1>
    ${rightLabel ? `<button class="header-btn" id="right-hdr">${esc(rightLabel)}</button>` : ''}
    ${extraHtml || ''}`;
  if (backFn) el('back-hdr').addEventListener('click', backFn);
}

// ── PWA install prompt ────────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt = e;
  if (state.screen === 'home') renderHome();
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await DB.init();
  navigate('home');
});
