import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes"; 
import { setupVite, serveStatic, createViteServer } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de Log: Mostra no terminal cada pedido que chega (GET, POST, DELETE)
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

// --- AQUI ESTÁ A CORREÇÃO DE ROTAS ---
// Registra as rotas tanto em /api quanto na raiz para evitar erros de 404
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

  // Configuração do Frontend (Vite)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // --- CORREÇÃO DE REDE (IMPORTANTE) ---
  // O Render precisa que a gente use 0.0.0.0, e não localhost
  const PORT = Number(process.env.PORT) || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server]: Servidor rodando publicamente em http://0.0.0.0:${PORT}`);
  });
})();
