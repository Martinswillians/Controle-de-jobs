// ═══════════════════════════════════════════════
// app.js — Controle de Job
// ═══════════════════════════════════════════════

import { auth, db } from "./firebase-config.js";
import { uploadPDF } from "./cloudinary.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  subscribeClients, unsubscribeClients, initClientsEvents,
  updateClientSelects, openClientModal, allClients, getClientData
} from "./clients.js";

import {
  checkAccess, showAccessBlocked, hideAccessBlocked,
  showDemoBanner, initAdminPanel, initAdminActions, ADMIN_UID
} from "./access.js";

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let currentUser = null;
let currentUserName = "";
let allJobs = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let editingJobId = null;
let deletingJobId = null;
let nfTargetJobId = null;
let charts = {};
let unsubscribeJobs = null;

const MEI_LIMIT = 81000;
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

// Registra um listener com segurança: se o elemento não existir na página (ex: divergência
// entre versões de index.html/app.js em cache), avisa no console em vez de derrubar todo o
// script — um único elemento faltando não pode mais quebrar o app inteiro.
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[Controle de Job] Elemento #${id} não encontrado — evento "${event}" não registrado. Tente recarregar a página (Ctrl+Shift+R).`);
    return;
  }
  el.addEventListener(event, handler);
}
const fmt = v => `R$ ${Number(v).toLocaleString("pt-BR", {minimumFractionDigits:2})}`;
const fmtDate = d => d ? d.split("-").reverse().join("/") : "-";
const today = () => new Date().toISOString().split("T")[0];

// Retorna as datas de um job (suporta jobs antigos com apenas "date" único)
function jobDatesArray(j) {
  if (Array.isArray(j.dates) && j.dates.length) return [...j.dates].filter(Boolean).sort();
  return j.date ? [j.date] : [];
}
// Exibição em HTML (tabelas/telas) — inclui uma "pill" com a contagem de diárias
function fmtJobDates(j) {
  const dates = jobDatesArray(j);
  if (!dates.length) return "-";
  if (dates.length === 1) return fmtDate(dates[0]);
  if (dates.length <= 3) return `${dates.map(fmtDate).join(", ")}<span class="job-date-multi-tag">${dates.length} diárias</span>`;
  return `${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}<span class="job-date-multi-tag">${dates.length} diárias</span>`;
}
// Exibição em texto puro (CSV/Excel/PDF) — sem HTML
function fmtJobDatesPlain(j) {
  const dates = jobDatesArray(j);
  if (!dates.length) return "-";
  if (dates.length === 1) return fmtDate(dates[0]);
  if (dates.length <= 3) return `${dates.map(fmtDate).join(", ")} (${dates.length} diárias)`;
  return `${fmtDate(dates[0])} a ${fmtDate(dates[dates.length - 1])} (${dates.length} diárias)`;
}

function showToast(msg, type = "success", ms = 3000) {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), ms);
}

function loading(show) {
  $("loadingOverlay").classList.toggle("hidden", !show);
}

function statusLabel(s) {
  const map = {
    pendente: "🟡 Pendente",
    pago: "🟢 Pago",
    pago_nf: "🔵 Pago + NF",
    pago_nf_pdf: "🟣 Pago + NF + PDF",
    pago_recibo: "📃 Pago + Recibo"
  };
  return map[s] || s;
}

// Quanto já foi efetivamente recebido deste job
function paidAmountOf(j) {
  if (j.status === "pendente") return 0;
  if (j.paymentType === "parcial") return Math.min(Number(j.paidAmount || 0), Number(j.value || 0));
  return Number(j.value || 0);
}
// Quanto ainda falta receber deste job
function pendingAmountOf(j) {
  return Math.max(Number(j.value || 0) - paidAmountOf(j), 0);
}

// Lista de NFs do job (suporta jobs antigos com "nf" único)
function nfsArray(j) {
  if (Array.isArray(j.nfs)) return j.nfs;
  if (j.nf?.number) return [j.nf];
  return [];
}

// Lista de Recibos do job (suporta jobs antigos com "receipt" único)
function receiptsArray(j) {
  if (Array.isArray(j.receipts)) return j.receipts;
  if (j.receipt?.pdfUrl || j.receipt?.number) return [j.receipt];
  return [];
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Nome de exibição do cliente: usa o Nome Fantasia cadastrado, se houver; senão, o nome salvo no job
function clientDisplayName(name) {
  if (!name) return name;
  const c = getClientData(name);
  return (c && c.tradeName) ? c.tradeName : name;
}

// Valida pagamento parcial. Retorna null se ok, ou uma mensagem de erro.
function validatePartialPayment(value, paymentType, paidAmount) {
  if (paymentType !== "parcial") return null;
  if (isNaN(paidAmount) || paidAmount <= 0 || paidAmount >= value) {
    return "Informe um valor pago parcial maior que 0 e menor que o valor total.";
  }
  return null;
}

function statusBadge(j) {
  const s = j.status;
  let html = `<span class="badge badge-${s}">${statusLabel(s)}</span>`;
  if (s !== "pendente" && j.paymentType === "parcial") {
    html += ` <span class="badge badge-parcial">🟠 Parcial</span>`;
  }
  return html;
}

// Texto de valor para spans inline (NF views), com detalhe de parcial
function valueInlineText(j) {
  const base = fmt(j.value);
  if (j.status !== "pendente" && j.paymentType === "parcial") {
    return `${base} (Pago ${fmt(paidAmountOf(j))} · Falta ${fmt(pendingAmountOf(j))})`;
  }
  return base;
}

// Célula de valor da tabela, com detalhe de pago/pendente quando parcial
function valueCellHtml(j) {
  const total = Number(j.value || 0);
  if (j.status !== "pendente" && j.paymentType === "parcial") {
    return `${fmt(total)}<div class="value-parcial-hint">Pago ${fmt(paidAmountOf(j))} · Falta ${fmt(pendingAmountOf(j))}</div>`;
  }
  return fmt(total);
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
on("loginBtn", "click", async () => {
  const email = $("loginEmail").value.trim();
  const pass = $("loginPassword").value;
  if (!email || !pass) return showMsg("Preencha e-mail e senha.", "error");
  loading(true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showMsg(authError(e.code), "error");
  } finally { loading(false); }
});

on("registerBtn", "click", async () => {
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const pass = $("regPassword").value;
  const prof = $("regProfession").value;
  if (!name || !email || !pass || !prof) return showMsg("Preencha todos os campos.", "error");
  if (pass.length < 6) return showMsg("Senha deve ter pelo menos 6 caracteres.", "error");
  loading(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), { name, email, profession: prof, cnpj: "", createdAt: new Date() });
    showMsg("Conta criada! Entrando...", "success");
  } catch (e) {
    showMsg(authError(e.code), "error");
  } finally { loading(false); }
});

on("forgotPassword", "click", async e => {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  if (!email) return showMsg("Digite seu e-mail acima primeiro.", "error");
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("E-mail de recuperação enviado!", "success");
  } catch (e) { showMsg("Erro ao enviar e-mail.", "error"); }
});

function authError(code) {
  const map = {
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "Senha muito fraca.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/too-many-requests": "Muitas tentativas. Tente mais tarde.",
  };
  return map[code] || "Erro de autenticação. Tente novamente.";
}

function showMsg(msg, type) {
  const el = $("authMsg");
  el.textContent = msg;
  el.className = `auth-msg ${type}`;
}

// Auth tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    btn.classList.add("active");
    $(`${btn.dataset.tab}Form`).classList.add("active");
    $("authMsg").className = "auth-msg";
  });
});

// Logout
[$("logoutBtn"), $("logoutBtnSettings")].forEach(btn => {
  btn?.addEventListener("click", async () => {
    try {
      if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
      allJobs = [];
      await signOut(auth);
    } catch(e) { console.error("Logout error:", e); }
  });
});

// ─────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    window._currentUid = user.uid;

    // Check access
    const access = await checkAccess(user.uid);
    if (!access.allowed) {
      await signOut(auth);
      showAccessBlocked(access.reason, () => location.reload());
      return;
    }

    // Switch screens
    $("authScreen").style.display = "none";
    $("authScreen").classList.remove("active");
    $("appScreen").style.display = "grid";
    $("appScreen").classList.add("active");
    hideAccessBlocked();

    // Demo banner
    if (access.reason === "demo" && access.daysLeft != null) {
      showDemoBanner(access.daysLeft);
      document.body.classList.add("has-demo-banner");
    }

    await loadUserProfile();
    if (!unsubscribeJobs) subscribeJobs();

    // Clients
    subscribeClients(user.uid, () => {});
    initClientsEvents(user.uid, showToast, loading);

    // Admin
    window._navigateTo = navigateTo;
    initAdminPanel(user.uid);
    initAdminActions();

    navigateTo("dashboard");
  } else {
    currentUser = null;
    window._currentUid = null;
    allJobs = [];
    $("appScreen").style.display = "none";
    $("appScreen").classList.remove("active");
    $("authScreen").style.display = "flex";
    $("authScreen").classList.add("active");
    if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
    unsubscribeClients();
  }
});

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────
async function loadUserProfile() {
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      const d = snap.data();
      currentUserName = d.name || "";
      $("userNameDisplay").textContent = d.name?.split(" ")[0] || "";
      $("sidebarName").textContent = d.name || "";
      $("sidebarRole").textContent = d.profession || "";
      $("settingName").value = d.name || "";
      $("settingProfession").value = d.profession || "";
      $("settingCNPJ").value = d.cnpj || "";
    }
  } catch (e) { console.error(e); }
}

