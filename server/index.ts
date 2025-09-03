import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url"; // Importação necessária para a correção
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";
import { auth as authRouter } from "./auth";
import { routes as api } from "./routes";

// --- INÍCIO DA CORREÇÃO ---
// Determina o caminho para o diretório atual do ficheiro em execução
// Isto é mais fiável do que process.cwd() em ambientes de produção
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- FIM DA CORREÇÃO ---

async function main() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'uma-chave-secreta-muito-forte',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api", api);
  app.use("/auth", authRouter);

  if (process.env.NODE_ENV === "production") {
    // CORREÇÃO FINAL: O caminho agora é relativo ao local do ficheiro do servidor
    const clientBuildPath = path.resolve(__dirname, "../client/dist");
    console.log(`[server]: Servindo ficheiros estáticos de: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));
    
    // Para qualquer outra rota, sirva o index.html principal do cliente.
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(clientBuildPath, "index.html"));
    });
  } else {
    // Lógica de desenvolvimento com o Vite
    console.log("[server]: Rodando em modo de desenvolvimento com Vite.");
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: "client",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`[server]: Servidor rodando em http://localhost:${port}`);
  });
}

main();

