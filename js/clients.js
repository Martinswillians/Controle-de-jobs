// ═══════════════════════════════════════════════
// clients.js — Cadastro de Clientes/Produtoras
// ═══════════════════════════════════════════════

import { db } from "./firebase-config.js?v=15";
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export let allClients = [];
let unsubClients = null;
let editingClientId = null;

const $ = id => document.getElementById(id);

// ─────────────────────────────────────────────
// SUBSCRIBE
// ─────────────────────────────────────────────
export function subscribeClients(uid, onUpdate) {
  if (unsubClients) unsubClients();
  const q = query(
    collection(db, "users", uid, "clients"),
    orderBy("name", "asc")
  );
  unsubClients = onSnapshot(q, snap => {
    allClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientsList();
    updateClientSelects();
    if (onUpdate) onUpdate(allClients);
  });
  return unsubClients;
}

export function unsubscribeClients() {
  if (unsubClients) { unsubClients(); unsubClients = null; }
}

// ─────────────────────────────────────────────
// RENDER LIST
// ─────────────────────────────────────────────
export function renderClientsList() {
  const list = $("clientsListBody");
  const empty = $("clientsEmpty");
  if (!list) return;

  const active = allClients.filter(c => c.status !== "inativo");
  const inactive = allClients.filter(c => c.status === "inativo");
  const sorted = [...active, ...inactive];

  list.innerHTML = "";
  if (sorted.length === 0) {
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  sorted.forEach(c => {
    const tr = document.createElement("tr");
    const isInativo = c.status === "inativo";
    tr.innerHTML = `
      <td>
        <div class="client-name ${isInativo ? 'inativo' : ''}">${c.name}</div>
        ${c.tradeName ? `<div class="client-sub">${c.tradeName}</div>` : ""}
      </td>
      <td class="client-cnpj">${formatCNPJ(c.cnpj) || "—"}</td>
      <td class="client-city">${c.city || "—"}</td>
      <td>${isInativo
        ? '<span class="badge badge-inativo">⚫ Inativo</span>'
        : '<span class="badge badge-ativo">🟢 Ativo</span>'
      }</td>
      <td>
        <div class="row-actions" style="opacity:1">
          <button class="row-btn" data-cedit="${c.id}" title="Editar">✏️</button>
          <button class="row-btn ${isInativo ? '' : 'delete'}" 
            data-ctoggle="${c.id}" 
            data-cstatus="${c.status || 'ativo'}"
            title="${isInativo ? 'Reativar' : 'Inativar'}">
            ${isInativo ? '♻️' : '🚫'}
          </button>
          <button class="row-btn delete" data-cdel="${c.id}" title="Excluir">🗑️</button>
        </div>
      </td>`;
    list.appendChild(tr);
  });

  // Bind actions
  list.querySelectorAll("[data-cedit]").forEach(btn => {
    btn.addEventListener("click", () => openClientModal(btn.dataset.cedit));
  });
  list.querySelectorAll("[data-ctoggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleClientStatus(btn.dataset.ctoggle, btn.dataset.cstatus));
  });
  list.querySelectorAll("[data-cdel]").forEach(btn => {
    btn.addEventListener("click", () => confirmDeleteClient(btn.dataset.cdel));
  });
}

