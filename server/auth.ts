import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import session from "express-session";

const scryptAsync = promisify(scrypt);

// --- FUNÇÕES DE CRIPTOGRAFIA (Usadas aqui e no routes.ts) ---

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashed, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

// --- CONFIGURAÇÃO PRINCIPAL DE AUTH ---

export function setupAuth(app: Express) {
  // 1. Configuração da Sessão
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "segredo_padrao_muito_seguro",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      secure: app.get("env") === "production", // Secure em produção (https)
    },
  };

  // Necessário para cookies seguros no Render (que usa proxy)
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // 2. Estratégia de Login (Username + Password)
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );

  // 3. Serialização (Salvar ID na sessão)
  passport.serializeUser((user, done) => done(null, (user as User).id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // --- ROTAS DE AUTENTICAÇÃO ---

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: false // Padrão
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove a senha antes de enviar pro front
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
      passport.authenticate("local", (err: any, user: any, info: any) => {
          if (err) return next(err);
          if (!user) return res.status(400).json({ message: "Usuário ou senha inválidos" });
          
          req.login(user, (err) => {
              if (err) return next(err);
              const { password, ...userWithoutPassword } = user;
              res.status(200).json(userWithoutPassword);
          });
      })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // @ts-ignore
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}
