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

### 4. Configurar o Cloudinary (upload de PDFs de NF)

O app usa o **Cloudinary** para armazenar os PDFs das notas fiscais — totalmente gratuito, sem precisar do plano pago do Firebase Storage.

1. Crie uma conta gratuita em **[cloudinary.com](https://cloudinary.com/users/register/free)**
2. No painel, anote seu **Cloud Name** (aparece no topo do Dashboard)
3. Vá em **Settings** (ícone de engrenagem) → aba **Upload**
4. Em "Upload presets", clique **Add upload preset**
5. Configure:
   - **Signing Mode**: troque para **Unsigned**
   - **Folder**: deixe em branco (o app já organiza por pasta automaticamente)
   - Salve e copie o **nome do preset** gerado
6. Ainda em Settings, vá na aba **Security**
7. Role até **"PDF and ZIP files delivery"** e marque **"Allow delivery of PDF and ZIP files"**
8. Aceite os termos e salve

Agora abra o arquivo `js/cloudinary.js` e substitua:

```js
const CLOUDINARY_CLOUD_NAME = "SEU_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "SEU_UPLOAD_PRESET";
```

Pelos valores reais que você copiou.

⚠️ **Importante sobre segurança**: como o upload é "unsigned" (sem assinatura de servidor), qualquer pessoa com o link do seu preset tecnicamente poderia enviar arquivos para sua conta Cloudinary. Isso é aceitável para um app pessoal/pequeno, mas evite divulgar publicamente as credenciais do Cloudinary. O plano gratuito tem limite de 25GB de armazenamento e 25GB de banda por mês — mais que suficiente para notas fiscais.

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