// ─────────────────────────────────────────────
// UPDATE SELECTS (job modal + filters)
// ─────────────────────────────────────────────
export function updateClientSelects() {
  const activeClients = allClients.filter(c => c.status !== "inativo");

  // Job modal datalist
  const dl = $("clientsSuggestions");
  if (dl) {
    dl.innerHTML = activeClients.map(c => `<option value="${c.name}">`).join("");
  }

  // Filter select
  const fSel = $("filterClient");
  if (fSel) {
    const cur = fSel.value;
    fSel.innerHTML = '<option value="">Todos os clientes</option>';
    activeClients.forEach(c => {
      const o = document.createElement("option");
      o.value = c.name;
      o.textContent = c.name;
      fSel.appendChild(o);
    });
    fSel.value = cur;
  }
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
export function openClientModal(clientId = null) {
  editingClientId = clientId;
  $("clientModalTitle").textContent = clientId ? "Editar Cliente" : "Novo Cliente";

  if (clientId) {
    const c = allClients.find(x => x.id === clientId);
    if (!c) return;
    $("cName").value = c.name || "";
    $("cTradeName").value = c.tradeName || "";
    $("cCNPJ").value = c.cnpj || "";
    $("cEmail").value = c.email || "";
    $("cPhone").value = c.phone || "";
    $("cAddress").value = c.address || "";
    $("cCity").value = c.city || "";
    $("cState").value = c.state || "";
    $("cCEP").value = c.cep || "";
    $("cNotes").value = c.notes || "";
  } else {
    ["cName","cTradeName","cCNPJ","cEmail","cPhone","cAddress","cCity","cState","cCEP","cNotes"]
      .forEach(id => { const el = $(id); if(el) el.value = ""; });
    $("cState").value = "DF";
  }

  $("clientModal").classList.remove("hidden");
}

function closeClientModal() {
  $("clientModal").classList.add("hidden");
  editingClientId = null;
}

// ─────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────
export async function saveClient(uid, showToast, loading) {
  const name = $("cName").value.trim();
  if (!name) { showToast("Informe o nome do cliente.", "error"); return; }

  const data = {
    name,
    tradeName: $("cTradeName").value.trim(),
    cnpj: $("cCNPJ").value.trim(),
    email: $("cEmail").value.trim(),
    phone: $("cPhone").value.trim(),
    address: $("cAddress").value.trim(),
    city: $("cCity").value.trim(),
    state: $("cState").value,
    cep: $("cCEP").value.trim(),
    notes: $("cNotes").value.trim(),
    status: "ativo",
    updatedAt: new Date()
  };

  loading(true);
  try {
    if (editingClientId) {
      await updateDoc(doc(db, "users", uid, "clients", editingClientId), data);
      showToast("Cliente atualizado!");
    } else {
      data.createdAt = new Date();
      await addDoc(collection(db, "users", uid, "clients"), data);
      showToast("Cliente cadastrado!");
    }
    closeClientModal();
  } catch(e) {
    console.error(e);
    showToast("Erro ao salvar cliente.", "error");
  } finally { loading(false); }
}

async function toggleClientStatus(clientId, currentStatus) {
  const uid = window._currentUid;
  if (!uid) return;
  const newStatus = currentStatus === "inativo" ? "ativo" : "inativo";
  try {
    await updateDoc(doc(db, "users", uid, "clients", clientId), { status: newStatus });
  } catch(e) { console.error(e); }
}

async function confirmDeleteClient(clientId) {
  if (!confirm("Excluir este cliente? Esta ação não pode ser desfeita.")) return;
  const uid = window._currentUid;
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "clients", clientId));
  } catch(e) { console.error(e); }
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
export function formatCNPJ(v) {
  if (!v) return "";
  v = v.replace(/\D/g, "");
  if (v.length !== 14) return v;
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function getClientData(name) {
  return allClients.find(c => c.name === name) || null;
}

// ─────────────────────────────────────────────
// INIT EVENTS (called from app.js)
// ─────────────────────────────────────────────
export function initClientsEvents(uid, showToast, loading) {
  $("addClientBtn")?.addEventListener("click", () => openClientModal());
  $("closeClientModal")?.addEventListener("click", closeClientModal);
  $("cancelClientModal")?.addEventListener("click", closeClientModal);
  $("saveClientBtn")?.addEventListener("click", () => saveClient(uid, showToast, loading));

  // Export
  $("exportClientsBtn")?.addEventListener("click", () => exportClients(showToast));

  // Import
  $("importClientsBtn")?.addEventListener("click", () => $("importClientsFile")?.click());
  $("importClientsFile")?.addEventListener("change", (e) => handleImportFile(e, uid, showToast, loading));
  $("closeImportModal")?.addEventListener("click", closeImportModal);
  $("cancelImportModal")?.addEventListener("click", closeImportModal);

  // CNPJ mask
  $("cCNPJ")?.addEventListener("input", e => {
    let v = e.target.value.replace(/\D/g,"").slice(0,14);
    if (v.length > 12) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5");
    else if (v.length > 8) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d+)/,"$1.$2.$3/$4");
    else if (v.length > 5) v = v.replace(/(\d{2})(\d{3})(\d+)/,"$1.$2.$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/,"$1.$2");
    e.target.value = v;
  });

  // CEP mask
  $("cCEP")?.addEventListener("input", e => {
    let v = e.target.value.replace(/\D/g,"").slice(0,8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d+)/,"$1-$2");
    e.target.value = v;
  });
}

