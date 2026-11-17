// ═══════════════════════════════════════════════
// logger.js — Histórico de inclusões, alterações e exclusões
// ═══════════════════════════════════════════════
// Coleção: users/{uid}/activityLogs (append-only, veja firestore.rules).
// Os logs antigos de exclusão (users/{uid}/deleteLogs) continuam sendo lidos e
// aparecem na mesma lista.

import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const LOG_LIMIT = 500;

let who = { uid: "", email: "", name: "" };
export function setLogUser(u) { who = { uid: u?.uid || "", email: u?.email || "", name: u?.name || "" }; }

export const ACTION_LABEL = { create: "Inclusão", update: "Alteração", delete: "Exclusão" };
export const ENTITY_LABEL = { job: "Job", client: "Cliente", profile: "Perfil" };

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ─────────────────────────────────────────────
// FORMATAÇÃO DE VALORES PARA O LOG
// ─────────────────────────────────────────────
const money = n => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = s => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : String(s));

const STATUS_TXT = {
  pendente: "Pendente",
  pendente_nf: "Pendente + NF emitida",
  pendente_recibo: "Pendente + Recibo emitido",
  pago: "Pago",
  pago_nf: "Pago + NF emitida",
  pago_nf_pdf: "Pago + NF + PDF",
  pago_recibo: "Pago + Recibo"
};
const PRICING_TXT = { fixo: "Valor fixo", diaria: "Por diária", hora: "Por hora" };

function earningTxt(e) {
  if (!e || !e.mode) return "Valor total";
  return e.mode === "percentual" ? `${Number(e.amount) || 0}% do valor` : `${money(e.amount)} fixo`;
}

function jobDates(j) {
  if (Array.isArray(j?.dates) && j.dates.length) return j.dates;
  return j?.date ? [j.date] : [];
}

// campo → { label, get(obj) → valor comparável, fmt(valor) → texto }
const JOB_FIELDS = [
  { key: "name", label: "Nome", get: j => j.name || "" },
  { key: "client", label: "Cliente", get: j => j.client || "" },
  { key: "dates", label: "Data(s)", get: j => jobDates(j).join(","), fmt: v => (v ? v.split(",").map(dateBR).join(", ") : "") },
  { key: "value", label: "Valor", get: j => Number(j.value) || 0, fmt: money },
  { key: "pricingMode", label: "Tipo de valor", get: j => j.pricingMode || "fixo", fmt: v => PRICING_TXT[v] || v },
  { key: "rate", label: "Valor unitário", get: j => Number(j.rate) || 0, fmt: v => (v ? money(v) : "") },
  { key: "earning", label: "Seu ganho", get: j => (j.earning && j.earning.mode ? `${j.earning.mode}:${Number(j.earning.amount) || 0}` : ""),
    fmt: v => { if (!v) return "Valor total"; const [m, a] = v.split(":"); return earningTxt({ mode: m, amount: Number(a) }); } },
  { key: "status", label: "Status", get: j => j.status || "", fmt: v => STATUS_TXT[v] || v },
  { key: "paymentType", label: "Tipo de pagamento", get: j => j.paymentType || "total", fmt: v => (v === "parcial" ? "Parcial" : "Total") },
  { key: "paidAmount", label: "Valor pago", get: j => Number(j.paidAmount) || 0, fmt: money },
  { key: "payDate", label: "Data do pagamento", get: j => j.payDate || "", fmt: dateBR },
  { key: "notes", label: "Observações", get: j => j.notes || "" },
  { key: "nfs", label: "Notas fiscais", get: j => (Array.isArray(j.nfs) ? j.nfs.length : (j.nf ? 1 : 0)), fmt: n => `${n} NF(s)` },
  { key: "receipts", label: "Recibos", get: j => (Array.isArray(j.receipts) ? j.receipts.length : (j.receipt ? 1 : 0)), fmt: n => `${n} recibo(s)` }
];

const CLIENT_FIELDS = [
  { key: "name", label: "Nome", get: c => c.name || "" },
  { key: "tradeName", label: "Nome fantasia", get: c => c.tradeName || "" },
  { key: "cnpj", label: "CNPJ", get: c => c.cnpj || "" },
  { key: "contactName", label: "Contato", get: c => c.contactName || "" },
  { key: "contactRole", label: "Cargo", get: c => c.contactRole || "" },
  { key: "email", label: "E-mail", get: c => c.email || "" },
  { key: "phone", label: "Telefone", get: c => c.phone || "" },
  { key: "address", label: "Endereço", get: c => c.address || "" },
  { key: "city", label: "Cidade", get: c => c.city || "" },
  { key: "state", label: "Estado", get: c => c.state || "" },
  { key: "cep", label: "CEP", get: c => c.cep || "" },
  { key: "notes", label: "Observações", get: c => c.notes || "" },
  { key: "status", label: "Situação", get: c => c.status || "ativo", fmt: v => (v === "inativo" ? "Inativo" : "Ativo") }
];