on("saveSettings", "click", async () => {
  const name = $("settingName").value.trim();
  const profession = $("settingProfession").value;
  const cnpj = $("settingCNPJ").value.trim();
  try {
    await setDoc(doc(db, "users", currentUser.uid), { name, profession, cnpj }, { merge: true });
    currentUserName = name;
    $("userNameDisplay").textContent = name.split(" ")[0];
    $("sidebarName").textContent = name;
    $("sidebarRole").textContent = profession;
    showToast("Configurações salvas!");
  } catch (e) { showToast("Erro ao salvar.", "error"); }
});

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  $(`page-${page}`)?.classList.add("active");
  document.querySelector(`[data-page="${page}"]`)?.classList.add("active");
  closeSidebar();

  if (page === "dashboard") renderDashboard();
  else if (page === "jobs") renderJobsPage();
  else if (page === "nf") renderNFPage();
  else if (page === "reports") renderReports();
  else if (page === "mei") renderMEI();
  else if (page === "logs") renderLogsPage();
  else if (page === "clients") {} // rendered by clients.js listener
  else if (page === "admin") {} // rendered by access.js
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", e => { e.preventDefault(); navigateTo(link.dataset.page); });
});

// Sidebar mobile
on("menuToggle", "click", () => {
  $("sidebar").classList.toggle("open");
  $("sidebarOverlay").classList.toggle("active");
});
on("sidebarOverlay", "click", closeSidebar);
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarOverlay").classList.remove("active");
}

// ─────────────────────────────────────────────
// MONTH NAV
// ─────────────────────────────────────────────
function updateMonthLabel() {
  $("currentMonthLabel").textContent = `${MONTHS_PT[currentMonth]} ${currentYear}`;
}
on("prevMonth", "click", () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  updateMonthLabel();
  renderDashboard();
});
on("nextMonth", "click", () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  updateMonthLabel();
  renderDashboard();
});
updateMonthLabel();

// ─────────────────────────────────────────────
// FIRESTORE — JOBS
// ─────────────────────────────────────────────
function subscribeJobs() {
  const q = query(
    collection(db, "users", currentUser.uid, "jobs"),
    orderBy("date", "desc")
  );
  unsubscribeJobs = onSnapshot(q, snap => {
    allJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshAllViews();
  }, err => console.error("Firestore error:", err));
}

function refreshAllViews() {
  const activePage = document.querySelector(".page.active")?.id?.replace("page-", "");
  if (activePage === "dashboard") renderDashboard();
  else if (activePage === "jobs") renderJobsPage();
  else if (activePage === "nf") renderNFPage();
  else if (activePage === "reports") renderReports();
  else if (activePage === "mei") renderMEI();
  updateMEIAlert();
  populateClientSuggestions();
  populateFilterClients();
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let dashView = "month"; // "month" | "year"
let dashStatus = "";

function renderDashboard() {
  updateMonthLabel();
  $("currentYearLabel").textContent = currentYear;

  const yearJobs = allJobs.filter(j => j.date?.startsWith(String(currentYear)));

  const monthJobs = yearJobs.filter(j => {
    if (!j.date) return false;
    const [, m] = j.date.split("-");
    return parseInt(m) - 1 === currentMonth;
  });

  // Período exibido nos cards e tabela: mês ou ano, conforme o toggle
  let periodJobs = dashView === "month" ? monthJobs : yearJobs;
  if (dashStatus) periodJobs = periodJobs.filter(j => j.status === dashStatus);

  const periodLabel = dashView === "month" ? "no Mês" : "no Ano";
  $("cardRecebidoLabel").textContent = `Recebido ${periodLabel}`;
  $("cardPendenteLabel").textContent = `Pendente ${periodLabel}`;
  $("cardTotalLabel").textContent = `Total ${periodLabel === "no Mês" ? "do Mês" : "do Ano"}`;
  $("cardJobsLabel").textContent = `Jobs ${periodLabel}`;
  $("dashJobsTitle").textContent = dashView === "month" ? "Jobs do mês" : "Jobs do ano";

  const recebido = periodJobs.reduce((a, j) => a + paidAmountOf(j), 0);
  const pendente = periodJobs.reduce((a, j) => a + pendingAmountOf(j), 0);
  const total = periodJobs.reduce((a, j) => a + Number(j.value || 0), 0);
  const anoTotal = yearJobs.reduce((a, j) => a + Number(j.value || 0), 0);
  const anoNF = yearJobs.filter(j => j.status === "pago_nf" || j.status === "pago_nf_pdf")
                         .reduce((a, j) => a + Number(j.value || 0), 0);
  const ticket = periodJobs.length ? total / periodJobs.length : 0;

  $("cardRecebido").textContent = fmt(recebido);
  $("cardPendente").textContent = fmt(pendente);
  $("cardTotal").textContent = fmt(total);
  $("cardAno").textContent = fmt(anoTotal);
  $("cardAnoNF").textContent = fmt(anoNF);
  $("cardJobs").textContent = periodJobs.length;
  $("cardTicket").textContent = fmt(ticket);

  // Table
  const tbody = $("dashJobsBody");
  tbody.innerHTML = "";
  $("dashEmpty").classList.toggle("hidden", periodJobs.length > 0);

  const sortedJobs = [...periodJobs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  sortedJobs.forEach(j => {
    const tr = document.createElement("tr");
    tr.classList.add("clickable-row");
    tr.innerHTML = `
      <td class="job-date">${fmtJobDates(j)}</td>
      <td><div class="job-name">${j.name}</div></td>
      <td><div class="job-client">${clientDisplayName(j.client)}</div></td>
      <td class="job-value">${valueCellHtml(j)}</td>
      <td>${statusBadge(j)}</td>
      <td>
        <div class="row-actions">
          <button class="row-btn" title="Editar Job" data-edit="${j.id}">✏️ Editar</button>
          <button class="row-btn nf-edit-btn" title="Notas Fiscais" data-nf="${j.id}">🧾 NF${nfsArray(j).length ? ` (${nfsArray(j).length})` : ""}</button>
          <button class="row-btn" title="Recibos" data-receipt-manage="${j.id}">📃 Recibo${receiptsArray(j).length ? ` (${receiptsArray(j).length})` : ""}</button>
          <button class="row-btn delete" title="Excluir Job" data-del="${j.id}">🗑️</button>
        </div>
      </td>`;
    tr.addEventListener("click", () => openJobModal(j.id));
    tbody.appendChild(tr);
  });

  bindRowActions(tbody);
}

// Toggle Mês / Ano
document.querySelectorAll(".dash-view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    dashView = btn.dataset.view;
    document.querySelectorAll(".dash-view-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $("dashMonthNav").classList.toggle("hidden", dashView !== "month");
    $("dashYearNav").classList.toggle("hidden", dashView !== "year");
    renderDashboard();
  });
});

// Filtro de status no Dashboard
on("dashStatusFilter", "change", (e) => {
  dashStatus = e.target.value;
  renderDashboard();
});

// Navegação de ano (quando na visão Ano)
on("prevYear", "click", () => { currentYear--; renderDashboard(); });
on("nextYear", "click", () => { currentYear++; renderDashboard(); });

// Botão Filtrar — vai para Jobs com o período + status atuais do dashboard já aplicados
on("dashFilterBtn", "click", () => {
  navigateTo("jobs");
  populateFilterMonths();
  if (dashView === "month") {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    $("filterMonth").value = monthStr;
  } else {
    $("filterMonth").value = "";
  }
  $("filterStatus").value = dashStatus;
  renderJobsPage();
});

// ─────────────────────────────────────────────
// JOBS PAGE
// ─────────────────────────────────────────────
function renderJobsPage() {
  const fMonth = $("filterMonth").value;
  const fClient = $("filterClient").value;
  const fStatus = $("filterStatus").value;
  const fNF = $("filterNF").value;

  let jobs = [...allJobs];
  if (fMonth) jobs = jobs.filter(j => j.date?.startsWith(fMonth));
  if (fClient) jobs = jobs.filter(j => j.client === fClient);
  if (fStatus) jobs = jobs.filter(j => j.status === fStatus);
  if (fNF === "com") jobs = jobs.filter(j => nfsArray(j).length > 0);
  if (fNF === "sem") jobs = jobs.filter(j => nfsArray(j).length === 0);

  const tbody = $("allJobsBody");
  tbody.innerHTML = "";
  $("jobsEmpty").classList.toggle("hidden", jobs.length > 0);

  jobs.forEach(j => {
    const tr = document.createElement("tr");
    tr.classList.add("clickable-row");
    tr.innerHTML = `
      <td class="job-date">${fmtJobDates(j)}</td>
      <td><div class="job-name">${j.name}</div><div class="job-client">${clientDisplayName(j.client)}</div></td>
      <td>${clientDisplayName(j.client)}</td>
      <td class="job-value">${valueCellHtml(j)}</td>
      <td>${statusBadge(j)}</td>
      <td class="nf-icon">
        ${nfsArray(j).length
          ? `<span class="badge badge-parcial" style="background:var(--accent-dim);color:var(--accent-light)">🧾 ${nfsArray(j).length} NF${nfsArray(j).length > 1 ? "s" : ""}</span>`
          : ""}
      </td>
      <td>
        <div class="row-actions">
          <button class="row-btn" title="Editar Job" data-edit="${j.id}">✏️ Editar</button>
          <button class="row-btn nf-edit-btn" title="Notas Fiscais" data-nf="${j.id}">🧾 NF${nfsArray(j).length ? ` (${nfsArray(j).length})` : ""}</button>
          <button class="row-btn" title="Recibos" data-receipt-manage="${j.id}">📃 Recibo${receiptsArray(j).length ? ` (${receiptsArray(j).length})` : ""}</button>
          <button class="row-btn delete" title="Excluir Job" data-del="${j.id}">🗑️</button>
        </div>
      </td>`;
    tr.addEventListener("click", () => openJobModal(j.id));
    tbody.appendChild(tr);
  });

  bindRowActions(tbody);
}

function populateFilterClients() {
  const clients = [...new Set(allJobs.map(j => j.client).filter(Boolean))].sort();
  const sel = $("filterClient");
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os clientes</option>';
  clients.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
  sel.value = cur;
}