// ─────────────────────────────────────────────
// EXPORT CLIENTS
// ─────────────────────────────────────────────
function exportClients(showToast) {
  if (allClients.length === 0) {
    showToast("Nenhum cliente para exportar.", "error");
    return;
  }

  // Remove campos internos do Firestore antes de exportar
  const exportData = allClients.map(c => {
    const { id, ...rest } = c;
    return rest;
  });

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientes-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${allClients.length} clientes exportados!`);
}

// ─────────────────────────────────────────────
// IMPORT CLIENTS
// ─────────────────────────────────────────────
let importedClients = [];

function handleImportFile(e, uid, showToast, loading) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ""; // reset so same file can be re-selected

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      let data = [];

      if (file.name.endsWith(".json")) {
        data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido");
      } else if (file.name.endsWith(".csv")) {
        data = parseCSVClients(ev.target.result);
      } else {
        showToast("Formato não suportado. Use .json ou .csv exportado pelo app.", "error");
        return;
      }

      if (data.length === 0) {
        showToast("Nenhum cliente encontrado no arquivo.", "error");
        return;
      }

      importedClients = data;
      openImportModal(uid, showToast, loading);

    } catch (err) {
      console.error(err);
      showToast("Erro ao ler o arquivo. Verifique o formato.", "error");
    }
  };
  reader.readAsText(file, "UTF-8");
}

function parseCSVClients(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  }).filter(c => c.name || c.Nome);
}

function openImportModal(uid, showToast, loading) {
  $("importCount").textContent = importedClients.length;

  // Preview dos primeiros 3
  const preview = importedClients.slice(0, 3).map(c =>
    `<div class="import-preview-item">🏢 ${c.name || c.Nome || "Sem nome"}</div>`
  ).join("") + (importedClients.length > 3
    ? `<div class="import-preview-more">...e mais ${importedClients.length - 3}</div>`
    : "");
  $("importPreview").innerHTML = preview;

  // Bind buttons with current uid/showToast/loading context
  const mergeBtn = $("importMergeBtn");
  const replaceBtn = $("importReplaceBtn");

  // Clone to remove old listeners
  const newMerge = mergeBtn.cloneNode(true);
  const newReplace = replaceBtn.cloneNode(true);
  mergeBtn.parentNode.replaceChild(newMerge, mergeBtn);
  replaceBtn.parentNode.replaceChild(newReplace, replaceBtn);

  newMerge.addEventListener("click", () => doImport("merge", uid, showToast, loading));
  newReplace.addEventListener("click", () => doImport("replace", uid, showToast, loading));

  $("importClientsModal").classList.remove("hidden");
}

function closeImportModal() {
  $("importClientsModal").classList.add("hidden");
  importedClients = [];
}

async function doImport(mode, uid, showToast, loading) {
  if (!uid || importedClients.length === 0) return;
  loading(true);
  try {
    if (mode === "replace") {
      // Apaga todos os clientes existentes primeiro
      const delPromises = allClients.map(c =>
        deleteDoc(doc(db, "users", uid, "clients", c.id))
      );
      await Promise.all(delPromises);
    }

    // Nomes já existentes (para merge — evitar duplicatas)
    const existingNames = mode === "merge"
      ? allClients.map(c => c.name?.toLowerCase().trim())
      : [];

    let added = 0;
    let skipped = 0;

    for (const client of importedClients) {
      const name = (client.name || client.Nome || "").trim();
      if (!name) continue;

      if (mode === "merge" && existingNames.includes(name.toLowerCase())) {
        skipped++;
        continue;
      }

      await addDoc(collection(db, "users", uid, "clients"), {
        name,
        tradeName: client.tradeName || client["Nome Fantasia"] || "",
        cnpj: client.cnpj || client.CNPJ || "",
        email: client.email || client.Email || "",
        phone: client.phone || client.Telefone || "",
        address: client.address || client.Endereço || "",
        city: client.city || client.Cidade || "",
        state: client.state || client.Estado || "",
        cep: client.cep || client.CEP || "",
        notes: client.notes || client.Observações || "",
        status: client.status || "ativo",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      added++;
    }

    closeImportModal();
    const msg = mode === "replace"
      ? `${added} clientes importados com sucesso!`
      : `${added} adicionados${skipped > 0 ? `, ${skipped} ignorados (já existiam)` : ""}.`;
    showToast(msg);

  } catch (err) {
    console.error(err);
    showToast("Erro ao importar clientes.", "error");
  } finally { loading(false); }
}
