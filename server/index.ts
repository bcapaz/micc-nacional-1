import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// LOG DE INICIALIZAÇÃO
console.log("🚀 [BOOT] Iniciando servidor...");

// 1. CONFIGURA AUTH (Prioridade Máxima - Conserta o Login)
try {
  setupAuth(app);
  console.log("✅ [BOOT] Sistema de Auth carregado.");
} catch (error) {
  console.error("❌ [BOOT] Erro fatal no Auth:", error);
}

// 2. CONFIGURA ROTAS (API)
app.use("/api", routes);
app.use(routes);

// Error Handler Global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

(async () => {
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  // LÓGICA DE SERVIDOR ESTÁTICO (PRODUÇÃO)
  // Se não estivermos em desenvolvimento, assumimos produção direto.
  if (process.env.NODE_ENV !== "development") {
    console.log("🏭 [BOOT] Modo Produção detectado.");
    
    // Caminho absoluto para a pasta public
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, "public");

    console.log(`📂 [BOOT] Servindo arquivos de: ${publicPath}`);
    
    app.use(express.static(publicPath));
    
    // Rota Catch-All para o Frontend (React)
    app.use("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  } 
  else {
    // LÓGICA DE DESENVOLVIMENTO (VITE)
    // Usamos try/catch silencioso para garantir que isso não quebre o build de produção
    console.log("🔧 [BOOT] Modo Desenvolvimento detectado.");
    try {
      const vitePath = "./vite"; // Variável para enganar o bundler
      const vite = await import(vitePath);
      await vite.setupVite(app, server);
    } catch (e) {
      console.error("⚠️ [DEV] Vite não carregou (isso é normal se for teste):", e);
    }
  }

  // INICIA O SERVIDOR
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ [SERVER] Servidor rodando publicamente na porta ${PORT}`);
    console.log(`👉 [ACESSO] http://0.0.0.0:${PORT}`);
  });
})();
