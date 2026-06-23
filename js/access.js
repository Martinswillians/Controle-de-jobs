// ═══════════════════════════════════════════════
// access.js — Controle de Acesso / Demo / Admin
// ═══════════════════════════════════════════════

import { db } from "./firebase-config.js?v=15";
import {
  doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// UID do admin master — coloque o seu UID do Firebase aqui após primeiro login
// Para descobrir: abra o console do browser após logar e execute: 
//   firebase.auth().currentUser.uid  ou veja no Firebase Console > Authentication
export const ADMIN_UID = "w9XSwxwewTaXwk0hCpyOuvCcd7G3";

const DEMO_DAYS = 5;

// ─────────────────────────────────────────────
// CHECK ACCESS
// Retorna: { allowed: bool, reason: string, daysLeft: number|null, isAdmin: bool }
// ─────────────────────────────────────────────
export async function checkAccess(uid) {
  if (uid === ADMIN_UID) return { allowed: true, isAdmin: true, reason: "admin" };

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { allowed: false, reason: "no_profile" };

  const data = snap.data();

  // Acesso aprovado pelo admin
  if (data.accessStatus === "approved") {
    return { allowed: true, isAdmin: false, reason: "approved" };
  }

  // Bloqueado pelo admin
  if (data.accessStatus === "blocked") {
    return { allowed: false, reason: "blocked" };
  }

  // Demo: verifica dias restantes
  const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now());
  const now = new Date();
  const diffMs = now - createdAt;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.ceil(DEMO_DAYS - diffDays);

  if (daysLeft > 0) {
    return { allowed: true, isAdmin: false, reason: "demo", daysLeft };
  }

  return { allowed: false, reason: "demo_expired" };
}

// ─────────────────────────────────────────────
// SHOW ACCESS SCREEN
// ─────────────────────────────────────────────
export function showAccessBlocked(reason, onLogout) {
  const msgs = {
    blocked: { icon: "🚫", title: "Acesso bloqueado", text: "Sua conta foi bloqueada pelo administrador. Entre em contato para mais informações." },
    demo_expired: { icon: "⏰", title: "Período demo encerrado", text: `Seu período de teste de ${DEMO_DAYS} dias encerrou. Entre em contato com o administrador para liberar seu acesso completo.` },
    no_profile: { icon: "⚠️", title: "Perfil não encontrado", text: "Houve um problema com seu perfil. Tente fazer login novamente." }
  };
  const m = msgs[reason] || msgs.no_profile;

  // Create or reuse blocked screen
  let screen = document.getElementById("blockedScreen");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "blockedScreen";
    screen.style.cssText = `
      position:fixed;inset:0;background:#0f0f14;display:flex;align-items:center;
      justify-content:center;z-index:9999;padding:24px;
    `;
    document.body.appendChild(screen);
  }

  screen.innerHTML = `
    <div style="max-width:400px;text-align:center;background:#17171f;border:1px solid #2a2a38;
                border-radius:16px;padding:40px 32px;">
      <div style="font-size:56px;margin-bottom:16px">${m.icon}</div>
      <h2 style="color:#e8e8f0;font-size:20px;margin-bottom:12px">${m.title}</h2>
      <p style="color:#9090b0;line-height:1.6;margin-bottom:28px">${m.text}</p>
      <button onclick="window._accessLogout()" style="
        background:#7c6af7;color:#fff;border:none;padding:12px 28px;
        border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;
        font-family:inherit;width:100%
      ">Sair da conta</button>
    </div>`;

  screen.style.display = "flex";
  window._accessLogout = onLogout;
}

export function hideAccessBlocked() {
  const s = document.getElementById("blockedScreen");
  if (s) s.style.display = "none";
}

// ─────────────────────────────────────────────
// DEMO BANNER
// ─────────────────────────────────────────────
export function showDemoBanner(daysLeft) {
  let banner = document.getElementById("demoBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "demoBanner";
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;
      background:linear-gradient(135deg,#f39c12,#e67e22);
      color:#fff;text-align:center;padding:10px 16px;
      font-size:13px;font-weight:600;z-index:500;
      display:flex;align-items:center;justify-content:center;gap:12px;
    `;
    document.body.appendChild(banner);
  }
  const day = daysLeft === 1 ? "dia" : "dias";
  banner.innerHTML = `
    ⏰ Você está no período demo — <strong>${daysLeft} ${day} restante${daysLeft > 1 ? 's' : ''}</strong>.
    Contate o admin para liberar acesso completo.
    <button onclick="document.getElementById('demoBanner').style.display='none'"
      style="background:rgba(0,0,0,0.2);border:none;color:#fff;padding:4px 10px;
             border-radius:6px;cursor:pointer;font-size:12px;margin-left:8px">✕</button>
  `;
  banner.style.display = "flex";
}

// ─────────────────────────────────────────────
// ADMIN PANEL — listar usuários
// ─────────────────────────────────────────────
export function initAdminPanel(currentUid) {
  if (currentUid !== ADMIN_UID) return;

  // Show admin nav item
  const nav = document.querySelector(".nav-menu");
  if (nav && !document.querySelector("[data-page='admin']")) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#" class="nav-link" data-page="admin">👑 Admin</a>`;
    nav.appendChild(li);
    li.querySelector("[data-page='admin']").addEventListener("click", e => {
      e.preventDefault();
      window._navigateTo("admin");
    });
  }

  // Subscribe to all users
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._allAdminUsers = users;
    const currentFilter = document.querySelector(".admin-pill.active")?.dataset.filter || "all";
    renderAdminPage(users, currentFilter);
  });
}

