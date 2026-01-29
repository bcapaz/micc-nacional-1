export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024; // Reduz largura para HD
        const scaleSize = MAX_WIDTH / img.width;
        
        // Se a imagem for pequena, não mexe
        if (scaleSize >= 1) {
             resolve(file); 
             return;
        }

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            reject(new Error("Falha ao criar canvas"));
            return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Converte para JPEG com 70% de qualidade
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            console.log(`📉 [COMPRESS] ${file.size} -> ${newFile.size} bytes`);
            resolve(newFile);
          } else {
            reject(new Error("Falha na compressão"));
          }
        }, "image/jpeg", 0.7); 
      };
      
      img.onerror = (err) => reject(err);
    };
    
    reader.onerror = (err) => reject(err);
  });
}
