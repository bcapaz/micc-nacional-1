import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth"; // Importação crítica
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// LOG DE RASTREAMENTO: Para vermos se a rota /api/login existe
app.use((req, res, next) => {
    // Apenas loga APIs para não poluir
    if (req.url.startsWith('/api')) {
        console.log(`➡️ [API REQUEST] ${req.method} ${req.url}`);
    }
    next();
});

// 1. PRIMEIRO DE TUDO: Configura Auth (Cria /api/login)
// Se isso falhar ou ficar depois das rotas estáticas, o login quebra.
setupAuth(app);

// 2. DEPOIS: Configura Rotas da API (Cria /api/tweets)
app.use("/api", routes);
app.use(routes);

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

(async () => {
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  // Inicialização segura (Ignora Vite em produção)
  if (process.env.NODE_ENV !== "production") {
    try {
      const devVitePath = "./vite";
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
    } catch (err) {
      console.error("Erro Vite Dev:", err);
    }
  } else {
    // Produção: Serve arquivos estáticos
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve a pasta public
    app.use(express.static(path.join(__dirname, "public")));
    
    // CATCH-ALL: Se não for /api/login e não for arquivo, manda index.html
    // É AQUI QUE O ERRO DOCTYPE ACONTECIA: O login caía aqui!
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [SERVER] Rodando em http://0.0.0.0:${PORT}`);
    console.log(`ℹ️ [DIAGNÓSTICO] Rotas de Login devem estar ativas agora.`);
  });
})();
