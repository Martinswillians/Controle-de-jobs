# 🎬 Controle de Job

Aplicativo de gestão financeira para freelancers de audiovisual.

---

## ✅ Funcionalidades

- 📋 Cadastro de jobs com data, cliente, valor e status
- 🎨 4 status com cores: Pendente / Pago / Pago + NF / Pago + NF + PDF
- 🧾 Controle de Notas Fiscais com upload de PDF
- 💰 Dashboard financeiro mensal e anual
- 📈 Relatórios com gráficos (por mês, cliente, status)
- ⚠️ Controle de Limite MEI com alertas em 70%, 85% e 95%
- 🔎 Filtros por mês, cliente, status e NF
- 📊 Exportação para Excel, PDF e CSV
- 📱 PWA — instala como app no celular

---

## 🚀 Como configurar

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto**
3. Dê um nome (ex: `controle-de-job`) e siga os passos
4. Ative o plano **Spark (gratuito)** ou Blaze para Storage

### 2. Configurar Authentication

1. No Firebase Console → **Authentication** → Começar
2. Ative o provedor **E-mail/Senha**

### 3. Criar o Firestore Database

1. No Firebase Console → **Firestore Database** → Criar banco de dados
2. Selecione **Modo de produção**
3. Escolha a região (sugestão: `southamerica-east1` — São Paulo)
4. Após criar, vá em **Regras** e cole o conteúdo de `firestore.rules`

### 4. Configurar o Storage

1. No Firebase Console → **Storage** → Começar
2. Aceite as regras padrão
3. Após criar, vá em **Regras** e cole o conteúdo de `storage.rules`

### 5. Adicionar configuração no app

1. No Firebase Console → ⚙️ **Configurações do projeto**
2. Em "Seus apps", clique em **</>** (Web)
3. Registre o app e copie o objeto `firebaseConfig`
4. Abra o arquivo `js/firebase-config.js` e substitua:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

---

## 🌐 Hospedar no GitHub Pages

1. Crie um repositório no GitHub (ex: `controle-de-job`)
2. Faça upload de todos os arquivos desta pasta
3. Vá em **Settings** → **Pages**
4. Selecione **Deploy from a branch** → `main` → `/root`
5. Seu app estará em: `https://seuusuario.github.io/controle-de-job`

⚠️ **Importante**: No Firebase Console → Authentication → **Domínios autorizados**, adicione:
`seuusuario.github.io`

---

## 🔥 Hospedar no Firebase Hosting (alternativa)

```bash
# Instale o Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicialize na pasta do projeto
firebase init hosting

# Deploy
firebase deploy
```

---

## 📱 Instalar como App (PWA)

- **Android**: Abra no Chrome → menu → "Adicionar à tela inicial"
- **iPhone**: Abra no Safari → compartilhar → "Adicionar à tela de início"
- **Desktop**: Chrome mostra ícone de instalação na barra de endereço

---

## 🔒 Segurança

- Cada usuário vê **apenas seus próprios jobs**
- Os dados ficam isolados por UID no Firestore
- Os PDFs de NF ficam no Storage, acessíveis só pelo dono

---

## 📁 Estrutura de arquivos

```
controle-de-job/
├── index.html          # App principal (tela única)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline)
├── firestore.rules     # Regras de segurança do Firestore
├── storage.rules       # Regras de segurança do Storage
├── css/
│   └── style.css       # Estilos completos
└── js/
    ├── firebase-config.js  # ⚠️ Configure aqui
    └── app.js              # Lógica do app
```
