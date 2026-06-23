/* ══════════════════════════════════════════
   CONTROLE DE JOB — Design System
   Palette: Cinematic Dark
   Typography: Space Grotesk + JetBrains Mono
══════════════════════════════════════════ */

:root {
  --bg: #0f0f14;
  --bg2: #17171f;
  --bg3: #1e1e28;
  --border: #2a2a38;
  --border2: #33334a;
  --text: #e8e8f0;
  --text2: #9090b0;
  --text3: #5a5a78;

  --accent: #7c6af7;
  --accent-light: #9d8fff;
  --accent-dim: rgba(124,106,247,0.15);

  --green: #2ecc71;
  --green-dim: rgba(46,204,113,0.15);
  --yellow: #f39c12;
  --yellow-dim: rgba(243,156,18,0.15);
  --blue: #3498db;
  --blue-dim: rgba(52,152,219,0.15);
  --purple: #9b59b6;
  --purple-dim: rgba(155,89,182,0.15);
  --red: #e74c3c;
  --red-dim: rgba(231,76,60,0.15);

  --radius: 10px;
  --radius-sm: 6px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
  --sidebar-w: 240px;
  --topbar-h: 56px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: 'Space Grotesk', sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-light); }

/* ── SCREENS ── */
.screen { display: none; }
.screen.active { display: block; }
#appScreen.active { display: grid; }

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
#authScreen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 20% 50%, #1a1240 0%, var(--bg) 60%);
  padding: 24px;
}

.auth-wrap {
  width: 100%;
  max-width: 400px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: var(--shadow);
}

.auth-logo {
  text-align: center;
  margin-bottom: 28px;
}
.logo-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.auth-logo h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}
.auth-logo p {
  color: var(--text2);
  font-size: 13px;
  margin-top: 4px;
}

.auth-tabs {
  display: flex;
  background: var(--bg3);
  border-radius: var(--radius-sm);
  padding: 4px;
  gap: 4px;
  margin-bottom: 24px;
}
.tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  transition: all .2s;
}
.tab-btn.active {
  background: var(--accent);
  color: #fff;
}

.auth-form { display: none; }
.auth-form.active { display: block; }

.forgot { text-align: right; margin-top: -8px; margin-bottom: 12px; }
.forgot a { font-size: 12px; color: var(--text2); }

.auth-msg {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  display: none;
}
.auth-msg.error { background: var(--red-dim); color: var(--red); display: block; }
.auth-msg.success { background: var(--green-dim); color: var(--green); display: block; }

/* ══════════════════════════════════════════
   APP LAYOUT
══════════════════════════════════════════ */
#appScreen {
  display: grid;
  grid-template-rows: var(--topbar-h) 1fr;
  grid-template-columns: var(--sidebar-w) 1fr;
  height: 100vh;
  overflow: hidden;
}

/* TOPBAR */
.topbar {
  grid-column: 1 / -1;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-title { font-size: 16px; font-weight: 600; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.user-name { font-size: 13px; color: var(--text2); }

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.menu-btn:hover { background: var(--bg3); }

/* SIDEBAR */
.sidebar {
  background: var(--bg2);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transition: transform .3s;
}
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 150;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--border);
}
.sidebar-logo { font-size: 26px; }
.sidebar-user-name { font-weight: 600; font-size: 14px; }
.sidebar-user-role { font-size: 12px; color: var(--text2); }

.nav-menu {
  list-style: none;
  padding: 12px 8px;
  flex: 1;
}
.nav-link {
  display: block;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text2);
  font-weight: 500;
  font-size: 14px;
  transition: all .15s;
  text-decoration: none;
}
.nav-link:hover, .nav-link.active {
  background: var(--accent-dim);
  color: var(--accent-light);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}
.btn-mei-link {
  display: block;
  text-align: center;
  padding: 10px;
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--text2);
  font-size: 13px;
  font-weight: 500;
  transition: all .15s;
}
.btn-mei-link:hover { background: var(--bg3); color: var(--text); }

/* MAIN CONTENT */
.main-content {
  overflow-y: auto;
  padding: 24px;
  background: var(--bg);
}

