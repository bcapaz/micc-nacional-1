import express, { type Request, Response, NextFunction } from "express";
import { routes } from "./routes";
import { setupAuth } from "./auth"; // Garante que login funciona
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configura Autenticação
setupAuth(app);

// Rotas da API
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

  // LÓGICA DE INICIALIZAÇÃO BLINDADA
  if (process.env.NODE_ENV !== "production") {
    try {
      // Truque para o compilador não incluir o Vite no build de produção
      const devVitePath = "./vite"; 
      const vite = await import(devVitePath);
      await vite.setupVite(app, server);
    } catch (err) {
      console.error("Erro ao iniciar Vite:", err);
    }
  } else {
    // Em produção, serve apenas os arquivos estáticos
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    app.use(express.static(path.join(__dirname, "public")));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server]: Rodando em http://0.0.0.0:${PORT}`);
  });
})();
