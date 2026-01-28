import { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { hashPassword } from "./auth";

export const routes = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ====================================================================
// 🛠️ CORRETOR AUTOMÁTICO DE URL (O SALVADOR)
// ====================================================================
routes.use((req, res, next) => {
    // Se a rota chegar como /api/tweets/..., removemos o /api extra
    if (req.url.startsWith('/api/')) {
        const original = req.url;
        req.url = req.url.replace('/api', '');
        console.log(`🔧 [AUTO-FIX] URL corrigida: ${original} -> ${req.url}`);
    }
    next();
});
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

// --- ROTAS (Agora vão funcionar mesmo com URL errada) ---

routes.get("/tweets", isAuthenticated, async (req, res) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    // @ts-ignore
    const userId = req.user.id; 
    
    // OTIMIZAÇÃO: Carrega apenas 5 tweets por vez para economizar dados do DB
    const limit = 5; 

    const tweets = await storage.getAllTweets(userId, { limit, cursor });
    
    let nextCursor: string | null = null;
    if (tweets.length === limit) {
      nextCursor = tweets[tweets.length - 1].createdAt.toISOString();
    }

    return res.json({ 
        data: tweets,
        nextCursor 
    });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    res.status(500).json({ message: "Erro interno" });
  }
});

routes.get("/profile/:identifier", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier))) user = await storage.getUser(parseInt(identifier));
        else user = await storage.getUserByUsername(identifier);
        
        if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
        const { password, ...u } = user;
        return res.json(u);
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

routes.get('/tweets/:id/comments', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        const comments = await storage.getComments(tweetId);
        if (!comments) return res.status(404).json({ error: "Comentários não encontrados" });
        res.json({ success: true, count: comments.length, comments });
    } catch (error) { res.status(500).json({ error: "Erro" }); }
});

routes.get("/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    return res.json(allUsers);
});

// --- POSTS ---

routes.post("/tweets", isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const content = req.body.content || "";
        let mediaData = null;
        if (req.file) mediaData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        
        if (!content && !mediaData) return res.status(400).json({ message: "Vazio" });
        
        // @ts-ignore
        const newTweet = await storage.createTweet({ content, userId: req.user.id, mediaData });
        return res.status(201).json(newTweet);
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

routes.post("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;
        const existingLike = await storage.getLike(userId, tweetId);
        if (existingLike) return res.status(409).json({ message: "Já curtido" });
        
        await storage.createLike({ userId, tweetId });
        return res.status(201).json({ message: "Curtiu" });
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

routes.post("/tweets/:id/comments", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        const { content } = req.body;
        // @ts-ignore
        const newComment = await storage.createComment({ content, userId: req.user.id, tweetId });
        res.status(201).json(newComment);
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

routes.post('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;
        const existingRepost = await storage.getRepost(userId, tweetId);
        if (existingRepost) return res.status(409).json({ message: "Já compartilhado" });
        
        await storage.createRepost(userId, tweetId);
        return res.status(201).json({ message: "Compartilhado" });
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

routes.post("/profile/update", isAuthenticated, upload.single('profileImage'), async (req, res) => {
    try {
        const { username, bio } = req.body;
        let profileImage = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` : undefined;
        // @ts-ignore
        const updated = await storage.updateUser(req.user.id, { username, bio, profileImage });
        res.json(updated);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.post("/admin/users/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const hashedPassword = await hashPassword(newPassword);
        await storage.updateUser(parseInt(req.params.id), { password: hashedPassword });
        return res.status(200).json({ success: true });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.post("/admin/users/:id/toggle-admin", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const uid = parseInt(req.params.id);
        // @ts-ignore
        if (uid === req.user.id) return res.status(400).json({message: "Erro"});
        const updated = await storage.updateUser(uid, { isAdmin: req.body.isAdmin });
        res.json(updated);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

// --- DELETE ---

routes.delete("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        // @ts-ignore
        await storage.deleteLike(req.user.id, parseInt(req.params.id));
        return res.status(200).json({ message: "Descurtido" });
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

routes.delete('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try {
        // @ts-ignore
        await storage.deleteRepost(req.user.id, parseInt(req.params.id));
        return res.status(200).json({ message: "Removido" });
    } catch (e) { console.error(e); res.status(500).json({ message: "Erro" }); }
});

// ROTA DELETE UNIFICADA (Com diagnóstico)
routes.delete("/tweets/:id", isAuthenticated, async (req, res) => {
    const tweetId = parseInt(req.params.id);
    console.log(`🗑️ [DELETE] Recebido para ID ${tweetId}`);

    try {
        const tweet = await storage.getTweetById(tweetId);
        if (!tweet) return res.status(404).json({ message: "Não encontrado" });

        // @ts-ignore
        const currentUser = req.user;
        if (!currentUser.isAdmin && tweet.userId !== currentUser.id) {
            return res.status(403).json({ message: "Proibido" });
        }

        await storage.deleteTweet(tweetId);
        console.log(`✅ [DELETE] Sucesso para ID ${tweetId}`);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ [DELETE ERROR]", error);
        return res.status(500).json({ message: "Erro interno" });
    }
});
