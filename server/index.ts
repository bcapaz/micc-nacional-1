import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. LOG DE VIDA (Usando console.error para furar o buffer de logs)
console.error("🔥 [STARTUP] Iniciando servidor...");

// 2. ROTA DE TESTE (Para ver se a API está viva)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// 3. CONFIGURA AUTH (Acontece ANTES de tudo)
try {
  setupAuth(app);
  console.error("✅ [STARTUP] Auth Configurado (Login Ativo)");
} catch (e) {
  console.error("❌ [FATAL] Erro ao configurar Auth:", e);
}

// 4. CONFIGURA ROTAS DA API
app.use("/api", routes);
app.use(routes);

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`❌ [ERRO] ${message}`);
  res.status(status).json({ message });
  throw err;
});

(async () => {
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  // LÓGICA DE PRODUÇÃO SIMPLIFICADA
  if (process.env.NODE_ENV !== "development") {
    // Estamos no Render (Produção)
    console.error("🏭 [MODE] Produção detectada.");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, "public");
    
    // Serve estáticos
    app.use(express.static(publicPath));
    
    // Catch-all (SPA)
    app.use("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  } else {
    // Estamos Local (Dev)
    try {
        // Truque da variável para o Bundler não quebrar o deploy
        const devPath = "./vite";
        const vite = await import(devPath);
        await vite.setupVite(app, server);
        console.error("🔧 [MODE] Desenvolvimento (Vite) ativo.");
    } catch (e) {
        console.error("⚠️ [DEV] Vite falhou (ok se for prod):", e);
    }
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.error(`🚀 [SERVER] Rodando na porta ${PORT}`);
  });
})();
