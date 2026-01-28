import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { createServer } from "http";

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

// Rotas
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

  // OTIMIZAÇÃO DE DEPLOY:
  // Usamos process.env.NODE_ENV para que o 'esbuild' consiga remover
  // o código do Vite completamente na versão de produção (Dead Code Elimination).
  if (process.env.NODE_ENV !== "production") {
    // Código de Desenvolvimento (só carrega localmente)
    try {
        const vite = await import("./vite");
        await vite.setupVite(app, server);
    } catch (e) {
        console.log("Vite não carregado (provavelmente produção):", e);
    }
  } else {
    // Código de Produção (Leve e Rápido)
    // Não importamos o arquivo ./vite aqui para evitar dependências pesadas
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve os arquivos estáticos compilados
    app.use(express.static(path.join(__dirname, "public")));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // Bind no IP público (0.0.0.0) obrigatório para o Render
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server]: Servidor rodando publicamente em http://0.0.0.0:${PORT}`);
  });
})();