.page { display: none; }
.page.active { display: block; }

/* ══════════════════════════════════════════
   COMMON COMPONENTS
══════════════════════════════════════════ */

/* Fields */
.field { margin-bottom: 16px; }
.field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-bottom: 6px;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color .15s;
  appearance: none;
  -webkit-appearance: none;
}
.field select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239090b0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.field input[type="file"] {
  padding: 8px;
  cursor: pointer;
}
.field textarea { resize: vertical; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.form-grid .field-full { grid-column: 1 / -1; }

/* Buttons */
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 11px 20px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  display: inline-block;
  width: 100%;
  text-align: center;
}
.btn-primary:hover { background: var(--accent-light); transform: translateY(-1px); }
.btn-primary.btn-sm { width: auto; padding: 8px 16px; font-size: 13px; }
.btn-primary.btn-danger { background: var(--red); }
.btn-primary.btn-danger:hover { background: #c0392b; }

.btn-outline {
  background: transparent;
  color: var(--text2);
  border: 1px solid var(--border2);
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  display: inline-block;
  text-align: center;
  text-decoration: none;
}
.btn-outline:hover { border-color: var(--text2); color: var(--text); }
.btn-outline.btn-sm { padding: 7px 14px; font-size: 13px; }
.btn-outline.btn-danger { border-color: var(--red); color: var(--red); }
.btn-outline.btn-danger:hover { background: var(--red-dim); }

.btn-icon {
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  font-size: 18px;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: all .15s;
}
.btn-icon:hover { background: var(--bg3); color: var(--text); }

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 12px;
  flex-wrap: wrap;
}
.page-header h2 {
  font-size: 22px;
  font-weight: 700;
}

/* Month nav */
.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.month-nav button {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all .15s;
}
.month-nav button:hover { border-color: var(--accent); color: var(--accent); }
#currentMonthLabel {
  font-size: 15px;
  font-weight: 600;
  min-width: 140px;
  text-align: center;
  text-transform: capitalize;
}

/* Section Card */
.section-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.section-header h3,
.section-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}
.section-header h3 { margin-bottom: 0; }

/* ── DASHBOARD CARDS ── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  border-left: 3px solid var(--border);
}
.card-green { border-left-color: var(--green); background: linear-gradient(135deg, var(--bg2) 60%, var(--green-dim)); }
.card-yellow { border-left-color: var(--yellow); background: linear-gradient(135deg, var(--bg2) 60%, var(--yellow-dim)); }
.card-blue { border-left-color: var(--blue); background: linear-gradient(135deg, var(--bg2) 60%, var(--blue-dim)); }
.card-purple { border-left-color: var(--purple); background: linear-gradient(135deg, var(--bg2) 60%, var(--purple-dim)); }
.card-cyan { border-left-color: #22d3ee; background: linear-gradient(135deg, var(--bg2) 60%, rgba(34,211,238,0.15)); }
.card-neutral { border-left-color: var(--accent); background: linear-gradient(135deg, var(--bg2) 60%, var(--accent-dim)); }
.card-label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.card-value { font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text); }

/* ── MEI ALERT (top) ── */
.mei-alert {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-weight: 500;
  border-left: 4px solid;
}
.mei-alert.warn70 { background: var(--yellow-dim); border-color: var(--yellow); color: var(--yellow); }
.mei-alert.warn85 { background: rgba(255,150,0,0.12); border-color: #ff9600; color: #ff9600; }
.mei-alert.warn95 { background: var(--red-dim); border-color: var(--red); color: var(--red); }
.hidden { display: none !important; }

/* ── TABLES ── */
.table-wrap { overflow-x: auto; }
.jobs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.jobs-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text2);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.jobs-table td {
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.jobs-table tbody tr:hover { background: var(--bg3); cursor: pointer; }
.jobs-table tbody tr:last-child td { border-bottom: none; }

.job-name { font-weight: 600; color: var(--text); }
.job-client { color: var(--text2); font-size: 12px; margin-top: 2px; }
.job-value { font-family: 'JetBrains Mono', monospace; font-weight: 500; }
.job-date { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text2); white-space: nowrap; }

