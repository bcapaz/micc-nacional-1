import "dotenv/config";
import express from "express";
import path from "path";
import { authRouter } from "./auth";
import { api } from "./routes";

async function main() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middlewares essenciais
  app.use(express.json({ limit: '5mb' })); // Aumentar o limite para uploads
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Suas rotas da API
  app.use("/api", api);
  app.use("/auth", authRouter);

  // =================================================================
  // LÓGICA PARA PRODUÇÃO vs. DESENVOLVIMENTO
  // =================================================================

  if (process.env.NODE_ENV === "production") {
    // Em produção, sirva os arquivos estáticos da build do cliente
    const clientDistPath = path.resolve(process.cwd(), "dist/client");
    console.log(`[server]: Servindo arquivos estáticos de: ${clientDistPath}`);
    app.use(express.static(clientDistPath));

    // Para qualquer outra rota que não seja da API, sirva o index.html
    // Isso é crucial para o roteamento do React (wouter) funcionar em produção
    app.get("*", (req, res) => {
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/auth")) {
        return res.status(404).json({ message: "Endpoint não encontrado." });
      }
      res.sendFile(path.resolve(clientDistPath, "index.html"));
    });

  } else {
    // Em desenvolvimento, use o middleware do Vite Dev Server
    console.log("[server]: Rodando em modo de desenvolvimento com Vite.");
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: "client",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`[server]: Servidor rodando em http://localhost:${port}`);
  });
}

main();