function populateFilterMonths() {
  const months = [...new Set(allJobs.map(j => j.date?.slice(0,7)).filter(Boolean))].sort().reverse();
  const sel = $("filterMonth");
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>';
  months.forEach(m => {
    const [y, mo] = m.split("-");
    const o = document.createElement("option");
    o.value = m;
    o.textContent = `${MONTHS_PT[parseInt(mo)-1]} ${y}`;
    sel.appendChild(o);
  });
  sel.value = cur;
}

[$("filterMonth"), $("filterClient"), $("filterStatus"), $("filterNF")].forEach(sel => {
  sel?.addEventListener("change", renderJobsPage);
});
on("clearFilters", "click", () => {
  $("filterMonth").value = "";
  $("filterClient").value = "";
  $("filterStatus").value = "";
  $("filterNF").value = "";
  renderJobsPage();
});

// ─────────────────────────────────────────────
// BIND ROW ACTIONS
// ─────────────────────────────────────────────
function bindRowActions(tbody) {
  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); openJobModal(btn.dataset.edit); });
  });
  tbody.querySelectorAll("[data-nf]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); openNFModal(btn.dataset.nf); });
  });
  tbody.querySelectorAll("[data-receipt-manage]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); openReceiptModal(btn.dataset.receiptManage); });
  });
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); openDeleteModal(btn.dataset.del); });
  });
}

// ─────────────────────────────────────────────
// JOB MODAL
// ─────────────────────────────────────────────
let jobModalDates = [];
let jobModalHours = {};   // { "YYYY-MM-DD": horas }
let jobPricingMode = "fixo"; // "fixo" | "diaria" | "hora"
let jobPaymentType = "total"; // "total" | "parcial"

function openJobModal(jobId = null) {
  editingJobId = jobId;
  $("jobModalTitle").textContent = jobId ? "Editar Job" : "Novo Job";

  if (jobId) {
    const j = allJobs.find(x => x.id === jobId);
    if (!j) return;
    const existingDates = jobDatesArray(j);
    jobModalDates = existingDates.length ? existingDates : [today()];
    jobModalHours = { ...(j.hours || {}) };
    jobPricingMode = j.pricingMode || "fixo";
    jobPaymentType = j.paymentType === "parcial" ? "parcial" : "total";
    $("jobName").value = j.name || "";
    $("jobClient").value = j.client || "";
    $("jobValue").value = j.value || "";
    $("jobRate").value = j.rate || "";
    $("jobNotes").value = j.notes || "";
    $("jobStatus").value = j.status || "pendente";
    $("jobPayDate").value = j.payDate || "";
    $("jobPaidAmount").value = j.paidAmount || "";
  } else {
    jobModalDates = [today()];
    jobModalHours = {};
    jobPricingMode = "fixo";
    jobPaymentType = "total";
    $("jobName").value = "";
    $("jobClient").value = "";
    $("jobValue").value = "";
    $("jobRate").value = "";
    $("jobNotes").value = "";
    $("jobStatus").value = "pendente";
    $("jobPayDate").value = "";
    $("jobPaidAmount").value = "";
  }

  setPricingMode(jobPricingMode);
  setPaymentType(jobPaymentType);
  togglePayDateField();
  $("jobModal").classList.remove("hidden");
}

// ─────────────────────────────────────────────
// TIPO DE VALOR (Fixo / Diária / Hora)
// ─────────────────────────────────────────────
function setPricingMode(mode) {
  jobPricingMode = mode;
  $("pricingModeToggle").querySelectorAll(".mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  $("valueFixedField").classList.toggle("hidden", mode !== "fixo");
  $("valueRateField").classList.toggle("hidden", mode === "fixo");
  $("calcTotalField").classList.toggle("hidden", mode === "fixo");
  $("valueRateLabel").textContent = mode === "hora" ? "Valor da Hora (R$) *" : "Valor da Diária (R$) *";
  $("jobValue").readOnly = mode !== "fixo";
  renderJobDateRows();
  recalcJobValue();
}

$("pricingModeToggle").querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => setPricingMode(btn.dataset.mode));
});

on("jobRate", "input", recalcJobValue);
on("jobValue", "input", updatePendingHint);

function recalcJobValue() {
  if (jobPricingMode === "fixo") { updatePendingHint(); return; }

  const rate = parseFloat($("jobRate").value) || 0;
  let total = 0;

  if (jobPricingMode === "diaria") {
    total = rate * jobModalDates.filter(Boolean).length;
  } else if (jobPricingMode === "hora") {
    const totalHoras = jobModalDates.reduce((a, d) => a + (parseFloat(jobModalHours[d]) || 0), 0);
    total = rate * totalHoras;
  }

  $("calcTotalBox").textContent = fmt(total);
  $("jobValue").value = total ? total.toFixed(2) : "";
  updatePendingHint();
}

// ─────────────────────────────────────────────
// MULTI-DATA (diárias) NO MODAL DE JOB
// ─────────────────────────────────────────────
function renderJobDateRows() {
  const list = $("jobDatesList");
  const showHours = jobPricingMode === "hora";
  list.innerHTML = jobModalDates.map((d, i) => `
    <div class="job-date-row">
      <input type="date" class="job-date-input" data-idx="${i}" value="${d || ""}" />
      ${showHours ? `<input type="number" class="job-date-hours" data-idx="${i}" placeholder="Horas" min="0" step="0.5" value="${jobModalHours[d] ?? ""}" />` : ""}
      <button type="button" class="job-date-remove" data-idx="${i}" title="Remover diária" ${jobModalDates.length <= 1 ? "disabled" : ""}>✕</button>
    </div>`).join("");

  list.querySelectorAll(".job-date-input").forEach(inp => {
    inp.addEventListener("change", e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const oldDate = jobModalDates[idx];
      const newDate = e.target.value;
      if (jobPricingMode === "hora" && oldDate in jobModalHours) {
        jobModalHours[newDate] = jobModalHours[oldDate];
        delete jobModalHours[oldDate];
      }
      jobModalDates[idx] = newDate;
      recalcJobValue();
    });
  });
  list.querySelectorAll(".job-date-hours").forEach(inp => {
    inp.addEventListener("input", e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const d = jobModalDates[idx];
      jobModalHours[d] = e.target.value;
      recalcJobValue();
    });
  });
  list.querySelectorAll(".job-date-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      if (jobModalDates.length <= 1) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const [removed] = jobModalDates.splice(idx, 1);
      delete jobModalHours[removed];
      renderJobDateRows();
      recalcJobValue();
    });
  });
}

on("addJobDateBtn", "click", () => {
  const last = jobModalDates[jobModalDates.length - 1];
  let next = today();
  if (last) {
    const d = new Date(last + "T00:00:00");
    d.setDate(d.getDate() + 1);
    next = d.toISOString().split("T")[0];
  }
  jobModalDates.push(next);
  renderJobDateRows();
  recalcJobValue();
});

function closeJobModal() {
  $("jobModal").classList.add("hidden");
  editingJobId = null;
  resetReceiptDropzone();
}
on("closeJobModal", "click", closeJobModal);
on("cancelJobModal", "click", closeJobModal);

on("jobStatus", "change", togglePayDateField);
function togglePayDateField() {
  const paid = $("jobStatus").value !== "pendente";
  $("payDateField").style.display = paid ? "block" : "none";
  $("paymentTypeField").classList.toggle("hidden", !paid);
  if (!paid) {
    $("paidAmountField").classList.add("hidden");
  } else {
    $("paidAmountField").classList.toggle("hidden", jobPaymentType !== "parcial");
    updatePendingHint();
  }
}

// ─────────────────────────────────────────────
// TIPO DE PAGAMENTO (Total / Parcial)
// ─────────────────────────────────────────────
function setPaymentType(type) {
  jobPaymentType = type;
  $("paymentTypeToggle").querySelectorAll(".mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.ptype === type);
  });
  $("paidAmountField").classList.toggle("hidden", type !== "parcial");
  updatePendingHint();
}

$("paymentTypeToggle").querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => setPaymentType(btn.dataset.ptype));
});

on("jobPaidAmount", "input", updatePendingHint);

function updatePendingHint() {
  if (jobPaymentType !== "parcial" || $("jobStatus").value === "pendente") {
    $("pendingHint").textContent = "";
    return;
  }
  const total = parseFloat($("jobValue").value) || 0;
  const paid = parseFloat($("jobPaidAmount").value) || 0;
  const pending = Math.max(total - paid, 0);
  $("pendingHint").textContent = `Valor pendente: ${fmt(pending)} de ${fmt(total)}`;
}

