import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth"; // Mantendo a importação padrão
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de Log (Essencial para debug)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Configura Autenticação
setupAuth(app);

// Configura Rotas (Duplo bind para garantir que /api e / funcionem)
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

  // --- CORREÇÃO DO ERRO DO VITE ---
  if (process.env.NODE_ENV !== "production") {
    try {
      // O TRUQUE: Usar uma variável impede que o build tente empacotar o 'vite'
      const devVitePath = "./vite"; 
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
    } catch (err) {
      console.error("Erro ao carregar Vite (Dev):", err);
    }
  } else {
    // MODO PRODUÇÃO: Serve os arquivos estáticos manualmente
    // Isso remove qualquer dependência externa
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    app.use(express.static(path.join(__dirname, "public")));
    
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // Escuta no 0.0.0.0 (Obrigatório para Render)
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server]: Servidor rodando publicamente em http://0.0.0.0:${PORT}`);
  });
})();
