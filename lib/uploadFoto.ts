/**
 * Utilitário para compressão de imagem no client-side.
 *
 * Abordagem: converte a imagem para Base64 (data URL) armazenada diretamente
 * no Firestore, eliminando a necessidade do Firebase Storage.
 */

/**
 * Tamanho máximo do arquivo original em bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Dimensão máxima do lado maior da imagem comprimida
 */
const MAX_DIMENSION = 512;

/**
 * Qualidade JPEG para compressão (0.0 a 1.0)
 */
const JPEG_QUALITY = 0.7;

/**
 * Comprime uma imagem no client:
 * - Redimensiona para no máximo MAX_DIMENSION x MAX_DIMENSION (mantendo proporção)
 * - Converte para JPEG com qualidade JPEG_QUALITY
 * Retorna um data URL (base64) pronto para ser salvo no Firestore e usado em <img src>.
 */
function comprimirImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Redimensionar mantendo proporção
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível criar contexto de canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Converter para data URL (base64)
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem para compressão"));
    };

    img.src = url;
  });
}

/**
 * Valida se o arquivo é uma imagem e se não excede o tamanho máximo.
 */
function validarArquivo(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "O arquivo selecionado não é uma imagem válida.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
  }

  return null;
}

/**
 * Processa uma foto de perfil: valida, comprime e retorna como data URL (base64).
 *
 * A string retornada pode ser usada diretamente em <img src="..."> e salva
 * como campo string no Firestore (sem necessidade do Firebase Storage).
 *
 * @param file - Arquivo de imagem selecionado pelo usuário
 * @returns Data URL base64 da imagem comprimida (ex: "data:image/jpeg;base64,...")
 *
 * Fluxo:
 * 1. Valida tipo e tamanho do arquivo
 * 2. Comprime a imagem (max 512x512, JPEG 70%)
 * 3. Retorna o data URL base64
 */
export async function processarFoto(file: File): Promise<string> {
  // Validar
  const erro = validarArquivo(file);
  if (erro) {
    throw new Error(erro);
  }

  // Comprimir e converter para base64
  const dataUrl = await comprimirImagem(file);
  return dataUrl;
}
