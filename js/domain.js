// ═══════════════════════════════════════════════
// domain.js — Profissões, Ramo de trabalho e Ganho por job/serviço
// ═══════════════════════════════════════════════
// • Lista de profissões (fixa + colaborativa, salva em /professions no Firestore)
// • Ramo de trabalho: "audiovisual" (usa "Job") ou "servicos" (usa "Serviço")
// • Cálculo de quanto o usuário ganha em cada job/serviço (fixo ou percentual)

import { db } from "./firebase-config.js";
import {
  collection, doc, getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─────────────────────────────────────────────
// PROFISSÕES
// ─────────────────────────────────────────────
export const OTHER_VALUE = "__outro__";

// branch = ramo sugerido para quem escolhe essa profissão no cadastro
export const BASE_PROFESSIONS = [
  // Audiovisual
  { name: "Videomaker", group: "Audiovisual", branch: "audiovisual" },
  { name: "Operador de Câmera", group: "Audiovisual", branch: "audiovisual" },
  { name: "Assistente de Câmera", group: "Audiovisual", branch: "audiovisual" },
  { name: "Fotógrafo", group: "Audiovisual", branch: "audiovisual" },
  { name: "Editor de Vídeo", group: "Audiovisual", branch: "audiovisual" },
  { name: "Motion Designer", group: "Audiovisual", branch: "audiovisual" },
  { name: "Técnico de Som", group: "Audiovisual", branch: "audiovisual" },
  { name: "Iluminador", group: "Audiovisual", branch: "audiovisual" },
  { name: "Diretor", group: "Audiovisual", branch: "audiovisual" },
  { name: "Produtor", group: "Audiovisual", branch: "audiovisual" },
  { name: "Roteirista", group: "Audiovisual", branch: "audiovisual" },
  // Escritório / administrativo
  { name: "Administrativo", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Assistente Administrativo", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Secretária(o)", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Recepcionista", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Auxiliar de Escritório", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Contador", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Consultor", group: "Administrativo e escritório", branch: "servicos" },
  { name: "Tradutor", group: "Administrativo e escritório", branch: "servicos" },
  // Criação e tecnologia
  { name: "Designer Gráfico", group: "Criação e tecnologia", branch: "servicos" },
  { name: "Desenvolvedor", group: "Criação e tecnologia", branch: "servicos" },
  { name: "Social Media", group: "Criação e tecnologia", branch: "servicos" },
  { name: "Técnico de Informática", group: "Criação e tecnologia", branch: "servicos" },
  // Serviços gerais e técnicos
  { name: "Dedetizador", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Eletricista", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Encanador", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Pedreiro", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Pintor", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Jardineiro", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Diarista / Limpeza", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Técnico de Ar-condicionado", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Mecânico", group: "Serviços gerais e técnicos", branch: "servicos" },
  { name: "Motorista", group: "Serviços gerais e técnicos", branch: "servicos" },
  // Beleza, saúde e ensino
  { name: "Cabeleireiro(a)", group: "Beleza, saúde e ensino", branch: "servicos" },
  { name: "Manicure", group: "Beleza, saúde e ensino", branch: "servicos" },
  { name: "Massoterapeuta", group: "Beleza, saúde e ensino", branch: "servicos" },
  { name: "Personal Trainer", group: "Beleza, saúde e ensino", branch: "servicos" },
  { name: "Professor / Instrutor", group: "Beleza, saúde e ensino", branch: "servicos" }
];

let customProfessions = []; // nomes adicionados por usuários (coleção /professions)
let customLoaded = false;

export function normName(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function slugId(name) {
  return normName(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function cleanProfessionName(s) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

function isKnownProfession(name) {
  const n = normName(name);
  return BASE_PROFESSIONS.some(p => normName(p.name) === n) ||
         customProfessions.some(p => normName(p) === n);
}

export async function loadCustomProfessions() {
  if (customLoaded) return customProfessions;
  try {
    const snap = await getDocs(collection(db, "professions"));
    customProfessions = snap.docs
      .map(d => String(d.data().name || "").trim())
      .filter(Boolean)
      .filter(n => !BASE_PROFESSIONS.some(p => normName(p.name) === normName(n)))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    customLoaded = true;
  } catch (e) {
    // Regras ainda não publicadas ou sem rede: segue só com a lista fixa
    console.warn("Não foi possível carregar profissões adicionais:", e);
  }
  return customProfessions;
}

function opt(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

// Monta o <select> de profissões (sem innerHTML: nomes digitados por usuários não viram HTML)
export function buildProfessionSelect(select, { current = "", withPlaceholder = false } = {}) {
  if (!select) return;
  select.innerHTML = "";
  if (withPlaceholder) select.appendChild(opt("", "Selecione..."));

  const groups = [];
  BASE_PROFESSIONS.forEach(p => {
    let g = groups.find(x => x.label === p.group);
    if (!g) { g = { label: p.group, items: [] }; groups.push(g); }
    g.items.push(p.name);
  });
  if (customProfessions.length) groups.push({ label: "Adicionadas por usuários", items: customProfessions });

  groups.forEach(g => {
    const og = document.createElement("optgroup");
    og.label = g.label;
    g.items.forEach(n => og.appendChild(opt(n, n)));
    select.appendChild(og);
  });

  // Profissão já salva no perfil que não está em nenhuma lista (ex.: texto livre antigo)
  if (current && !isKnownProfession(current)) {
    const og = document.createElement("optgroup");
    og.label = "Sua profissão";
    og.appendChild(opt(current, current));
    select.insertBefore(og, select.firstChild.nextSibling || null);
  }

  select.appendChild(opt(OTHER_VALUE, "✏️ Outro (informar)"));
  if (current) select.value = current;
}

// Mostra o campo de texto quando "Outro" é escolhido
export function bindProfessionOther(select, otherInput) {
  if (!select || !otherInput) return;
  const sync = () => {
    const isOther = select.value === OTHER_VALUE;
    otherInput.classList.toggle("hidden", !isOther);
    if (isOther) otherInput.focus();
  };
  select.addEventListener("change", sync);
  sync();
}

// Lê o que o usuário escolheu. Retorna { name } ou { error }
export function resolveProfession(select, otherInput) {
  if (select.value === OTHER_VALUE) {
    const name = cleanProfessionName(otherInput.value);
    if (name.length < 2) return { error: "Informe qual é a sua profissão." };
    return { name, custom: true };
  }
  if (!select.value) return { error: "Selecione a profissão." };
  return { name: select.value, custom: false };
}

// Inclui a profissão digitada na lista compartilhada (se ainda não existir)
export async function addProfessionToDomain(name, uid) {
  const clean = cleanProfessionName(name);
  if (clean.length < 2 || isKnownProfession(clean)) return false;
  try {
    await setDoc(doc(db, "professions", slugId(clean)), { name: clean, createdAt: new Date(), createdBy: uid || "" });
    customProfessions = [...customProfessions, clean].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return true;
  } catch (e) {
    console.warn("Não foi possível incluir a profissão na lista:", e);
    return false;
  }
}

export function branchForProfession(name) {
  const p = BASE_PROFESSIONS.find(x => normName(x.name) === normName(name));
  return p ? p.branch : "servicos";
}

// ─────────────────────────────────────────────
// RAMO DE TRABALHO
// ─────────────────────────────────────────────
export const BRANCHES = {
  audiovisual: { label: "Audiovisual / Gravações", hint: "Controle de jobs", icon: "🎬" },
  servicos:    { label: "Prestação de Serviços",   hint: "Controle de serviços (ex.: dedetização)", icon: "🛠️" }
};

const BRANCH_KEY = "cdj_branch";
let currentBranch = "audiovisual";
let earningsEnabled = false;
let defaultEarning = { mode: "total", amount: 0 };

export const TERM = { Job: "Job", Jobs: "Jobs", job: "job", jobs: "jobs" };

export function getBranch() { return currentBranch; }
export function isEarningsEnabled() { return earningsEnabled; }
export function getDefaultEarning() { return { ...defaultEarning }; }

// Troca de termos: "job" e "serviço" têm o mesmo gênero, então a troca é direta
const RULES = [
  [/Controle de Job\b/g, "Controle de Serviços"],
  [/Produtora \/ Cliente/g, "Cliente"],
  [/\bJobs\b/g, "Serviços"],
  [/\bjobs\b/g, "serviços"],
  [/\bJob\b/g, "Serviço"],
  [/\bjob\b/g, "serviço"]
];

export function translateText(str) {
  if (currentBranch !== "servicos" || !str) return str;
  let out = str;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}

// Conteúdo digitado pelo usuário (nomes de jobs, clientes, observações) nunca é traduzido
const SKIP_SEL = ".job-name,.job-client,.client-name,.log-name,.bulk-delete-list,.job-notes,[data-notranslate],script,style,textarea,input,option";
const ATTRS = ["placeholder", "title", "aria-label"];

function translateNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (p && p.closest(SKIP_SEL)) return;
    const t = translateText(node.nodeValue);
    if (t !== node.nodeValue) node.nodeValue = t;
    return;
  }
  if (node.nodeType !== 1) return;
  if (node.matches(SKIP_SEL) || node.closest(SKIP_SEL)) return;
  for (const a of ATTRS) {
    if (node.hasAttribute(a)) {
      const v = node.getAttribute(a);
      const t = translateText(v);
      if (t !== v) node.setAttribute(a, t);
    }
  }
  node.childNodes.forEach(translateNode);
}

let observer = null;
function startObserver() {
  if (observer || !document.body) return;
  observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(translateNode);
      else if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
    }
  });
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ATTRS
  });
}
function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