on("saveJobBtn", "click", async () => {
  const dates = [...new Set(jobModalDates.filter(Boolean))].sort();
  const name = $("jobName").value.trim();
  const client = $("jobClient").value.trim();
  const value = parseFloat($("jobValue").value);
  const notes = $("jobNotes").value.trim();
  const status = $("jobStatus").value;
  const payDate = $("jobPayDate").value;
  const rate = parseFloat($("jobRate").value) || 0;

  if (!dates.length || !name || !client || isNaN(value) || value < 0)
    return showToast("Preencha todos os campos obrigatórios.", "error");

  if (jobPricingMode !== "fixo" && (!rate || rate <= 0)) {
    return showToast(`Informe o valor da ${jobPricingMode === "hora" ? "hora" : "diária"}.`, "error");
  }
  if (jobPricingMode === "hora" && !dates.some(d => (parseFloat(jobModalHours[d]) || 0) > 0)) {
    return showToast("Informe as horas trabalhadas em pelo menos um dia.", "error");
  }

  const existingJob = editingJobId ? allJobs.find(x => x.id === editingJobId) : null;
  const existingNFCount = existingJob ? nfsArray(existingJob).length : 0;
  if (existingNFCount > 0 && status !== "pago_nf" && status !== "pago_nf_pdf") {
    return showToast("Este job tem Notas Fiscais emitidas. Gerencie/remova as NFs pelo botão 🧾 NF antes de mudar o status.", "error");
  }
  const existingReceiptsCount = existingJob ? receiptsArray(existingJob).length : 0;
  if (existingReceiptsCount > 0 && status !== "pago_recibo") {
    return showToast("Este job tem Recibos cadastrados. Gerencie/remova os recibos pelo botão 📃 Recibo antes de mudar o status.", "error");
  }

  const isPaid = status !== "pendente";
  const paymentType = isPaid && jobPaymentType === "parcial" ? "parcial" : "total";
  let paidAmount = 0;
  if (isPaid) {
    paidAmount = paymentType === "parcial" ? (parseFloat($("jobPaidAmount").value) || 0) : value;
    const validationError = validatePartialPayment(value, paymentType, paidAmount);
    if (validationError) return showToast(validationError, "error");
  }

  if (!currentUser) return showToast("Sessão expirada. Faça login novamente.", "error");

  loading(true);
  try {
    const data = {
      date: dates[0], dates, name, client, value, notes, status,
      payDate: isPaid ? payDate : "",
      pricingMode: jobPricingMode,
      rate: jobPricingMode === "fixo" ? null : rate,
      hours: jobPricingMode === "hora" ? dates.reduce((o, d) => { o[d] = parseFloat(jobModalHours[d]) || 0; return o; }, {}) : null,
      paymentType,
      paidAmount,
      updatedAt: new Date()
    };
    if (editingJobId) {
      await updateDoc(doc(db, "users", currentUser.uid, "jobs", editingJobId), data);
      showToast("Job atualizado!");
    } else {
      data.createdAt = new Date();
      await addDoc(collection(db, "users", currentUser.uid, "jobs"), data);
      showToast("Job adicionado!");
    }
    closeJobModal();
    populateFilterMonths();
  } catch (e) {
    console.error(e);
    showToast("Erro ao salvar job.", "error");
  } finally { loading(false); }
});

[$("addJobBtn"), $("addJobBtnDash")].forEach(btn => {
  btn?.addEventListener("click", () => openJobModal());
});

function populateClientSuggestions() {
  // Now handled by clients.js -> updateClientSelects()
  // Fallback: also add job-based clients not in clients collection
  const dl = $("clientsSuggestions");
  if (!dl) return;
  const jobClients = [...new Set(allJobs.map(j => j.client).filter(Boolean))];
  const existingNames = (window.allClients || []).map(c => c.name);
  const extra = jobClients.filter(c => !existingNames.includes(c));
  const current = [...dl.options].map(o => o.value);
  extra.forEach(c => {
    if (!current.includes(c)) {
      const o = document.createElement("option");
      o.value = c;
      dl.appendChild(o);
    }
  });
}

// ─────────────────────────────────────────────
// DELETE MODAL (com log de exclusão)
// ─────────────────────────────────────────────
function openDeleteModal(jobId) {
  deletingJobId = jobId;
  $("deleteModal").dataset.mode = "job";
  $("deleteModalTitle").textContent = "Excluir Job";
  $("deleteModalText").textContent =
    "Tem certeza que deseja excluir este job? Esta ação não pode ser desfeita.";
  $("deleteReason").value = "";
  $("deleteModal").classList.remove("hidden");
}
function closeDeleteModalFn() {
  $("deleteModal").classList.add("hidden");
  deletingJobId = null;
}
on("closeDeleteModal", "click", closeDeleteModalFn);
on("cancelDelete", "click", closeDeleteModalFn);
on("confirmDelete", "click", async () => {
  if (!deletingJobId) return;

  const reason = $("deleteReason").value.trim();
  if (!reason) return showToast("Informe o motivo da exclusão.", "error");

  const job = allJobs.find(x => x.id === deletingJobId);

  loading(true);
  try {
    // Registra o log ANTES de excluir, para preservar os dados do job excluído
    await addDoc(collection(db, "users", currentUser.uid, "deleteLogs"), {
      entityType: "job",
      jobId: deletingJobId,
      jobName: job?.name || "",
      jobClient: job?.client || "",
      jobValue: job?.value || 0,
      jobDates: job ? jobDatesArray(job) : [],
      reason,
      userEmail: currentUser.email || "",
      userName: currentUserName || "",
      deletedAt: new Date()
    });

    await deleteDoc(doc(db, "users", currentUser.uid, "jobs", deletingJobId));
    showToast("Job excluído e registrado no log.");
    closeDeleteModalFn();
  } catch (e) {
    console.error(e);
    showToast("Erro ao excluir.", "error");
  } finally { loading(false); }
});

// ─────────────────────────────────────────────
// LOGS DE EXCLUSÃO
// ─────────────────────────────────────────────
async function renderLogsPage() {
  const tbody = $("logsBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text2)">Carregando...</td></tr>`;
  $("logsEmpty").classList.add("hidden");

  try {
    const q = query(collection(db, "users", currentUser.uid, "deleteLogs"), orderBy("deletedAt", "desc"));
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    tbody.innerHTML = "";
    $("logsEmpty").classList.toggle("hidden", logs.length > 0);

    logs.forEach(log => {
      const dt = log.deletedAt?.toDate?.() || new Date(log.deletedAt || Date.now());
      const dataHora = `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="white-space:nowrap;color:var(--text2);font-size:12px">${dataHora}</td>
        <td>${log.userName || log.userEmail || "-"}</td>
        <td>
          <div class="job-name">${log.jobName || "(sem nome)"}</div>
          <div class="job-client">${clientDisplayName(log.jobClient) || ""}</div>
        </td>
        <td class="job-value">${fmt(log.jobValue || 0)}</td>
        <td style="font-size:13px">${log.reason || "-"}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text2)">Erro ao carregar logs.</td></tr>`;
  }
}

// ─────────────────────────────────────────────
// NF MODAL (gerencia lista de NFs + pagamento do job)
// ─────────────────────────────────────────────
let selectedPDFFile = null;
let currentPdfUrl = "";
let nfModalList = [];      // NFs do job (cópia de trabalho local)
let nfEditingIndex = null; // índice em edição no formulário, ou null = adicionando nova
let nfPaymentType = "total";

function openNFModal(jobId) {
  nfTargetJobId = jobId;
  selectedPDFFile = null;
  nfEditingIndex = null;
  const j = allJobs.find(x => x.id === jobId);
  if (!j) return;

  nfModalList = nfsArray(j).map(nf => ({ ...nf, id: nf.id || genId() }));
  nfPaymentType = j.paymentType === "parcial" ? "parcial" : "total";

  $("nfJobInfo").innerHTML = `
    <strong>${j.name}</strong> — ${clientDisplayName(j.client)}<br>
    <span style="color:var(--text2)">Valor: ${valueInlineText(j)} | Data: ${fmtJobDates(j)}</span>`;

  $("nfPaidAmount").value = j.paidAmount || "";
  setNFPaymentType(nfPaymentType);

  resetNFForm();
  renderNFList();

  $("nfModal").classList.remove("hidden");
}

function closeNFModal() {
  $("nfModal").classList.add("hidden");
  nfTargetJobId = null;
  selectedPDFFile = null;
  currentPdfUrl = "";
  nfModalList = [];
  nfEditingIndex = null;
}
on("closeNFModal", "click", closeNFModal);
on("cancelNFModal", "click", closeNFModal);

// ─────────────────────────────────────────────
// SITUAÇÃO DE PAGAMENTO (dentro do modal de NF)
// ─────────────────────────────────────────────
function setNFPaymentType(type) {
  nfPaymentType = type;
  $("nfPaymentTypeToggle").querySelectorAll(".mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.ptype === type);
  });
  $("nfPaidAmountField").classList.toggle("hidden", type !== "parcial");
  updateNFPendingHint();
}
$("nfPaymentTypeToggle").querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => setNFPaymentType(btn.dataset.ptype));
});
on("nfPaidAmount", "input", updateNFPendingHint);

function updateNFPendingHint() {
  if (nfPaymentType !== "parcial") { $("nfPendingHint").textContent = ""; return; }
  const j = allJobs.find(x => x.id === nfTargetJobId);
  const total = Number(j?.value || 0);
  const paid = parseFloat($("nfPaidAmount").value) || 0;
  const pending = Math.max(total - paid, 0);
  $("nfPendingHint").textContent = `Valor pendente: ${fmt(pending)} de ${fmt(total)}`;
}

// ─────────────────────────────────────────────
// LISTA DE NFs (adicionar / editar / remover)
// ─────────────────────────────────────────────
function renderNFList() {
  const box = $("nfExistingList");
  $("nfListSectionLabel").textContent = `Notas Fiscais Cadastradas${nfModalList.length ? ` (${nfModalList.length})` : ""}`;
  if (!nfModalList.length) {
    box.innerHTML = `<div class="nf-list-empty">Nenhuma nota fiscal cadastrada ainda.</div>`;
    return;
  }
  box.innerHTML = nfModalList.map((nf, i) => `
    <div class="nf-list-item">
      <div class="nf-list-item-info">
        <span class="nf-number">NF #${nf.number}</span>
        <div class="nf-list-item-meta">
          <span>📅 ${nf.date ? fmtDate(nf.date) : "-"}</span>
          ${nf.link ? `<span>🔗 Link</span>` : ""}
          ${nf.pdfUrl || nf._file ? `<span>📎 PDF</span>` : ""}
        </div>
      </div>
      <div class="nf-list-item-actions">
        ${nf.link ? `<button type="button" data-nflink="${i}" title="Abrir link">🔗</button>` : ""}
        ${nf.pdfUrl ? `<button type="button" data-nfpdf="${i}" title="Ver PDF">📄</button>` : ""}
        <button type="button" data-nfedit="${i}" title="Editar">✏️</button>
        <button type="button" class="danger" data-nfremove="${i}" title="Remover">🗑️</button>
      </div>
    </div>`).join("");

  box.querySelectorAll("[data-nflink]").forEach(btn => {
    btn.addEventListener("click", () => window.open(nfModalList[+btn.dataset.nflink].link, "_blank"));
  });
  box.querySelectorAll("[data-nfpdf]").forEach(btn => {
    btn.addEventListener("click", () => window.open(nfModalList[+btn.dataset.nfpdf].pdfUrl, "_blank"));
  });
  box.querySelectorAll("[data-nfedit]").forEach(btn => {
    btn.addEventListener("click", () => loadNFIntoForm(+btn.dataset.nfedit));
  });
  box.querySelectorAll("[data-nfremove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.nfremove;
      nfModalList.splice(i, 1);
      if (nfEditingIndex === i) resetNFForm();
      renderNFList();
    });
  });
}

