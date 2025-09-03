import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { Request } from "express";
import busboy from "busboy";

// Verifica se o diretório de uploads existe e cria se não existir
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface UploadedFile {
  filename: string;
  mimeType: string;
  path: string;
  size: number;
}

export function processFileUpload(
  req: Request
): Promise<{ fields: Record<string, string>; files: Record<string, UploadedFile> }> {
  return new Promise((resolve, reject) => {
    // Cria um parser de formulário multipart
    const bb = busboy({ headers: req.headers });
    
    const fields: Record<string, string> = {};
    const files: Record<string, UploadedFile> = {};
    
    // Processa os campos de texto
    bb.on("field", (name, val) => {
      fields[name] = val;
    });
    
    // Processa os arquivos enviados
    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const uniqueFilename = `${Date.now()}-${randomBytes(8).toString("hex")}${path.extname(filename)}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);
      const chunks: Buffer[] = [];
      let fileSize = 0;
      
      // Limita o tamanho máximo do arquivo para 5MB
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      
      file.on("data", (data) => {
        fileSize += data.length;
        if (fileSize > MAX_FILE_SIZE) {
          file.removeAllListeners("data");
          file.removeAllListeners("end");
          reject(new Error("Arquivo muito grande. Limite é de 5MB."));
        } else {
          chunks.push(data);
        }
      });
      
      file.on("end", () => {
        // Verifica o tipo MIME (apenas imagens e vídeos são permitidos)
        if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
          reject(new Error("Tipo de arquivo não permitido. Apenas imagens e vídeos são aceitos."));
          return;
        }
        
        try {
          const buffer = Buffer.concat(chunks);
          writeFileSync(filePath, buffer);
          
          files[name] = {
            filename: uniqueFilename,
            mimeType,
            path: `/uploads/${uniqueFilename}`,
            size: fileSize,
          };
        } catch (err) {
          reject(err);
        }
      });
    });
    
    bb.on("finish", () => {
      resolve({ fields, files });
    });
    
    bb.on("error", (err) => {
      reject(err);
    });
    
    req.pipe(bb);
  });
}

export function getPublicFilePath(filename: string): string {
  return `/uploads/${filename}`;
}

export function getAbsoluteFilePath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}