/* Status badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-pendente { background: var(--yellow-dim); color: var(--yellow); }
.badge-pago { background: var(--green-dim); color: var(--green); }
.badge-pago_nf { background: var(--blue-dim); color: var(--blue); }
.badge-pago_nf_pdf { background: var(--purple-dim); color: var(--purple); }

/* Row actions */
.row-actions { display: flex; gap: 6px; opacity: 0; transition: opacity .15s; }
.jobs-table tbody tr:hover .row-actions { opacity: 1; }
.row-btn {
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text2);
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.row-btn:hover { border-color: var(--accent); color: var(--accent); }
.row-btn.delete:hover { border-color: var(--red); color: var(--red); }

/* NF icon in table */
.nf-icon { font-size: 16px; }

/* ── FILTERS ── */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}
.filters-bar select {
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 32px 8px 12px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239090b0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.filters-bar select:focus { border-color: var(--accent); }

.export-bar {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

/* ── EMPTY STATE ── */
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--text2);
}
.empty-state span { font-size: 48px; display: block; margin-bottom: 12px; opacity: .5; }
.empty-state p { font-size: 14px; line-height: 1.6; }

/* ── NF GRID ── */
.nf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.nf-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
}
.nf-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.nf-number { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--accent); }
.nf-job-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.nf-client { color: var(--text2); font-size: 12px; margin-bottom: 10px; }
.nf-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text2); }
.nf-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.nf-actions a, .nf-actions button {
  flex: 1;
  text-align: center;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.nf-actions .btn-nf-link {
  background: var(--blue-dim);
  color: var(--blue);
  border: 1px solid transparent;
  text-decoration: none;
  display: block;
}
.nf-actions .btn-nf-pdf {
  background: var(--purple-dim);
  color: var(--purple);
  border: 1px solid transparent;
}

/* ── REPORTS ── */
.reports-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.reports-grid .section-card h3 { margin-bottom: 12px; }

.top-clients-list { display: flex; flex-direction: column; gap: 10px; }
.top-client-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.top-client-bar-wrap { flex: 1; height: 6px; background: var(--bg3); border-radius: 3px; }
.top-client-bar { height: 6px; border-radius: 3px; background: var(--accent); transition: width .5s; }
.top-client-name { font-size: 13px; font-weight: 500; min-width: 100px; }
.top-client-value { font-size: 13px; font-family: 'JetBrains Mono', monospace; color: var(--text2); min-width: 90px; text-align: right; }

/* ── MEI PAGE ── */
.mei-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
}
.mei-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}
.mei-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); margin-bottom: 6px; }
.mei-value { font-size: 26px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.mei-disponivel { color: var(--green); }
.mei-nf { color: var(--blue); font-size: 22px; }

.progress-wrap { margin-bottom: 24px; }
.progress-bar {
  height: 14px;
  background: var(--bg3);
  border-radius: 7px;
  position: relative;
  overflow: visible;
  margin: 24px 0 8px;
}
.progress-fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--green), var(--yellow), var(--red));
  transition: width .8s ease;
  max-width: 100%;
}
.progress-marker {
  position: absolute;
  top: -20px;
  transform: translateX(-50%);
}
.progress-marker span {
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
}
.progress-marker::after {
  content: '';
  display: block;
  width: 1px;
  height: 14px;
  background: var(--border2);
  margin: 4px auto 0;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text3);
  font-family: 'JetBrains Mono', monospace;
}

.mei-alert-box {
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  margin-bottom: 24px;
  font-weight: 500;
  font-size: 14px;
  border-left: 4px solid;
}