function renderAdminPage(users, filter = "all") {
  const page = document.getElementById("page-admin");
  if (!page) return;

  // Calcula status de cada usuário uma vez
  const enriched = users.map(u => {
    const createdAt = u.createdAt?.toDate?.() || new Date(u.createdAt || 0);
    const diffDays = (new Date() - createdAt) / (1000*60*60*24);
    const demoLeft = Math.ceil(3 - diffDays);
    let statusKey = "demo";
    if (u.accessStatus === "approved") statusKey = "approved";
    else if (u.accessStatus === "blocked") statusKey = "blocked";
    else if (demoLeft <= 0) statusKey = "expired";
    return { ...u, createdAt, demoLeft, statusKey };
  });

  const counts = {
    all: enriched.length,
    demo: enriched.filter(u => u.statusKey === "demo").length,
    expired: enriched.filter(u => u.statusKey === "expired").length,
    approved: enriched.filter(u => u.statusKey === "approved").length,
    blocked: enriched.filter(u => u.statusKey === "blocked").length,
  };

  const filtered = filter === "all"
    ? enriched
    : filter === "pending"
      ? enriched.filter(u => u.statusKey === "demo" || u.statusKey === "expired")
      : enriched.filter(u => u.statusKey === filter);

  const pillBtn = (key, label, count) => `
    <button class="admin-pill ${filter === key ? 'active' : ''}" data-filter="${key}">
      ${label} <span class="admin-pill-count">${count}</span>
    </button>`;

  page.innerHTML = `
    <div class="page-header"><h2>👑 Painel Admin</h2></div>
    <div class="section-card">
      <div class="admin-pills">
        ${pillBtn("all", "Todos", counts.all)}
        ${pillBtn("pending", "⏰ Pendentes", counts.demo + counts.expired)}
        ${pillBtn("approved", "✅ Aprovados", counts.approved)}
        ${pillBtn("blocked", "🚫 Bloqueados", counts.blocked)}
      </div>
      <h3>Usuários ${filter !== "all" ? "filtrados" : "cadastrados"} (${filtered.length})</h3>
      <div class="table-wrap">
        <table class="jobs-table">
          <thead><tr>
            <th>Nome</th><th>E-mail</th><th>Profissão</th>
            <th>Cadastro</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${filtered.map(u => {
              let statusBadge = "";
              if (u.statusKey === "approved") {
                statusBadge = '<span class="badge badge-pago">✅ Aprovado</span>';
              } else if (u.statusKey === "blocked") {
                statusBadge = '<span class="badge badge-inativo">🚫 Bloqueado</span>';
              } else if (u.statusKey === "demo") {
                statusBadge = `<span class="badge badge-pendente">⏰ Demo (${u.demoLeft}d)</span>`;
              } else {
                statusBadge = '<span class="badge badge-inativo">⏰ Demo expirado</span>';
              }
              return `<tr>
                <td><strong>${u.name || "—"}</strong></td>
                <td style="font-size:12px;color:var(--text2)">${u.email || "—"}</td>
                <td style="font-size:12px">${u.profession || "—"}</td>
                <td style="font-size:12px;color:var(--text2)">${u.createdAt.toLocaleDateString("pt-BR")}</td>
                <td>${statusBadge}</td>
                <td>
                  <div class="row-actions" style="opacity:1;flex-wrap:wrap;gap:4px">
                    ${u.accessStatus !== "approved" ? `
                      <button class="row-btn" onclick="window._approveUser('${u.id}')" title="Aprovar">✅</button>
                    ` : ""}
                    ${u.accessStatus !== "blocked" ? `
                      <button class="row-btn delete" onclick="window._blockUser('${u.id}')" title="Bloquear">🚫</button>
                    ` : `
                      <button class="row-btn" onclick="window._approveUser('${u.id}')" title="Desbloquear">♻️</button>
                    `}
                  </div>
                </td>
              </tr>`;
            }).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:24px">Nenhum usuário neste filtro.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

  // Bind filter pills
  page.querySelectorAll(".admin-pill").forEach(btn => {
    btn.addEventListener("click", () => renderAdminPage(window._allAdminUsers, btn.dataset.filter));
  });
}

export function initAdminActions() {
  window._approveUser = async (uid) => {
    await updateDoc(doc(db, "users", uid), { accessStatus: "approved" });
  };
  window._blockUser = async (uid) => {
    await updateDoc(doc(db, "users", uid), { accessStatus: "blocked" });
  };
}