export function applyBranch(branch) {
  currentBranch = BRANCHES[branch] ? branch : "audiovisual";
  try { localStorage.setItem(BRANCH_KEY, currentBranch); } catch (e) { /* ignora */ }

  const sv = currentBranch === "servicos";
  TERM.Job = sv ? "Serviço" : "Job";
  TERM.Jobs = sv ? "Serviços" : "Jobs";
  TERM.job = sv ? "serviço" : "job";
  TERM.jobs = sv ? "serviços" : "jobs";

  const logo = document.querySelector(".sidebar-logo");
  if (logo) logo.textContent = BRANCHES[currentBranch].icon;

  if (sv) {
    document.title = "Controle de Serviços";
    if (document.body) { translateNode(document.body); startObserver(); }
    const n = document.getElementById("jobName");
    if (n) n.placeholder = "Ex: Dedetização residencial";
    const c = document.getElementById("jobClient");
    if (c) c.placeholder = "Ex: João Silva";
  } else {
    stopObserver();
  }
}

// Define ramo + opções de ganho a partir do perfil do usuário
export function setWorkProfile({ branch, trackEarnings, defaultEarning: de } = {}) {
  const b = BRANCHES[branch] ? branch : "audiovisual";
  earningsEnabled = typeof trackEarnings === "boolean" ? trackEarnings : b === "servicos";
  defaultEarning = (de && ["fixo", "percentual"].includes(de.mode))
    ? { mode: de.mode, amount: Number(de.amount) || 0 }
    : { mode: "total", amount: 0 };
  applyBranch(b);
}