.mei-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.mei-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); margin-bottom: 6px; font-weight: 600; }
.mei-stat-value { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

/* ── MODALS ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.modal-sm { max-width: 380px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 { font-size: 17px; font-weight: 700; }
.modal-close {
  background: none;
  border: none;
  color: var(--text2);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all .15s;
}
.modal-close:hover { background: var(--bg3); color: var(--text); }
.modal-body { padding: 20px 24px; }
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
}
.modal-footer .btn-outline { flex: 1; }
.modal-footer .btn-primary { flex: 2; }

.nf-job-info {
  background: var(--bg3);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text2);
}
.nf-job-info strong { color: var(--text); }

.file-current { font-size: 12px; color: var(--accent); margin-top: 6px; }

/* ── TOAST ── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 12px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: var(--shadow);
  animation: slideIn .2s ease;
}
.toast.success { border-color: var(--green); color: var(--green); }
.toast.error { border-color: var(--red); color: var(--red); }

@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ── LOADING ── */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,15,20,0.8);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media (max-width: 900px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
  .reports-grid { grid-template-columns: 1fr; }
  .mei-stats { grid-template-columns: repeat(2, 1fr); }
  .mei-header { grid-template-columns: repeat(2, 1fr); }
  .nf-mei-summary { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 700px) {
  #appScreen {
    grid-template-columns: 1fr;
  }

  .menu-btn { display: block; }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--sidebar-w);
    z-index: 200;
    transform: translateX(-100%);
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay.active { display: block; }

  .main-content { padding: 16px; }

  .cards-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card-value { font-size: 18px; }

  .mei-header { grid-template-columns: 1fr; gap: 12px; }
  .mei-stats { grid-template-columns: repeat(2, 1fr); }

  .form-grid { grid-template-columns: 1fr; }
  .form-grid .field-full { grid-column: 1; }

  .modal { max-height: 95vh; }

  .jobs-table th:nth-child(5),
  .jobs-table td:nth-child(5) { display: none; }
}

@media (max-width: 480px) {
  .cards-grid { grid-template-columns: 1fr 1fr; }
  .auth-wrap { padding: 28px 20px; }
  .page-header h2 { font-size: 18px; }
  .card-value { font-size: 16px; }
}

/* Chart.js dark theme override */
canvas { max-width: 100%; }

/* ══════════════════════════════════════════
   CLIENTS
══════════════════════════════════════════ */
.client-name { font-weight: 600; }
.client-name.inativo { opacity: .45; text-decoration: line-through; }
.client-sub { font-size: 11px; color: var(--text2); margin-top: 2px; }
.client-cnpj { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text2); }
.client-city { font-size: 13px; color: var(--text2); }
.badge-ativo { background: var(--green-dim); color: var(--green); }
.badge-inativo { background: var(--border); color: var(--text3); }

.client-modal-section {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text3);
  margin: 18px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.client-modal-section:first-child { margin-top: 0; }

/* ══════════════════════════════════════════
   DEMO BANNER SPACE
══════════════════════════════════════════ */
body.has-demo-banner .main-content { padding-bottom: 60px; }

/* ══════════════════════════════════════════
   ADMIN PANEL — Filter Pills
══════════════════════════════════════════ */
.admin-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.admin-pill {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text2);
  padding: 8px 14px;
  border-radius: 20px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.admin-pill:hover {
  border-color: var(--accent);
  color: var(--text);
}
.admin-pill.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-light);
}
.admin-pill-count {
  background: rgba(255,255,255,0.1);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}
.admin-pill.active .admin-pill-count {
  background: var(--accent);
  color: #fff;
}

/* ══════════════════════════════════════════
   PDF DROPZONE (Upload de NF)
══════════════════════════════════════════ */
.pdf-dropzone {
  border: 2px dashed var(--border2);
  border-radius: var(--radius);
  background: var(--bg3);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all .15s;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pdf-dropzone:hover { border-color: var(--accent); background: var(--accent-dim); }
.pdf-dropzone.drag-active { border-color: var(--accent); background: var(--accent-dim); }

.pdf-dropzone-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text2);
  font-size: 13px;
}
.pdf-dropzone-icon { font-size: 28px; margin-bottom: 4px; }
.pdf-dropzone-sub { font-size: 11px; color: var(--text3); }

