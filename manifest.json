// ═══════════════════════════════════════════════
// cloudinary.js — Upload de PDFs (Notas Fiscais)
// ═══════════════════════════════════════════════
// Usa Cloudinary com "unsigned upload" — gratuito, sem backend.
// ⚠️ CONFIGURE ABAIXO com sua conta Cloudinary (veja README.md)

const CLOUDINARY_CLOUD_NAME = "ddsh6gzur";
const CLOUDINARY_UPLOAD_PRESET = "octhjw1m";

const MAX_PDF_SIZE_MB = 5;

/**
 * Faz upload de um arquivo PDF para o Cloudinary.
 * @param {File} file - arquivo PDF selecionado
 * @param {string} uid - uid do usuário (usado para organizar em pastas)
 * @param {function} onProgress - callback(percent) chamado durante o upload
 * @returns {Promise<{url:string, publicId:string, bytes:number}>}
 */
export async function uploadPDF(file, uid, onProgress) {
  if (!file) throw new Error("Nenhum arquivo selecionado.");
  if (file.type !== "application/pdf") throw new Error("Apenas arquivos PDF são permitidos.");
  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    throw new Error(`O arquivo deve ter no máximo ${MAX_PDF_SIZE_MB}MB.`);
  }

  if (CLOUDINARY_CLOUD_NAME === "SEU_CLOUD_NAME") {
    throw new Error("Upload de PDF não configurado. Veja o README para configurar o Cloudinary.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `controle-de-job/${uid}`);
  formData.append("resource_type", "auto");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            bytes: data.bytes
          });
        } catch (e) {
          reject(new Error("Erro ao processar resposta do upload."));
        }
      } else {
        let msg = "Erro ao enviar o PDF.";
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error?.message) msg = err.error.message;
        } catch (e) {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de conexão ao enviar o PDF."));
    xhr.send(formData);
  });
}

export function isCloudinaryConfigured() {
  return CLOUDINARY_CLOUD_NAME !== "SEU_CLOUD_NAME";
}