function resetNFForm() {
  nfEditingIndex = null;
  $("nfFormTitle").textContent = "+ Nova Nota Fiscal";
  $("nfNumber").value = "";
  $("nfDate").value = today();
  $("nfLink").value = "";
  currentPdfUrl = "";
  selectedPDFFile = null;
  resetPDFDropzone();
  $("nfCancelEditBtn").classList.add("hidden");
  $("nfAddToListBtn").textContent = "+ Adicionar à lista";
}

function loadNFIntoForm(i) {
  const nf = nfModalList[i];
  if (!nf) return;
  nfEditingIndex = i;
  $("nfFormTitle").textContent = `Editando NF #${nf.number}`;
  $("nfNumber").value = nf.number || "";
  $("nfDate").value = nf.date || today();
  $("nfLink").value = nf.link || "";
  currentPdfUrl = nf.pdfUrl || "";
  selectedPDFFile = nf._file || null;
  resetPDFDropzone();
  if (selectedPDFFile) showPDFPreview(selectedPDFFile.name, null);
  else if (currentPdfUrl) showPDFPreview(nf.pdfName || "PDF anexado", currentPdfUrl);
  $("nfCancelEditBtn").classList.remove("hidden");
  $("nfAddToListBtn").textContent = "💾 Atualizar NF";
}

on("nfCancelEditBtn", "click", resetNFForm);

on("nfAddToListBtn", "click", () => {
  try {
    const number = $("nfNumber").value.trim();
    if (!number) return showToast("Informe o número da NF.", "error");

    // Proteção: se o índice de edição não existir mais na lista (ex: removido), trata como novo
    const isEditing = nfEditingIndex !== null && nfModalList[nfEditingIndex] != null;

    const entry = {
      id: isEditing ? nfModalList[nfEditingIndex].id : genId(),
      number,
      date: $("nfDate").value,
      link: $("nfLink").value.trim(),
      pdfUrl: currentPdfUrl,
      pdfName: isEditing ? (nfModalList[nfEditingIndex].pdfName || "") : "",
      _file: selectedPDFFile || null
    };
    if (selectedPDFFile) entry.pdfName = selectedPDFFile.name;

    if (isEditing) {
      nfModalList[nfEditingIndex] = entry;
      showToast(`NF #${number} atualizada na lista.`);
    } else {
      nfModalList.push(entry);
      showToast(`NF #${number} adicionada (${nfModalList.length} na lista). Adicione outra ou clique em Salvar Alterações.`);
    }

    resetNFForm();
    renderNFList();
  } catch (e) {
    console.error("Erro ao adicionar NF à lista:", e);
    showToast("Erro ao adicionar NF. Tente novamente.", "error");
  }
});

// ─────────────────────────────────────────────
// PDF DROPZONE UI
// ─────────────────────────────────────────────
function resetPDFDropzone() {
  $("nfPDFEmpty").classList.remove("hidden");
  $("nfPDFPreview").classList.add("hidden");
  $("nfPDFProgress").classList.add("hidden");
  $("nfPDFFile").value = "";
}

function showPDFPreview(name, url) {
  $("nfPDFEmpty").classList.add("hidden");
  $("nfPDFProgress").classList.add("hidden");
  $("nfPDFPreview").classList.remove("hidden");
  $("nfPDFFileName").textContent = name;
  $("nfPDFPreview").dataset.url = url || "";
}

on("nfPDFDropzone", "click", (e) => {
  if (e.target.id === "nfPDFRemove") return;
  if ($("nfPDFPreview").classList.contains("hidden")) {
    $("nfPDFFile").click();
  }
});

on("nfPDFFile", "change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.type !== "application/pdf") {
    showToast("Apenas arquivos PDF são permitidos.", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("O arquivo deve ter no máximo 5MB.", "error");
    return;
  }
  selectedPDFFile = file;
  currentPdfUrl = "";
  showPDFPreview(file.name, null);
});

on("nfPDFRemove", "click", (e) => {
  e.stopPropagation();
  selectedPDFFile = null;
  currentPdfUrl = "";
  resetPDFDropzone();
});

// Drag and drop
["dragover", "dragleave", "drop"].forEach(evt => {
  on("nfPDFDropzone", evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (evt === "dragover") $("nfPDFDropzone").classList.add("drag-active");
    if (evt === "dragleave" || evt === "drop") $("nfPDFDropzone").classList.remove("drag-active");
    if (evt === "drop" && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        showToast("Apenas arquivos PDF são permitidos.", "error");
        return;
      }
      selectedPDFFile = file;
      currentPdfUrl = "";
      showPDFPreview(file.name, null);
    }
  });
});

// ─────────────────────────────────────────────
// SALVAR (NFs + situação de pagamento) — tudo em um só update
// ─────────────────────────────────────────────
on("saveNFBtn", "click", async () => {
  if (!nfTargetJobId) return;
  const j = allJobs.find(x => x.id === nfTargetJobId);
  if (!j) return;

  // Se o formulário de NF tem algo preenchido e não foi adicionado à lista, adiciona automaticamente
  const pendingNumber = $("nfNumber").value.trim();
  if (pendingNumber) {
    $("nfAddToListBtn").click();
  }

  const paymentType = nfPaymentType;
  const paidAmountInput = parseFloat($("nfPaidAmount").value) || 0;
  const paidAmount = paymentType === "parcial" ? paidAmountInput : Number(j.value || 0);

  const validationError = validatePartialPayment(Number(j.value || 0), paymentType, paidAmount);
  if (validationError) return showToast(validationError, "error");

  loading(true);
  try {
    // Upload de PDFs pendentes (novos arquivos anexados a qualquer NF da lista)
    for (const nf of nfModalList) {
      if (nf._file) {
        const result = await uploadPDF(nf._file, currentUser.uid, () => {});
        nf.pdfUrl = result.url;
        nf.pdfName = nf._file.name;
        delete nf._file;
      }
    }

    const finalNFs = nfModalList.map(({ _file, ...rest }) => rest);
    const hasNFs = finalNFs.length > 0;
    const hasPdf = finalNFs.some(n => n.pdfUrl);
    let newStatus = j.status;
    if (hasNFs) newStatus = hasPdf ? "pago_nf_pdf" : "pago_nf";
    else if (j.status === "pago_nf" || j.status === "pago_nf_pdf") newStatus = "pago";

    const payDateFinal = j.payDate || today();
    await updateDoc(doc(db, "users", currentUser.uid, "jobs", nfTargetJobId), {
      nfs: finalNFs,
      nf: null,
      status: newStatus,
      paymentType,
      paidAmount,
      payDate: payDateFinal,
      updatedAt: new Date()
    });

    // Atualiza a cópia local imediatamente (evita reabrir o modal com dados desatualizados
    // antes do listener do Firestore sincronizar de volta)
    const idx = allJobs.findIndex(x => x.id === nfTargetJobId);
    if (idx !== -1) {
      allJobs[idx] = { ...allJobs[idx], nfs: finalNFs, nf: null, status: newStatus, paymentType, paidAmount, payDate: payDateFinal };
    }

    showToast("Alterações salvas!");
    closeNFModal();
    refreshAllViews();
  } catch (e) {
    console.error(e);
    showToast(e.message || "Erro ao salvar Notas Fiscais.", "error");
  } finally { loading(false); }
});

// ─────────────────────────────────────────────
// RECEIPT MODAL (gerencia lista de Recibos + pagamento do job)
// ─────────────────────────────────────────────
let receiptTargetJobId = null;
let receiptSelectedFile = null;
let receiptCurrentPdfUrl = "";
let receiptModalList = [];      // Recibos do job (cópia de trabalho local)
let receiptEditingIndex = null; // índice em edição no formulário, ou null = adicionando novo
let receiptPaymentType = "total";

function openReceiptModal(jobId) {
  receiptTargetJobId = jobId;
  receiptSelectedFile = null;
  receiptEditingIndex = null;
  const j = allJobs.find(x => x.id === jobId);
  if (!j) return;

  receiptModalList = receiptsArray(j).map(r => ({ ...r, id: r.id || genId() }));
  receiptPaymentType = j.paymentType === "parcial" ? "parcial" : "total";

  $("receiptJobInfo").innerHTML = `
    <strong>${j.name}</strong> — ${clientDisplayName(j.client)}<br>
    <span style="color:var(--text2)">Valor: ${valueInlineText(j)} | Data: ${fmtJobDates(j)}</span>`;

  $("receiptPaidAmount").value = j.paidAmount || "";
  setReceiptPaymentType(receiptPaymentType);

  resetReceiptForm();
  renderReceiptList();

  $("receiptModal").classList.remove("hidden");
}

function closeReceiptModal() {
  $("receiptModal").classList.add("hidden");
  receiptTargetJobId = null;
  receiptSelectedFile = null;
  receiptCurrentPdfUrl = "";
  receiptModalList = [];
  receiptEditingIndex = null;
}
on("closeReceiptModal", "click", closeReceiptModal);
on("cancelReceiptModal", "click", closeReceiptModal);