// Evita o "piscar" de textos em "Job" para quem usa o ramo de serviços
try {
  if (localStorage.getItem(BRANCH_KEY) === "servicos") applyBranch("servicos");
} catch (e) { /* ignora */ }

// ─────────────────────────────────────────────
// TIPO DE EMPRESA E LIMITES DE FATURAMENTO
// ─────────────────────────────────────────────
// Valores padrão (conferidos em nov/2026). O usuário pode sobrescrever o limite de cada tipo
// em Configurações caso a lei mude — o valor personalizado vale no lugar do padrão.
export const COMPANY_TYPES = {
  mei:      { short: "MEI",      label: "MEI — Microempreendedor Individual", cnpjLabel: "Número CNPJ MEI",            hasDefaultLimit: true },
  me:       { short: "ME",       label: "ME — Microempresa",                  cnpjLabel: "CNPJ da empresa",            hasDefaultLimit: true },
  epp:      { short: "EPP",      label: "EPP — Empresa de Pequeno Porte",     cnpjLabel: "CNPJ da empresa",            hasDefaultLimit: true },
  sa:       { short: "S.A.",     label: "S.A. — Sociedade Anônima",           cnpjLabel: "CNPJ da empresa",            hasDefaultLimit: false },
  autonomo: { short: "Autônomo", label: "Autônomo (pessoa física)",           cnpjLabel: "CPF ou CNPJ (opcional)",     hasDefaultLimit: false }
};