.pdf-dropzone-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: default;
}
.pdf-file-icon { font-size: 20px; }
.pdf-file-name {
  flex: 1;
  text-align: left;
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pdf-file-remove {
  background: var(--red-dim);
  border: none;
  color: var(--red);
  width: 24px; height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
}
.pdf-file-remove:hover { background: var(--red); color: #fff; }

.pdf-upload-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pdf-upload-bar {
  height: 8px;
  background: var(--bg2);
  border-radius: 4px;
  overflow: hidden;
}
.pdf-upload-fill {
  height: 100%;
  width: 0%;
  background: var(--accent);
  transition: width .2s;
}
.pdf-upload-progress span {
  font-size: 12px;
  color: var(--text2);
}

/* ══════════════════════════════════════════
   NF x MEI REPORT
══════════════════════════════════════════ */
.nf-mei-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.nf-mei-stat { text-align: left; }
.nf-mei-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text2);
  margin-bottom: 6px;
}
.nf-mei-value {
  font-size: 22px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}
.nf-mei-total { color: var(--text); }
.nf-without-alert {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--yellow-dim);
  border-left: 4px solid var(--yellow);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--yellow);
}

@media (max-width: 700px) {
  .nf-mei-summary { grid-template-columns: 1fr; gap: 12px; }
}

/* ══════════════════════════════════════════
   DASHBOARD HEADER ACTIONS
══════════════════════════════════════════ */
.dashboard-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.clickable-row { cursor: pointer; }

@media (max-width: 700px) {
  .dashboard-header-actions { width: 100%; justify-content: space-between; }
}

/* ══════════════════════════════════════════
   NF BUTTONS — Visualizar vs Inserir/Editar
══════════════════════════════════════════ */
.nf-view-btn {
  background: var(--blue-dim);
  border-color: var(--blue);
  color: var(--blue);
}
.nf-view-btn:hover {
  background: var(--blue);
  color: #fff;
}

.nf-edit-btn {
  background: var(--purple-dim);
  border-color: var(--purple);
  color: var(--purple);
}
.nf-edit-btn:hover {
  background: var(--purple);
  color: #fff;
}

.nf-icon { text-align: center; }

/* NF View Modal — delete row */
.nf-delete-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.btn-nf-delete {
  width: 100%;
  background: var(--red-dim);
  border: 1px solid var(--red);
  color: var(--red);
  padding: 10px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.btn-nf-delete:hover {
  background: var(--red);
  color: #fff;
}

/* ══════════════════════════════════════════
   DASHBOARD VIEW TOGGLE & STATUS FILTER
══════════════════════════════════════════ */
.dash-view-toggle {
  display: flex;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px;
  gap: 2px;
}
.dash-view-btn {
  background: transparent;
  border: none;
  color: var(--text2);
  padding: 6px 14px;
  border-radius: 5px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.dash-view-btn.active {
  background: var(--accent);
  color: #fff;
}

.dash-status-select {
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 32px 8px 12px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239090b0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.dash-status-select:focus { border-color: var(--accent); }

@media (max-width: 700px) {
  .dash-view-toggle { order: -1; }
  .dash-status-select { flex: 1; min-width: 140px; }
}

/* ══════════════════════════════════════════
   REPORTS HEADER ACTIONS
══════════════════════════════════════════ */
.reports-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 700px) {
  .reports-header-actions { width: 100%; }
  .reports-header-actions select { flex: 1; min-width: 140px; }
}

/* ══════════════════════════════════════════
   CLIENTS PAGE — Header, Mobile Fix, Import
══════════════════════════════════════════ */
.clients-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Fix iPhone table overflow */
.clients-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.clients-table {
  min-width: 480px;
  width: 100%;
}

@media (max-width: 600px) {
  .clients-header-actions { width: 100%; justify-content: flex-end; }
  .hide-mobile { display: none; }
  .clients-table { min-width: unset; }
}

/* Import modal */
.import-preview {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 13px;
}
.import-preview-item { color: var(--text); padding: 3px 0; }
.import-preview-more { color: var(--text2); font-style: italic; padding-top: 4px; }

.import-options { display: flex; flex-direction: column; gap: 10px; }
.import-option-btn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--bg3);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: all .15s;
  font-family: inherit;
  color: var(--text);
  width: 100%;
}
.import-option-btn:hover { border-color: var(--accent); background: var(--accent-dim); }
.import-option-replace:hover { border-color: var(--red); background: var(--red-dim); }
.import-option-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
.import-option-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.import-option-desc { font-size: 12px; color: var(--text2); line-height: 1.5; }
