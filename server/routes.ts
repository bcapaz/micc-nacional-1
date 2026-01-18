import { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { hashPassword } from "./auth"; // Importamos a função de auth.ts

// Criamos um roteador modular para as rotas da API
export const routes = Router();

// Configuração do Multer para upload de arquivos em memória
const upload = multer({ storage: multer.memoryStorage() });

// Middleware para garantir que o usuário está autenticado
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Acesso não autorizado. Por favor, faça login." });
  }
  next();
};

// Middleware para garantir que o usuário é um administrador
const isAdmin = (req, res, next) => {
  // @ts-ignore
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Acesso negado. Requer privilégios de administrador." });
  }
  next();
};


// --- ROTAS GET ---
routes.get("/tweets", isAuthenticated, async (req, res) => {
  try {
    const limit = 15;
    const cursor = req.query.cursor as string | undefined;
    // @ts-ignore
    const userId = req.user.id; // req.user está garantido pelo middleware isAuthenticated

    const tweets = await storage.getAllTweets(userId, { limit, cursor });

    let nextCursor: string | null = null;
    if (tweets.length === limit) {
      nextCursor = tweets[tweets.length - 1].createdAt.toISOString();
    }

    return res.json({
      data: tweets,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

routes.get("/profile/:identifier", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier, 10))) {
            user = await storage.getUser(parseInt(identifier, 10));
        } else {
            user = await storage.getUserByUsername(identifier);
        }
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

routes.get("/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const allUsers = await storage.getAllUsers();
        return res.json(allUsers);
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

routes.get("/profile/:identifier/tweets", isAuthenticated, async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let user;
        if (!isNaN(parseInt(identifier, 10))) {
            user = await storage.getUser(parseInt(identifier, 10));
        } else {
            user = await storage.getUserByUsername(identifier);
        }
        if (!user) return res.status(404).json({ message: "User not found" });
        // @ts-ignore
        const userTweets = await storage.getUserTweets(user.id, req.user.id);
        return res.json(userTweets);
    } catch (error) {
        console.error("Error fetching user tweets:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

routes.get("/users/delegates", isAuthenticated, async (req, res) => {
    try {
        const delegates = await storage.getNonAdminUsers();
        return res.json(delegates);
    } catch (error) {
        console.error("Error fetching delegates:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

routes.get('/tweets/:id/comments', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        const comments = await storage.getComments(tweetId);
        if (!comments) return res.status(404).json({ error: "Comentários não encontrados" });
        res.json({ success: true, count: comments.length, comments });
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        res.status(500).json({ error: "Erro interno ao carregar comentários" });
    }
});


// --- ROTAS POST ---
routes.post("/tweets", isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const content = req.body.content || "";
        let mediaData = null;
        if (req.file) {
            const b64 = req.file.buffer.toString("base64");
            mediaData = `data:${req.file.mimetype};base64,${b64}`;
        }
        if (!content && !mediaData) return res.status(400).json({ message: "Conteúdo ou mídia são obrigatórios" });
        const newTweet = await storage.createTweet({
            content,
            // @ts-ignore
            userId: req.user.id,
            mediaData
        });
        return res.status(201).json(newTweet);
    } catch (error) {
        console.error("Error creating tweet:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

routes.post("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        if (isNaN(tweetId)) return res.status(400).json({ message: "Invalid tweet ID" });
        // @ts-ignore
        const userId = req.user.id;
        const existingLike = await storage.getLike(userId, tweetId);
        if (existingLike) {
            return res.status(409).json({ message: "Publicação já foi curtida por este usuário" });
        }
        await storage.createLike({ userId, tweetId });
        return res.status(201).json({ message: "Publicação curtida" });
    } catch (error) {
        console.error("Error liking tweet:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

routes.post("/profile/update", isAuthenticated, upload.single('profileImage'), async (req, res) => {
    try {
        const { username, bio } = req.body;
        let profileImage: string | null = null;
        if (req.file) {
            const b64 = req.file.buffer.toString("base64");
            profileImage = `data:${req.file.mimetype};base64,${b64}`;
        }
        if (!username || !username.trim()) return res.status(400).json({ message: "Nome de delegação é obrigatório" });
        // @ts-ignore
        if (username !== req.user.username) {
            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) return res.status(400).json({ message: "Nome de delegação já está em uso" });
        }
        const updateData: { username: string; bio?: string; profileImage?: string } = { username, bio };
        if (profileImage) {
            updateData.profileImage = profileImage;
        }
        // @ts-ignore
        const updatedUser = await storage.updateUser(req.user.id, updateData);
        return res.status(200).json(updatedUser);
    } catch (error: any) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
});

routes.post("/tweets/:id/comments", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id, 10);
        if (isNaN(tweetId)) return res.status(400).json({ message: "ID de tweet inválido" });
        const { content } = req.body;
        if (!content || content.length > 280) return res.status(400).json({ message: "Conteúdo do comentário é inválido" });
        const newComment = await storage.createComment({
            content,
            // @ts-ignore
            userId: req.user.id,
            tweetId: tweetId,
        });
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Erro ao criar comentário:", error);
        res.status(500).json({ message: "Erro interno ao criar comentário" });
    }
});

routes.post('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;
        const existingRepost = await storage.getRepost(userId, tweetId);
        if (existingRepost) {
            return res.status(409).json({ message: "Publicação já repostada" });
        }
        await storage.createRepost(userId, tweetId);
        return res.status(201).json({ message: "Publicação repostada com sucesso" });
    } catch (error) {
        console.error("Error creating repost:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
});

routes.post("/admin/users/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userIdToReset = parseInt(req.params.id, 10);
        if (isNaN(userIdToReset)) {
            return res.status(400).json({ message: "ID de utilizador inválido." });
        }
        const { newPassword } = req.body;
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres."});
        }
        const hashedPassword = await hashPassword(newPassword);
        await storage.updateUser(userIdToReset, { password: hashedPassword });
        return res.status(200).json({ success: true, message: "Senha redefinida com sucesso." });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});


// --- ROTAS DELETE ---
routes.delete("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        if (isNaN(tweetId)) return res.status(400).json({ message: "Invalid tweet ID" });
        // @ts-ignore
        const userId = req.user.id;
        const existingLike = await storage.getLike(userId, tweetId);
        if (!existingLike) {
            return res.status(404).json({ message: "Like não encontrado para este usuário" });
        }
        await storage.deleteLike(userId, tweetId);
        return res.status(200).json({ message: "Publicação descurtida" });
    } catch (error) {
        console.error("Error unliking tweet:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
 
routes.delete('/tweets/:id/repost', isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;
        const existingRepost = await storage.getRepost(userId, tweetId);
        if (!existingRepost) {
            return res.status(404).json({ message: "Repost não encontrado" });
        }
        await storage.deleteRepost(userId, tweetId);
        return res.status(200).json({ message: "Repost removido com sucesso" });
    } catch (error) {
        console.error("Error deleting repost:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
});

routes.delete("/admin/tweets/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        await storage.deleteTweet(tweetId);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting tweet:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
});

