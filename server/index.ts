import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// RASTREADOR (Mantido para vermos se corrigiu)
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
      console.log(`➡️ [API REQUEST] ${req.method} ${req.url}`);
  }
  next();
});

// 1. Configura Login
setupAuth(app);

// 2. Configura Rotas
app.use("/api", routes);
app.use(routes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  if (process.env.NODE_ENV !== "production") {
    try {
      const devVitePath = "./vite";
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
    } catch (err) { console.error("Erro Vite:", err); }
  } else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use(express.static(path.join(__dirname, "public")));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [SERVER] http://0.0.0.0:${PORT}`);
  });
})();
