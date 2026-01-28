import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth"; // <--- ESTAVA FALTANDO ISSO
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de Log
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

// 1. CONFIGURA A AUTENTICAÇÃO (Sessão, Login, Registro)
// Isso precisa vir ANTES das rotas da API
setupAuth(app); 

// 2. Registra as rotas da aplicação
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

  // Lógica Blindada de Inicialização (Evita erro do Vite em Produção)
  if (process.env.NODE_ENV !== "production") {
    try {
      // TRUQUE: Usamos uma variável para o import dinâmico.
      const devVitePath = "./vite";
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
    } catch (err) {
      console.error("Erro ao iniciar modo Dev:", err);
    }
  } else {
    // MODO PRODUÇÃO (Manual, sem dependências externas)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve a pasta 'public' compilada
    app.use(express.static(path.join(__dirname, "public")));
    
    // Para qualquer outra rota não encontrada na API, serve o index.html (SPA)
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // Bind no IP público (0.0.0.0) obrigatório para o Render
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server]: Servidor rodando publicamente em http://0.0.0.0:${PORT}`);
  });
})();
