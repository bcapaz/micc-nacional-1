import { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { hashPassword } from "./auth";

export const routes = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Correção automática de URL
routes.use((req, res, next) => {
    if (req.url.startsWith('/api/')) req.url = req.url.replace('/api', '');
    next();
});

const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login necessário" });
  next();
};

const isAdmin = (req, res, next) => {
  // @ts-ignore
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Requer Admin" });
  next();
};

// --- POST TWEET (CRÍTICO) ---
routes.post("/tweets", isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const content = req.body.content || "";
        let mediaData = null;
        if (req.file) {
            mediaData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        }
        
        if (!content && !mediaData) return res.status(400).json({ message: "Vazio" });
        
        // Força isComment: false para publicações principais
        // @ts-ignore
        const newTweet = await storage.createTweet({ 
            content, 
            userId: req.user.id, 
            mediaData,
            isComment: false 
        });

        return res.status(201).json(newTweet);
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ message: "Erro ao criar publicação" }); 
    }
});

// --- DEMAIS ROTAS (Mantidas iguais para funcionar o resto) ---

routes.get("/tweets", isAuthenticated, async (req, res) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    // @ts-ignore
    const userId = req.user.id; 
    const tweets = await storage.getAllTweets(userId, { limit: 5, cursor });
    
    let nextCursor: string | null = null;
    if (tweets.length === 5) nextCursor = tweets[4].createdAt.toISOString();

    return res.json({ data: tweets, nextCursor });
  } catch (error) { res.status(500).json({ message: "Erro" }); }
});

routes.get("/profile/:identifier", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier))) user = await storage.getUser(parseInt(identifier));
        else user = await storage.getUserByUsername(identifier);
        
        if (!user) return res.status(404).json({ message: "Não encontrado" });
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

routes.get('/tweets/:id/comments', isAuthenticated, async (req, res) => {
    try {
        const comments = await storage.getComments(parseInt(req.params.id));
        if (!comments) return res.status(404).json({ error: "Erro" });
        res.json({ success: true, count: comments.length, comments });
    } catch (error) { res.status(500).json({ error: "Erro" }); }
});

routes.get("/users/delegates", isAuthenticated, async (req, res) => {
    const delegates = await storage.getNonAdminUsers();
    res.json(delegates);
});

routes.get("/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    return res.json(allUsers);
});

routes.post("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const existing = await storage.getLike(req.user.id, tweetId);
        if (existing) return res.status(409).json({ message: "Já curtido" });
        // @ts-ignore
        await storage.createLike({ userId: req.user.id, tweetId });
        return res.status(201).json({ message: "Curtiu" });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.post("/tweets/:id/comments", isAuthenticated, async (req, res) => {
    try {
        // @ts-ignore
        const newComment = await storage.createComment({ content: req.body.content, userId: req.user.id, tweetId: parseInt(req.params.id) });
        res.status(201).json(newComment);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.post('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const existing = await storage.getRepost(req.user.id, tweetId);
        if (existing) return res.status(409).json({ message: "Já compartilhado" });
        // @ts-ignore
        await storage.createRepost(req.user.id, tweetId);
        return res.status(201).json({ message: "Compartilhado" });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
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

routes.delete("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try { // @ts-ignore
        await storage.deleteLike(req.user.id, parseInt(req.params.id));
        return res.status(200).json({ message: "Descurtido" });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.delete('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try { // @ts-ignore
        await storage.deleteRepost(req.user.id, parseInt(req.params.id));
        return res.status(200).json({ message: "Removido" });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.delete("/tweets/:id", isAuthenticated, async (req, res) => {
    const tweetId = parseInt(req.params.id);
    try {
        const tweet = await storage.getTweetById(tweetId);
        if (!tweet) return res.status(404).json({ message: "Não encontrado" });
        // @ts-ignore
        const currentUser = req.user;
        if (!currentUser.isAdmin && tweet.userId !== currentUser.id) return res.status(403).json({ message: "Proibido" });
        await storage.deleteTweet(tweetId);
        return res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ message: "Erro" }); }
});

// Rotas Admin extras
routes.post("/admin/users/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const hashedPassword = await hashPassword(req.body.newPassword);
        await storage.updateUser(parseInt(req.params.id), { password: hashedPassword });
        return res.status(200).json({ success: true });
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});

routes.post("/admin/users/:id/toggle-admin", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const uid = parseInt(req.params.id); // @ts-ignore
        if (uid === req.user.id) return res.status(400).json({message: "Erro"});
        const updated = await storage.updateUser(uid, { isAdmin: req.body.isAdmin });
        res.json(updated);
    } catch (e) { res.status(500).json({ message: "Erro" }); }
});