// MEI: R$ 81 mil até 2026 · R$ 110 mil em 2027 · R$ 140 mil a partir de 2028 (lei sancionada em 21/10/2026)
// ME: até R$ 360 mil · EPP: até R$ 4,8 milhões (limites do Simples Nacional, sem alteração)
// S.A. e autônomo: não há teto de faturamento por tipo de empresa
export function defaultLimitFor(type, year = new Date().getFullYear()) {
  if (type === "mei") return year >= 2028 ? 140000 : year === 2027 ? 110000 : 81000;
  if (type === "me") return 360000;
  if (type === "epp") return 4800000;
  return null;
}

let companyType = "mei";
let customLimits = {};

export function setCompanyProfile({ companyType: t, customLimits: c } = {}) {
  companyType = COMPANY_TYPES[t] ? t : "mei"; // quem já usava o app continua como MEI
  customLimits = c && typeof c === "object" ? { ...c } : {};
}
export function getCompanyType() { return companyType; }
export function companyInfo(type = companyType) { return COMPANY_TYPES[type] || COMPANY_TYPES.mei; }

export function customLimitFor(type = companyType) {
  const v = Number(customLimits[type]);
  return v > 0 ? v : null;
}
// Limite anual em vigor: o personalizado, se houver; senão o padrão do tipo/ano. null = sem teto.
export function getLimit(year = new Date().getFullYear(), type = companyType) {
  return customLimitFor(type) ?? defaultLimitFor(type, year);
}

const brl = n => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function limitScheduleText(type = companyType) {
  if (type === "mei") return `Padrão: ${brl(81000)} até 2026 · ${brl(110000)} em 2027 · ${brl(140000)} a partir de 2028.`;
  if (type === "me") return `Padrão: até ${brl(360000)} de receita bruta por ano (Simples Nacional).`;
  if (type === "epp") return `Padrão: acima de ${brl(360000)} e até ${brl(4800000)} por ano (Simples Nacional).`;
  return "Não há teto de faturamento para este tipo. Se quiser acompanhar uma meta anual, informe o valor.";
}

// Nome do limite nas telas: "Limite MEI", "Meta anual" (S.A./autônomo com meta) ou "Faturamento"
export function limitName(type = companyType) {
  const info = companyInfo(type);
  if (info.hasDefaultLimit) return `Limite ${info.short}`;
  return customLimitFor(type) ? "Meta anual" : "Faturamento";
}

export function limitTip(type = companyType) {
  if (type === "mei") return "Ultrapassar o teto exige migrar para ME — fale com seu contador.";
  if (type === "me") return "Acima do limite de ME a empresa passa a ser EPP — fale com seu contador.";
  if (type === "epp") return "Acima do limite do Simples Nacional mudam o regime e os impostos — fale com seu contador.";
  return "Você está chegando perto da meta que definiu.";
}

// ─────────────────────────────────────────────
// GANHO POR JOB / SERVIÇO
// job.earning = null (ganha o valor total) | { mode: "fixo" | "percentual", amount }
// ─────────────────────────────────────────────
export function hasEarningRule(job) {
  return !!job && !!job.earning && ["fixo", "percentual"].includes(job.earning.mode) && Number(job.earning.amount) > 0;
}

export function earningFor(value, rule) {
  const v = Number(value) || 0;
  if (!rule || !["fixo", "percentual"].includes(rule.mode)) return v;
  const a = Number(rule.amount) || 0;
  if (rule.mode === "fixo") return Math.round(a * 100) / 100;
  return Math.round(v * a) / 100; // v * (a/100) com 2 casas
}

export function earningOf(job) {
  return hasEarningRule(job) ? earningFor(job.value, job.earning) : Number(job?.value || 0);
}