// ─────────────────────────────────────────────
// SITUAÇÃO DE PAGAMENTO (dentro do modal de Recibo)
// ─────────────────────────────────────────────
function setReceiptPaymentType(type) {
  receiptPaymentType = type;
  $("receiptPaymentTypeToggle").querySelectorAll(".mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.ptype === type);
  });
  $("receiptPaidAmountField").classList.toggle("hidden", type !== "parcial");
  updateReceiptPendingHint();
}
$("receiptPaymentTypeToggle").querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => setReceiptPaymentType(btn.dataset.ptype));
});
on("receiptPaidAmount", "input", updateReceiptPendingHint);

function updateReceiptPendingHint() {
  if (receiptPaymentType !== "parcial") { $("receiptPendingHint").textContent = ""; return; }
  const j = allJobs.find(x => x.id === receiptTargetJobId);
  const total = Number(j?.value || 0);
  const paid = parseFloat($("receiptPaidAmount").value) || 0;
  const pending = Math.max(total - paid, 0);
  $("receiptPendingHint").textContent = `Valor pendente: ${fmt(pending)} de ${fmt(total)}`;
}

// ─────────────────────────────────────────────
// LISTA DE RECIBOS (adicionar / editar / remover)
// ─────────────────────────────────────────────
function renderReceiptList() {
  const box = $("receiptExistingList");
  $("receiptListSectionLabel").textContent = `Recibos Cadastrados${receiptModalList.length ? ` (${receiptModalList.length})` : ""}`;
  if (!receiptModalList.length) {
    box.innerHTML = `<div class="nf-list-empty">Nenhum recibo cadastrado ainda.</div>`;
    return;
  }
  box.innerHTML = receiptModalList.map((r, i) => `
    <div class="nf-list-item">
      <div class="nf-list-item-info">
        <span class="nf-number">${r.number ? `Recibo #${r.number}` : "Recibo (sem número)"}</span>
        <div class="nf-list-item-meta">
          ${r.pdfUrl || r._file ? `<span>📎 PDF</span>` : ""}
        </div>
      </div>
      <div class="nf-list-item-actions">
        ${r.pdfUrl ? `<button type="button" data-recpdf="${i}" title="Ver PDF">📄</button>` : ""}
        <button type="button" data-recedit="${i}" title="Editar">✏️</button>
        <button type="button" class="danger" data-recremove="${i}" title="Remover">🗑️</button>
      </div>
    </div>`).join("");

  box.querySelectorAll("[data-recpdf]").forEach(btn => {
    btn.addEventListener("click", () => window.open(receiptModalList[+btn.dataset.recpdf].pdfUrl, "_blank"));
  });
  box.querySelectorAll("[data-recedit]").forEach(btn => {
    btn.addEventListener("click", () => loadReceiptIntoForm(+btn.dataset.recedit));
  });
  box.querySelectorAll("[data-recremove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.recremove;
      receiptModalList.splice(i, 1);
      if (receiptEditingIndex === i) resetReceiptForm();
      renderReceiptList();
    });
  });
}

function resetReceiptForm() {
  receiptEditingIndex = null;
  $("receiptFormTitle").textContent = "+ Novo Recibo";
  $("receiptNumber").value = "";
  resetReceiptDropzone();
  $("receiptCancelEditBtn").classList.add("hidden");
  $("receiptAddToListBtn").textContent = "+ Adicionar à lista";
}

function loadReceiptIntoForm(i) {
  const r = receiptModalList[i];
  if (!r) return;
  receiptEditingIndex = i;
  $("receiptFormTitle").textContent = `Editando Recibo${r.number ? ` #${r.number}` : ""}`;
  $("receiptNumber").value = r.number || "";
  receiptCurrentPdfUrl = r.pdfUrl || "";
  receiptSelectedFile = r._file || null;
  resetPDFDropzoneVisualOnly();
  if (receiptSelectedFile) showReceiptPDFPreview(receiptSelectedFile.name, null);
  else if (receiptCurrentPdfUrl) showReceiptPDFPreview(r.pdfName || "PDF anexado", receiptCurrentPdfUrl);
  $("receiptCancelEditBtn").classList.remove("hidden");
  $("receiptAddToListBtn").textContent = "💾 Atualizar Recibo";
}
on("receiptCancelEditBtn", "click", resetReceiptForm);

on("receiptAddToListBtn", "click", () => {
  try {
    const number = $("receiptNumber").value.trim();
    const hasPdf = !!(receiptSelectedFile || receiptCurrentPdfUrl);
    if (!number && !hasPdf) return showToast("Informe o número do recibo ou anexe um PDF.", "error");

    const isEditing = receiptEditingIndex !== null && receiptModalList[receiptEditingIndex] != null;

    const entry = {
      id: isEditing ? receiptModalList[receiptEditingIndex].id : genId(),
      number,
      pdfUrl: receiptCurrentPdfUrl,
      pdfName: isEditing ? (receiptModalList[receiptEditingIndex].pdfName || "") : "",
      _file: receiptSelectedFile || null
    };
    if (receiptSelectedFile) entry.pdfName = receiptSelectedFile.name;

    if (isEditing) {
      receiptModalList[receiptEditingIndex] = entry;
      showToast(`Recibo${number ? " #" + number : ""} atualizado na lista.`);
    } else {
      receiptModalList.push(entry);
      showToast(`Recibo adicionado (${receiptModalList.length} na lista). Adicione outro ou clique em Salvar Alterações.`);
    }

    resetReceiptForm();
    renderReceiptList();
  } catch (e) {
    console.error("Erro ao adicionar recibo à lista:", e);
    showToast("Erro ao adicionar recibo. Tente novamente.", "error");
  }
});

// ─────────────────────────────────────────────
// PDF DROPZONE UI (Recibo)
// ─────────────────────────────────────────────
function resetPDFDropzoneVisualOnly() {
  $("receiptPDFEmpty").classList.remove("hidden");
  $("receiptPDFPreview").classList.add("hidden");
  $("receiptPDFProgress").classList.add("hidden");
  $("receiptPDFFile").value = "";
}

function resetReceiptDropzone() {
  resetPDFDropzoneVisualOnly();
  receiptSelectedFile = null;
  receiptCurrentPdfUrl = "";
}

function showReceiptPDFPreview(name, url) {
  $("receiptPDFEmpty").classList.add("hidden");
  $("receiptPDFProgress").classList.add("hidden");
  $("receiptPDFPreview").classList.remove("hidden");
  $("receiptPDFFileName").textContent = name;
  if (url) receiptCurrentPdfUrl = url;
}

on("receiptPDFDropzone", "click", (e) => {
  if (e.target.id === "receiptPDFRemove") return;
  if ($("receiptPDFPreview").classList.contains("hidden")) {
    $("receiptPDFFile").click();
  }
});

on("receiptPDFFile", "change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.type !== "application/pdf") {
    showToast("Apenas arquivos PDF são permitidos.", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("O arquivo deve ter no máximo 5MB.", "error");
    return;
  }
  receiptSelectedFile = file;
  receiptCurrentPdfUrl = "";
  showReceiptPDFPreview(file.name, null);
});

on("receiptPDFRemove", "click", (e) => {
  e.stopPropagation();
  resetReceiptDropzone();
});

["dragover", "dragleave", "drop"].forEach(evt => {
  on("receiptPDFDropzone", evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (evt === "dragover") $("receiptPDFDropzone").classList.add("drag-active");
    if (evt === "dragleave" || evt === "drop") $("receiptPDFDropzone").classList.remove("drag-active");
    if (evt === "drop" && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        showToast("Apenas arquivos PDF são permitidos.", "error");
        return;
      }
      receiptSelectedFile = file;
      receiptCurrentPdfUrl = "";
      showReceiptPDFPreview(file.name, null);
    }
  });
});

// ─────────────────────────────────────────────
// SALVAR (Recibos + situação de pagamento) — tudo em um só update
// ─────────────────────────────────────────────
on("saveReceiptBtn", "click", async () => {
  if (!receiptTargetJobId) return;
  const j = allJobs.find(x => x.id === receiptTargetJobId);
  if (!j) return;

  // Se o formulário tem algo preenchido e não foi adicionado à lista, adiciona automaticamente
  const pendingNumber = $("receiptNumber").value.trim();
  const pendingHasPdf = !!(receiptSelectedFile || receiptCurrentPdfUrl);
  if (pendingNumber || pendingHasPdf) {
    $("receiptAddToListBtn").click();
  }

  const paymentType = receiptPaymentType;
  const paidAmountInput = parseFloat($("receiptPaidAmount").value) || 0;
  const paidAmount = paymentType === "parcial" ? paidAmountInput : Number(j.value || 0);

  const validationError = validatePartialPayment(Number(j.value || 0), paymentType, paidAmount);
  if (validationError) return showToast(validationError, "error");

  loading(true);
  try {
    // Upload de PDFs pendentes
    for (const r of receiptModalList) {
      if (r._file) {
        const result = await uploadPDF(r._file, currentUser.uid, () => {});
        r.pdfUrl = result.url;
        r.pdfName = r._file.name;
        delete r._file;
      }
    }

    const finalReceipts = receiptModalList.map(({ _file, ...rest }) => rest);
    const hasReceipts = finalReceipts.length > 0;

    // Não mexe no status se o job já tem NF (NF tem prioridade sobre Recibo)
    let newStatus = j.status;
    if (nfsArray(j).length === 0) {
      if (hasReceipts) newStatus = "pago_recibo";
      else if (j.status === "pago_recibo") newStatus = "pago";
    }

    const payDateFinal = j.payDate || today();
    await updateDoc(doc(db, "users", currentUser.uid, "jobs", receiptTargetJobId), {
      receipts: finalReceipts,
      receipt: null,
      status: newStatus,
      paymentType,
      paidAmount,
      payDate: payDateFinal,
      updatedAt: new Date()
    });

    const idx = allJobs.findIndex(x => x.id === receiptTargetJobId);
    if (idx !== -1) {
      allJobs[idx] = { ...allJobs[idx], receipts: finalReceipts, receipt: null, status: newStatus, paymentType, paidAmount, payDate: payDateFinal };
    }

    showToast("Alterações salvas!");
    closeReceiptModal();
    refreshAllViews();
  } catch (e) {
    console.error(e);
    showToast(e.message || "Erro ao salvar Recibos.", "error");
  } finally { loading(false); }
});

// ─────────────────────────────────────────────
// NF PAGE
// ─────────────────────────────────────────────
function renderNFPage() {
  const nfJobs = allJobs.filter(j => nfsArray(j).length > 0);
  const container = $("nfList");
  container.innerHTML = "";
  $("nfEmpty").classList.toggle("hidden", nfJobs.length > 0);

  nfJobs.forEach(j => {
    const nfs = nfsArray(j);
    const card = document.createElement("div");
    card.className = "nf-card";
    card.innerHTML = `
      <div class="nf-card-header">
        <span class="nf-number">${nfs.length} NF${nfs.length > 1 ? "s" : ""}: ${nfs.map(n => `#${n.number}`).join(", ")}</span>
        ${statusBadge(j)}
      </div>
      <div class="nf-job-title">${j.name}</div>
      <div class="nf-client">${clientDisplayName(j.client)}</div>
      <div class="nf-meta">
        <span>💰 ${valueInlineText(j)}</span>
        <span>📅 Emissão: ${nfs.map(n => fmtDate(n.date)).join(", ")}</span>
        <span>🗓️ Job: ${fmtJobDates(j)}</span>
      </div>
      <div class="nf-actions">
        ${nfs.filter(n => n.link).map(n => `<a href="${n.link}" target="_blank" class="btn-nf-link">🔗 NF #${n.number}</a>`).join("")}
        ${nfs.filter(n => n.pdfUrl).map(n => `<button class="btn-nf-pdf" data-nfpage-pdf="${n.pdfUrl}">📄 PDF #${n.number}</button>`).join("")}
        <button class="btn-nf-pdf" data-nfpage-edit="${j.id}">✏️ Gerenciar NFs</button>
      </div>`;
    container.appendChild(card);
  });

  // Bind actions
  container.querySelectorAll("[data-nfpage-pdf]").forEach(btn => {
    btn.addEventListener("click", () => window.open(btn.dataset.nfpagePdf, "_blank"));
  });
  container.querySelectorAll("[data-nfpage-edit]").forEach(btn => {
    btn.addEventListener("click", () => openNFModal(btn.dataset.nfpageEdit));
  });
}

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────
let repPeriod = ""; // "" = mês atual (padrão), "YYYY-MM" = mês específico, "YYYY" = ano completo

function populateReportPeriods() {
  const sel = $("repPeriodSelect");
  const cur = sel.value;

  const months = [...new Set(allJobs.map(j => j.date?.slice(0,7)).filter(Boolean))].sort().reverse();
  const years = [...new Set(allJobs.map(j => j.date?.slice(0,4)).filter(Boolean))].sort().reverse();

  const defaultMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  let html = `<option value="${defaultMonthStr}">📅 Mês atual</option>`;
  html += `<optgroup label="Meses">`;
  months.forEach(m => {
    const [y, mo] = m.split("-");
    html += `<option value="${m}">${MONTHS_PT[parseInt(mo)-1]} ${y}</option>`;
  });
  html += `</optgroup><optgroup label="Anos">`;
  years.forEach(y => {
    html += `<option value="${y}">Ano ${y}</option>`;
  });
  html += `</optgroup>`;

  sel.innerHTML = html;
  sel.value = cur || repPeriod || defaultMonthStr;
  if (!repPeriod) repPeriod = sel.value;
}

function getReportJobs() {
  if (!repPeriod) return allJobs;
  // Ano completo: string de 4 dígitos. Mês específico: "YYYY-MM"
  if (repPeriod.length === 4) {
    return allJobs.filter(j => j.date?.startsWith(repPeriod));
  }
  return allJobs.filter(j => j.date?.startsWith(repPeriod));
}

function reportPeriodLabel() {
  if (!repPeriod) return "";
  if (repPeriod.length === 4) return `Ano ${repPeriod}`;
  const [y, m] = repPeriod.split("-");
  return `${MONTHS_PT[parseInt(m)-1]} ${y}`;
}

on("repPeriodSelect", "change", (e) => {
  repPeriod = e.target.value;
  renderReports();
});

function renderReports() {
  populateReportPeriods();

  // Garante que cada canvas está dentro de um .chart-wrap com altura fixa
  ["chartMes","chartCliente","chartStatus"].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas && !canvas.parentElement.classList.contains("chart-wrap")) {
      const wrap = document.createElement("div");
      wrap.className = "chart-wrap";
      canvas.parentNode.insertBefore(wrap, canvas);
      wrap.appendChild(canvas);
    }
  });

  renderNFvsMEI();
  renderChartMes();
  renderChartCliente();
  renderChartStatus();
  renderTopClientes();
}

function renderNFvsMEI() {
  const jobs = getReportJobs();

  // Faturamento total do período — todos os jobs, com ou sem NF
  const totalGeral = jobs.reduce((a, j) => a + Number(j.value || 0), 0);

  // Jobs com NF emitida (status pago_nf ou pago_nf_pdf)
  const jobsWithNF = jobs.filter(j => j.status === "pago_nf" || j.status === "pago_nf_pdf");
  const totalNF = jobsWithNF.reduce((a, j) => a + Number(j.value || 0), 0);
  const countNF = jobsWithNF.length;

  // Limite de referência: mensal (81.000/12) ou anual, dependendo do período selecionado
  const isMes = repPeriod && repPeriod.length === 7; // "YYYY-MM" = mês específico
  const limiteRef = isMes ? MEI_LIMIT / 12 : MEI_LIMIT;
  const limiteLabel = isMes
    ? `Limite mensal: ${fmt(limiteRef)} (1/12 do MEI)`
    : `Limite MEI: R$ 81.000`;

  const pctNF = Math.min((totalNF / limiteRef) * 100, 100);

  $("repFaturamentoTotal").textContent = fmt(totalGeral);
  $("repNFTotal").textContent = fmt(totalNF);
  $("repNFCount").textContent = countNF;
  $("repNFPercent").textContent = pctNF.toFixed(1) + "%" + (isMes ? " (do limite mensal)" : " (do limite anual)");
  $("repNFProgress").style.width = pctNF + "%";

  // Atualiza label do limite na barra de progresso
  const limiteEl = $("repNFLimiteLabel");
  if (limiteEl) limiteEl.textContent = limiteLabel;

  // Jobs pagos SEM nota fiscal emitida (alerta)
  const paidWithoutNF = jobs.filter(j => j.status === "pago");
  const totalWithoutNF = paidWithoutNF.reduce((a, j) => a + Number(j.value || 0), 0);

  const alertBox = $("repNFWithoutAlert");
  if (paidWithoutNF.length > 0) {
    alertBox.classList.remove("hidden");
    alertBox.innerHTML = `⚠️ Você tem <strong>${paidWithoutNF.length} job(s)</strong> pagos no valor de <strong>${fmt(totalWithoutNF)}</strong> sem nota fiscal emitida ${reportPeriodLabel() ? `em ${reportPeriodLabel()}` : "ainda este período"}.`;
  } else {
    alertBox.classList.add("hidden");
  }
}

function chartDefaults() {
  return {
    responsive: true,
    plugins: { legend: { labels: { color: "#9090b0", font: { family: "Space Grotesk" } } } },
    scales: {
      x: { ticks: { color: "#9090b0" }, grid: { color: "#2a2a38" } },
      y: { ticks: { color: "#9090b0" }, grid: { color: "#2a2a38" } }
    }
  };
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function renderChartMes() {
  destroyChart("mes");
  const jobs = getReportJobs();
  const byMonth = {};
  jobs.forEach(j => {
    const m = j.date?.slice(0,7);
    if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + Number(j.value || 0);
  });
  const keys = Object.keys(byMonth).sort().slice(-12);
  const labels = keys.map(k => { const [y,m]=k.split("-"); return `${MONTHS_PT[parseInt(m)-1].slice(0,3)} ${y}`; });
  const data = keys.map(k => byMonth[k]);

  charts.mes = new Chart($("chartMes"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Faturamento", data, backgroundColor: "#7c6af788", borderColor: "#7c6af7", borderWidth: 2, borderRadius: 6 }]
    },
    options: { maintainAspectRatio: false, ...chartDefaults(), plugins: { legend: { display: false } } }
  });
}

function renderChartCliente() {
  destroyChart("cliente");
  const jobs = getReportJobs();
  const byClient = {};
  jobs.forEach(j => { byClient[j.client] = (byClient[j.client] || 0) + 1; });
  const entries = Object.entries(byClient).sort((a,b) => b[1]-a[1]).slice(0,8);
  const colors = ["#7c6af7","#3498db","#2ecc71","#f39c12","#e74c3c","#9b59b6","#1abc9c","#e67e22"];

  charts.cliente = new Chart($("chartCliente"), {
    type: "doughnut",
    data: {
      labels: entries.map(e=>e[0]),
      datasets: [{ data: entries.map(e=>e[1]), backgroundColor: colors, borderWidth: 0 }]
    },
    options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: "bottom", labels: { color: "#9090b0", font: { family: "Space Grotesk" }, padding: 12 } } } }
  });
}

function renderChartStatus() {
  destroyChart("status");
  const jobs = getReportJobs();
  const counts = { pendente: 0, pago: 0, pago_nf: 0, pago_nf_pdf: 0, pago_recibo: 0 };
  jobs.forEach(j => { if (counts[j.status] !== undefined) counts[j.status]++; });

  charts.status = new Chart($("chartStatus"), {
    type: "doughnut",
    data: {
      labels: ["Pendente", "Pago", "Pago + NF", "Pago + NF + PDF", "Pago + Recibo"],
      datasets: [{ data: Object.values(counts), backgroundColor: ["#f39c12","#2ecc71","#3498db","#9b59b6","#17a398"], borderWidth: 0 }]
    },
    options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: "bottom", labels: { color: "#9090b0", font: { family: "Space Grotesk" }, padding: 12 } } } }
  });
}

function renderTopClientes() {
  const jobs = getReportJobs();
  const byClient = {};
  jobs.forEach(j => { byClient[j.client] = (byClient[j.client] || 0) + Number(j.value || 0); });
  const sorted = Object.entries(byClient).sort((a,b) => b[1]-a[1]).slice(0,6);
  const max = sorted[0]?.[1] || 1;

  $("topClientes").innerHTML = `<div class="top-clients-list">
    ${sorted.map(([c,v]) => `
      <div class="top-client-item">
        <div class="top-client-name">${c}</div>
        <div class="top-client-bar-wrap"><div class="top-client-bar" style="width:${(v/max*100).toFixed(1)}%"></div></div>
        <div class="top-client-value">${fmt(v)}</div>
      </div>`).join("")}
  </div>`;
}

// ─────────────────────────────────────────────
// REPORTS EXPORT (Excel / PDF)
// ─────────────────────────────────────────────
on("repExportExcel", "click", () => {
  const jobs = getReportJobs();
  const data = jobs.map(j => ({
    Data: fmtJobDatesPlain(j),
    Job: j.name,
    Cliente: j.client,
    Valor: Number(j.value),
    Pago: paidAmountOf(j),
    Pendente: pendingAmountOf(j),
    Status: statusLabel(j.status),
    "NF Nº": nfsArray(j).map(n => n.number).join("; "),
    "NF Data": nfsArray(j).map(n => fmtDate(n.date)).join("; "),
    "Recibo": receiptsArray(j).map(r => r.number).filter(Boolean).join("; ") || (j.status === "pago_recibo" ? "Sim" : ""),
    Observações: j.notes || ""
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  const label = reportPeriodLabel().replace(/\s+/g, "_") || "geral";
  XLSX.writeFile(wb, `relatorio-${label}.xlsx`);
});

on("repExportPDF", "click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório - Controle de Job", 14, 16);
  doc.setFontSize(10);
  doc.text(`Período: ${reportPeriodLabel() || "Todos"} | Exportado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

  const jobs = getReportJobs();
  const total = jobs.reduce((a,j)=>a+Number(j.value||0),0);
  const totalPago = jobs.reduce((a,j)=>a+paidAmountOf(j),0);
  const totalPendente = jobs.reduce((a,j)=>a+pendingAmountOf(j),0);

  doc.autoTable({
    startY: 28,
    head: [["Data","Job","Cliente","Valor","Pago","Pendente","Status"]],
    body: jobs.map(j => [fmtJobDatesPlain(j), j.name, j.client, fmt(j.value), fmt(paidAmountOf(j)), fmt(pendingAmountOf(j)), statusLabel(j.status)]),
    foot: [["","","","TOTAL", fmt(total), fmt(totalPago), fmt(totalPendente)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124,106,247] },
    footStyles: { fontStyle: "bold" }
  });

  const label = reportPeriodLabel().replace(/\s+/g, "_") || "geral";
  doc.save(`relatorio-${label}.pdf`);
});