const BRANCH_TXT = { audiovisual: "Audiovisual / Gravações", servicos: "Prestação de Serviços" };
const COMPANY_TXT = { mei: "MEI", me: "ME", epp: "EPP", sa: "S.A.", autonomo: "Autônomo" };
const PROFILE_FIELDS = [
  { key: "name", label: "Nome", get: p => p.name || "" },
  { key: "profession", label: "Profissão", get: p => p.profession || "" },
  { key: "cnpj", label: "CNPJ MEI", get: p => p.cnpj || "" },
  { key: "workBranch", label: "Ramo de trabalho", get: p => p.workBranch || "audiovisual", fmt: v => BRANCH_TXT[v] || v },
  { key: "companyType", label: "Tipo de empresa", get: p => p.companyType || "mei", fmt: v => COMPANY_TXT[v] || v },
  { key: "customLimits", label: "Limite personalizado",
    get: p => Object.entries(p.customLimits || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${COMPANY_TXT[k] || k}: ${money(v)}`).join(" · "),
    fmt: v => v || "padrão" },
  { key: "trackEarnings", label: "Controlar meu ganho", get: p => (p.trackEarnings ? "sim" : "não") },
  { key: "defaultEarning", label: "Ganho padrão", get: p => (p.defaultEarning && p.defaultEarning.mode ? `${p.defaultEarning.mode}:${Number(p.defaultEarning.amount) || 0}` : ""),
    fmt: v => { if (!v) return "Valor total"; const [m, a] = v.split(":"); return earningTxt({ mode: m, amount: Number(a) }); } }
];

function diffBy(fields, before, after) {
  const changes = [];
  for (const f of fields) {
    const a = f.get(before || {});
    const b = f.get(after || {});
    if (String(a) === String(b)) continue;
    const show = v => (f.fmt ? f.fmt(v) : String(v));
    changes.push({ field: f.label, from: show(a) || "—", to: show(b) || "—" });
  }
  return changes;
}

export const diffJob = (before, after) => diffBy(JOB_FIELDS, before, after);
export const diffClient = (before, after) => diffBy(CLIENT_FIELDS, before, after);
export const diffProfile = (before, after) => diffBy(PROFILE_FIELDS, before, after);

// Resumo curto de um job (para inclusão/exclusão)
export function jobSnapshot(j) {
  return {
    name: j?.name || "",
    client: j?.client || "",
    value: Number(j?.value) || 0,
    status: STATUS_TXT[j?.status] || j?.status || "",
    dates: jobDates(j).map(dateBR).join(", ")
  };
}

// ─────────────────────────────────────────────
// GRAVAÇÃO
// ─────────────────────────────────────────────
// entry: { action, entityType, entityId, entityName, entityClient?, value?, changes?, snapshot?, reason?, summary?, bulk? }
export function activityPayload(entry) {
  const p = {
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId || "",
    entityName: entry.entityName || "",
    entityClient: entry.entityClient || "",
    value: typeof entry.value === "number" ? entry.value : null,
    summary: entry.summary || "",
    changes: (entry.changes || []).slice(0, 30),
    snapshot: entry.snapshot || null,
    reason: entry.reason || "",
    bulk: !!entry.bulk,
    userEmail: who.email,
    userName: who.name,
    at: new Date()
  };
  return p;
}

export function activityRef(uid) {
  return doc(collection(db, "users", uid, "activityLogs"));
}

// Escrita avulsa. Falha no log nunca derruba a operação principal.
export async function logActivity(entry, uid = who.uid) {
  if (!uid) return;
  try {
    const p = addDoc(collection(db, "users", uid, "activityLogs"), activityPayload(entry));
    if (navigator.onLine === false) { p.catch(e => console.warn("Log offline não enviado:", e)); return; }
    await p;
  } catch (e) {
    console.warn("Não foi possível registrar no histórico:", e);
  }
}

export const logJobCreated = (id, j) => logActivity({
  action: "create", entityType: "job", entityId: id, entityName: j.name, entityClient: j.client,
  value: Number(j.value) || 0, snapshot: jobSnapshot(j)
});

export function logJobUpdated(id, before, after) {
  const changes = diffJob(before, after);
  if (!changes.length) return Promise.resolve();
  return logActivity({
    action: "update", entityType: "job", entityId: id, entityName: after.name || before?.name,
    entityClient: after.client || before?.client, value: Number(after.value ?? before?.value) || 0, changes
  });
}

// ─────────────────────────────────────────────
// LEITURA (novos logs + logs antigos de exclusão)
// ─────────────────────────────────────────────
function toDate(v) {
  if (v?.toDate) return v.toDate();
  const d = new Date(v || Date.now());
  return isNaN(d) ? new Date() : d;
}

export async function fetchLogs(uid) {
  const out = [];
  try {
    const snap = await getDocs(query(collection(db, "users", uid, "activityLogs"), orderBy("at", "desc"), limit(LOG_LIMIT)));
    snap.docs.forEach(d => { const x = d.data(); out.push({ id: d.id, ...x, at: toDate(x.at) }); });
  } catch (e) { console.warn("activityLogs:", e); }

  try {
    const snap = await getDocs(query(collection(db, "users", uid, "deleteLogs"), orderBy("deletedAt", "desc"), limit(LOG_LIMIT)));
    snap.docs.forEach(d => {
      const x = d.data();
      out.push({
        id: "legacy-" + d.id, legacy: true, action: "delete", entityType: x.entityType || "job",
        entityId: x.jobId || "", entityName: x.jobName || "", entityClient: x.jobClient || "",
        value: typeof x.jobValue === "number" ? x.jobValue : null,
        reason: x.reason || "", bulk: !!x.bulk, changes: [], userName: x.userName || "", userEmail: x.userEmail || "",
        at: toDate(x.deletedAt)
      });
    });
  } catch (e) { console.warn("deleteLogs:", e); }

  out.sort((a, b) => b.at - a.at);
  return out;
}

// ─────────────────────────────────────────────
// TELA DE LOGS
// ─────────────────────────────────────────────
let logsCache = [];
let fAction = "all";
let fEntity = "all";
let uiBound = false;

function rowHtml(l) {
  const dt = `${l.at.toLocaleDateString("pt-BR")} ${l.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const ent = ENTITY_LABEL[l.entityType] || l.entityType || "Item";
  const name = l.entityName || "(sem nome)";
  const sub = l.entityClient ? `<div class="job-client log-name">${esc(l.entityClient)}</div>` : "";

  let details = "";
  if (l.changes?.length) {
    details += `<ul class="log-changes">${l.changes.map(c =>
      `<li><strong>${esc(c.field)}:</strong> <span class="log-from">${esc(c.from)}</span> → <span class="log-to">${esc(c.to)}</span></li>`).join("")}</ul>`;
  }
  if (l.action === "create" && l.snapshot) {
    const s = l.snapshot;
    const parts = [s.dates, s.value ? money(s.value) : "", s.status].filter(Boolean).map(esc);
    if (parts.length) details += `<div class="log-note">${parts.join(" · ")}</div>`;
  }
  if (l.summary) details += `<div class="log-note">${esc(l.summary)}</div>`;
  if (l.reason) details += `<div class="log-note"><strong>Motivo:</strong> ${esc(l.reason)}</div>`;
  if (l.bulk) details += `<div class="log-note log-muted">Exclusão em lote</div>`;
  if (l.value != null && l.action !== "update" && l.entityType === "job") details += `<div class="log-note log-muted">Valor: ${money(l.value)}</div>`;

  return `<tr>
    <td style="white-space:nowrap;color:var(--text2);font-size:12px">${dt}</td>
    <td><span class="log-badge log-${esc(l.action)}">${esc(ACTION_LABEL[l.action] || l.action)}</span></td>
    <td><div class="log-entity">${esc(ent)}</div><div class="job-name log-name">${esc(name)}</div>${sub}</td>
    <td style="font-size:13px">${details || "—"}</td>
    <td style="font-size:12px">${esc(l.userName || l.userEmail || "—")}</td>
  </tr>`;
}

function paintLogs() {
  const tbody = document.getElementById("logsBody");
  if (!tbody) return;
  const list = logsCache.filter(l =>
    (fAction === "all" || l.action === fAction) &&
    (fEntity === "all" || l.entityType === fEntity));
  tbody.innerHTML = list.map(rowHtml).join("");
  document.getElementById("logsEmpty")?.classList.toggle("hidden", list.length > 0);
  const cnt = document.getElementById("logsCount");
  if (cnt) cnt.textContent = list.length ? `${list.length} registro(s)` : "";
}

function bindLogsUI() {
  if (uiBound) return;
  uiBound = true;
  document.querySelectorAll("#logActionPills .admin-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      fAction = btn.dataset.action;
      document.querySelectorAll("#logActionPills .admin-pill").forEach(b => b.classList.toggle("active", b === btn));
      paintLogs();
    });
  });
  document.getElementById("logEntityFilter")?.addEventListener("change", e => { fEntity = e.target.value; paintLogs(); });
}

export async function renderLogs(uid) {
  bindLogsUI();
  const tbody = document.getElementById("logsBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text2)">Carregando...</td></tr>`;
  document.getElementById("logsEmpty")?.classList.add("hidden");
  try {
    logsCache = await fetchLogs(uid);
    paintLogs();
  } catch (e) {
    console.error(e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text2)">Erro ao carregar o histórico.</td></tr>`;
  }
}
