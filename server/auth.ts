import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Router } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// A declaração global para o tipo de usuário no Express
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Funções de hash e comparação de senhas
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// --- Configuração do Passport (Define a estratégia de como verificar o login) ---
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Nome de usuário ou senha inválidos." });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }),
);

// Define qual dado do usuário será armazenado na sessão (neste caso, o ID)
passport.serializeUser((user: SelectUser, done) => {
  done(null, user.id);
});

// Define como buscar o usuário completo a partir do ID armazenado na sessão
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

// --- Roteador de Autenticação ---
// Criamos um roteador específico para as rotas de autenticação
export const auth = Router();

auth.post("/register", async (req, res, next) => {
  try {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: "Nome de usuário já existe" });
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    if (!user) {
      return next(new Error("Falha ao criar o usuário no banco de dados."));
    }

    // Faz o login automático do usuário após o registro
    req.login(user, (err) => {
      if (err) return next(err);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    });
  } catch (error) {
    next(error);
  }
});

// A rota de login agora usa o passport.authenticate como um middleware
auth.post("/login", passport.authenticate("local"), (req, res) => {
  // Se a autenticação passar, o usuário estará em req.user
  const { password, ...userWithoutPassword } = req.user as SelectUser;
  res.status(200).json(userWithoutPassword);
});

auth.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão do navegador
        res.sendStatus(200);
    });
  });
});

// Rota para verificar o status do usuário logado
auth.get("/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado." });
  }
  const { password, ...userWithoutPassword } = req.user as SelectUser;
  res.json(userWithoutPassword);
});
