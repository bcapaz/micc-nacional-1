import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. RASTREADOR (LOGGER)
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`\n📡 [ENTRADA] ${req.method} ${req.url}`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const cor = status >= 400 ? "❌" : "✅";
    console.log(`${cor} [SAÍDA] ${req.method} ${req.url} - Status ${status} (${duration}ms)`);
  });
  next();
});

// 2. SETUP DE AUTH (Obrigatório vir antes das rotas)
try {
    setupAuth(app);
    console.log("🔒 [SISTEMA] Autenticação configurada.");
} catch (e) {
    console.error("💥 [ERRO CRÍTICO] Falha ao configurar Auth:", e);
}

// 3. ROTAS
app.use("/api", routes);
app.use(routes);

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("💥 [ERRO EXPRESS]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  // 4. INICIALIZAÇÃO SEGURA (Correção do erro do Vite)
  if (process.env.NODE_ENV !== "production") {
    try {
      const devVitePath = "./vite"; // Variável para enganar o compilador
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
      console.log("🔧 [DEV] Vite configurado.");
    } catch (err) {
      console.error("⚠️ [DEV] Erro ao carregar Vite:", err);
    }
  } else {
    // Modo Produção
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use(express.static(path.join(__dirname, "public")));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
    console.log("🏭 [PROD] Servindo arquivos estáticos.");
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [SERVER] Rodando em http://0.0.0.0:${PORT}`);
  });
})();
