import { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { db } from "@db"; // Acesso direto ao DB para teste
import { sql } from "drizzle-orm"; // SQL puro para teste

export const routes = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ====================================================================
// 🕵️ ÁREA DE DIAGNÓSTICO (O "ESPIÃO")
// ====================================================================

// 1. Log Global: Se a requisição bater no servidor, isso VAI aparecer no terminal
routes.use((req, res, next) => {
    console.log(`\n🔴 [DIAGNÓSTICO] Recebido: ${req.method} ${req.url}`);
    if (req.user) {
        // @ts-ignore
        console.log(`   👤 Usuário autenticado: ID ${req.user.id} | Admin: ${req.user.isAdmin}`);
    } else {
        console.log(`   👻 Usuário NÃO autenticado (ou cookie perdido)`);
    }
    next();
});

// 2. Rota de Teste de Vida do Banco
routes.get("/debug/ping-db", async (req, res) => {
    try {
        const result = await db.execute(sql`SELECT 1 as vivo`);
        res.json({ message: "Banco está vivo", result });
    } catch (e) {
        console.error("ERRO BANCO:", e);
        res.status(500).json({ erro: String(e) });
    }
});

// 3. Rota "Nuclear" de Delete (Bypassa tudo e roda SQL puro)
// Use isso no navegador: /api/debug/force-delete/ID_DO_TWEET
routes.get("/debug/force-delete/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`☢️ [NUCLEAR] Tentando deletar tweet ${id} via SQL PURO`);
    try {
        // Apaga dependencias na marra
        await db.execute(sql`DELETE FROM likes WHERE tweet_id = ${id}`);
        await db.execute(sql`DELETE FROM reposts WHERE tweet_id = ${id}`);
        // Apaga o tweet
        await db.execute(sql`DELETE FROM tweets WHERE id = ${id}`);
        
        console.log("☢️ [NUCLEAR] Sucesso no SQL Puro");
        res.json({ message: "Deletado via SQL Puro (Se sumiu, o problema era o ORM)" });
    } catch (e) {
        console.error("☢️ [NUCLEAR] Falha:", e);
        res.status(500).json({ erro: String(e) });
    }
});

// ====================================================================
// FIM DA ÁREA DE DIAGNÓSTICO
// ====================================================================

const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login necessário" });
  next();
};

const isAdmin = (req, res, next) => {
  // @ts-ignore
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Requer Admin" });
  next();
};

// --- ROTAS PADRÃO (Mantendo para o site funcionar) ---

routes.get("/tweets", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore
    const tweets = await storage.getAllTweets(req.user.id, { limit: 15 });
    return res.json({ data: tweets });
  } catch (error) { res.status(500).json({ message: "Erro server" }); }
});

routes.get("/profile/:identifier", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier))) user = await storage.getUser(parseInt(identifier));
        else user = await storage.getUserByUsername(identifier);
        
        if (!user) return res.status(404).json({ message: "Não encontrado" });
        return res.json(user);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.get("/profile/:identifier/tweets", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier))) user = await storage.getUser(parseInt(identifier));
        else user = await storage.getUserByUsername(identifier);
        
        if (!user) return res.status(404).json({ message: "User not found" });
        // @ts-ignore
        const userTweets = await storage.getUserTweets(user.id, req.user.id);
        return res.json(userTweets);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.get("/users/delegates", isAuthenticated, async (req, res) => {
    const delegates = await storage.getNonAdminUsers();
    res.json(delegates);
});

// POST TWEET (Sabemos que funciona)
routes.post("/tweets", isAuthenticated, upload.single('media'), async (req, res) => {
    const content = req.body.content || "";
    let mediaData = null;
    if (req.file) mediaData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    
    // @ts-ignore
    const newTweet = await storage.createTweet({ content, userId: req.user.id, mediaData });
    res.status(201).json(newTweet);
});

// --- ROTA PROBLEMÁTICA DE DELETE (Instrumentada) ---
routes.delete("/tweets/:id", isAuthenticated, async (req, res) => {
    const tweetId = parseInt(req.params.id);
    console.log(`🛑 [ROTA DELETE] ID Recebido: ${tweetId}`);

    // @ts-ignore
    const userId = req.user.id;
    // @ts-ignore
    const isAdmin = req.user.isAdmin;

    try {
        const tweet = await storage.getTweetById(tweetId);
        if (!tweet) {
            console.log("   ❌ Tweet não encontrado no banco (getTweetById retornou null)");
            return res.status(404).json({ message: "Tweet sumiu?" });
        }
        
        console.log(`   ✅ Tweet encontrado. Dono: ${tweet.userId} | Quem pede: ${userId}`);

        if (!isAdmin && tweet.userId !== userId) {
            console.log("   ⛔ Bloqueado por permissão.");
            return res.status(403).json({ message: "Proibido" });
        }

        console.log("   🚀 Chamando storage.deleteTweet...");
        await storage.deleteTweet(tweetId);
        console.log("   🏁 storage.deleteTweet finalizou sem erro.");
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("   💥 ERRO FATAL NO DELETE:", error);
        return res.status(500).json({ message: String(error) });
    }
});

// LIKES
routes.post("/tweets/:id/like", isAuthenticated, async (req, res) => {
    console.log(`❤️ [LIKE] ID: ${req.params.id}`);
    try {
        // @ts-ignore
        await storage.createLike({ userId: req.user.id, tweetId: parseInt(req.params.id) });
        res.status(201).json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({error: String(e)}); }
});

routes.delete("/tweets/:id/like", isAuthenticated, async (req, res) => {
    console.log(`💔 [UNLIKE] ID: ${req.params.id}`);
    try {
        // @ts-ignore
        await storage.deleteLike(req.user.id, parseInt(req.params.id));
        res.status(200).json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({error: String(e)}); }
});

// Manter outras rotas essenciais para o admin funcionar
routes.get("/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    const u = await storage.getAllUsers();
    res.json(u);
});
routes.post("/admin/users/:id/toggle-admin", isAuthenticated, isAdmin, async (req, res) => {
    const uid = parseInt(req.params.id);
    const updated = await storage.updateUser(uid, { isAdmin: req.body.isAdmin });
    res.json(updated);
});