// ─────────────────────────────────────────────
// MEI
// ─────────────────────────────────────────────
function renderMEI() {
  const year = new Date().getFullYear();
  const yearJobs = allJobs.filter(j => j.date?.startsWith(String(year)));
  const faturado = yearJobs.reduce((a,j) => a + Number(j.value||0), 0);

  // Faturamento com Nota Fiscal emitida — é esse valor que conta para o limite MEI
  const jobsComNF = yearJobs.filter(j => j.status === "pago_nf" || j.status === "pago_nf_pdf");
  const faturadoNF = jobsComNF.reduce((a,j) => a + Number(j.value||0), 0);

  const disponivel = MEI_LIMIT - faturadoNF;
  const pct = Math.min(faturadoNF / MEI_LIMIT * 100, 100);

  $("meiFaturado").textContent = fmt(faturado);
  $("meiFaturadoNF").textContent = fmt(faturadoNF);
  $("meiDisponivel").textContent = fmt(disponivel);
  $("meiPercent").textContent = pct.toFixed(1) + "%";
  $("meiProgress").style.width = pct + "%";

  // Stats (baseados no faturamento com NF, que é o que conta para o limite)
  const monthNow = new Date().getMonth() + 1;
  const media = monthNow > 0 ? faturadoNF / monthNow : 0;
  const projecao = media * 12;
  const mesesRestantes = 12 - monthNow;

  $("meiMedia").textContent = fmt(media);
  $("meiProjecao").textContent = fmt(projecao);
  $("meiMesesRestantes").textContent = mesesRestantes;

  // Alert box
  const alertBox = $("meiAlertBox");
  alertBox.className = "mei-alert-box";
  if (pct >= 95) {
    alertBox.classList.remove("hidden");
    alertBox.classList.add("warn95");
    alertBox.textContent = `🚨 ATENÇÃO: Você atingiu ${pct.toFixed(1)}% do limite MEI. Considere abrir uma empresa ou suspender emissão de notas.`;
  } else if (pct >= 85) {
    alertBox.classList.remove("hidden");
    alertBox.classList.add("warn85");
    alertBox.textContent = `⚠️ Alerta: Você está em ${pct.toFixed(1)}% do limite MEI. Fique atento ao faturamento restante.`;
  } else if (pct >= 70) {
    alertBox.classList.remove("hidden");
    alertBox.classList.add("warn70");
    alertBox.textContent = `💡 Aviso: Você já utilizou ${pct.toFixed(1)}% do limite MEI anual.`;
  } else {
    alertBox.classList.add("hidden");
  }
}

