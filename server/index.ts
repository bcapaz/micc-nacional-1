import "dotenv/config";
import express from "express";
import path from "path";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";
// CORRIGIDO: Importa 'auth' de auth.ts e renomeia para 'authRouter' para uso interno
import { auth as authRouter } from "./auth";
// CORRIGIDO: Importa 'routes' de routes.ts e renomeia para 'api' para uso interno
import { routes as api } from "./routes";

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
    const clientDistPath = path.resolve(process.cwd(), "dist/client");
    console.log(`[server]: Servindo arquivos estáticos de: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(clientDistPath, "index.html"));
    });
  } else {
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