function updateMEIAlert() {
  const year = new Date().getFullYear();
  const yearJobs = allJobs.filter(j => j.date?.startsWith(String(year)));
  const faturadoNF = yearJobs
    .filter(j => j.status === "pago_nf" || j.status === "pago_nf_pdf")
    .reduce((a,j)=>a+Number(j.value||0),0);
  const pct = faturadoNF / MEI_LIMIT * 100;
  const alert = $("meiAlert");

  if (pct >= 95) {
    alert.className = "mei-alert warn95";
    alert.textContent = `🚨 Limite MEI: ${pct.toFixed(0)}% utilizado — R$ ${fmt(faturadoNF)} de R$ 81.000 (com NF emitida)`;
    alert.classList.remove("hidden");
  } else if (pct >= 85) {
    alert.className = "mei-alert warn85";
    alert.textContent = `⚠️ Limite MEI: ${pct.toFixed(0)}% utilizado (com NF emitida)`;
    alert.classList.remove("hidden");
  } else if (pct >= 70) {
    alert.className = "mei-alert warn70";
    alert.textContent = `💡 Limite MEI: ${pct.toFixed(0)}% utilizado (com NF emitida)`;
    alert.classList.remove("hidden");
  } else {
    alert.classList.add("hidden");
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
on("exportCSV", "click", () => {
  const jobs = getFilteredJobs();
  const header = ["Data(s)","Job","Cliente","Valor","Pago","Pendente","Status","NF Número","NF Data","Recibo","Observações"];
  const rows = jobs.map(j => [
    jobDatesArray(j).join("; "), j.name, j.client, j.value, paidAmountOf(j), pendingAmountOf(j), statusLabel(j.status),
    nfsArray(j).map(n => n.number).join("; "), nfsArray(j).map(n => n.date).join("; "), receiptsArray(j).map(r => r.number).filter(Boolean).join("; "), j.notes || ""
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(csv, "jobs.csv", "text/csv");
});

on("exportExcel", "click", () => {
  const jobs = getFilteredJobs();
  const data = jobs.map(j => ({
    Data: fmtJobDatesPlain(j),
    Job: j.name,
    Cliente: j.client,
    Valor: Number(j.value),
    Pago: paidAmountOf(j),
    Pendente: pendingAmountOf(j),
    Status: statusLabel(j.status),
    "NF Nº": nfsArray(j).map(n => n.number).join("; "),
    "NF Data": nfsArray(j).map(n => fmtDate(n.date)).join("; "),
    "Recibo": receiptsArray(j).map(r => r.number).filter(Boolean).join("; ") || (j.status === "pago_recibo" ? "Sim" : ""),
    Observações: j.notes || ""
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jobs");
  XLSX.writeFile(wb, "controle-jobs.xlsx");
});

on("exportPDF", "click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Controle de Jobs", 14, 16);
  doc.setFontSize(10);
  doc.text(`Exportado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

  const jobs = getFilteredJobs();
  const total = jobs.reduce((a,j)=>a+Number(j.value||0),0);
  const totalPago = jobs.reduce((a,j)=>a+paidAmountOf(j),0);
  const totalPendente = jobs.reduce((a,j)=>a+pendingAmountOf(j),0);

  doc.autoTable({
    startY: 28,
    head: [["Data","Job","Cliente","Valor","Pago","Pendente","Status"]],
    body: jobs.map(j => [fmtJobDatesPlain(j), j.name, j.client, fmt(j.value), fmt(paidAmountOf(j)), fmt(pendingAmountOf(j)), statusLabel(j.status)]),
    foot: [["","","","TOTAL", fmt(total), fmt(totalPago), fmt(totalPendente)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124,106,247] },
    footStyles: { fontStyle: "bold" }
  });

  doc.save("controle-jobs.pdf");
});

function getFilteredJobs() {
  const fMonth = $("filterMonth").value;
  const fClient = $("filterClient").value;
  const fStatus = $("filterStatus").value;
  let jobs = [...allJobs];
  if (fMonth) jobs = jobs.filter(j => j.date?.startsWith(fMonth));
  if (fClient) jobs = jobs.filter(j => j.client === fClient);
  if (fStatus) jobs = jobs.filter(j => j.status === fStatus);
  return jobs;
}

function downloadFile(content, filename, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

// ─────────────────────────────────────────────
// PWA SERVICE WORKER
// ─────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Initial populate
populateFilterMonths();
