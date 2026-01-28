// --- ROTA DE EXCLUSÃO INTELIGENTE (Admin ou Dono) ---
routes.delete("/tweets/:id", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        
        // LOG DE DIAGNÓSTICO
        console.log(`[DELETE REQUEST] Tweet ID: ${tweetId}`);

        // 1. Busca o tweet
        const tweet = await storage.getTweetById(tweetId);
        
        if (!tweet) {
            console.log(`[DELETE ERROR] Tweet ${tweetId} não encontrado.`);
            return res.status(404).json({ message: "Publicação não encontrada" });
        }

        // 2. Garante que temos o usuário atual
        // @ts-ignore
        const currentUser = req.user;
        
        console.log(`[DELETE AUTH] Usuário atual: ${currentUser.id} (Admin: ${currentUser.isAdmin}) | Dono do Tweet: ${tweet.userId}`);

        // 3. Verificação de Permissão
        if (!currentUser.isAdmin && tweet.userId !== currentUser.id) {
            console.log(`[DELETE BLOCK] Permissão negada.`);
            return res.status(403).json({ message: "Você não tem permissão para excluir esta publicação." });
        }

        // 4. Executa a exclusão
        await storage.deleteTweet(tweetId);
        
        console.log(`[DELETE SUCCESS] Tweet ${tweetId} apagado.`);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[DELETE FATAL ERROR]:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
});

// Adicione Logs similares nas rotas de Like e Repost para debug:
routes.post("/tweets/:id/like", isAuthenticated, async (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;
        
        console.log(`[LIKE REQUEST] User ${userId} -> Tweet ${tweetId}`);

        const existingLike = await storage.getLike(userId, tweetId);
        if (existingLike) {
            return res.status(409).json({ message: "Já curtido" });
        }
        await storage.createLike({ userId, tweetId });
        return res.status(201).json({ message: "Curtiu" });
    } catch (error) {
        console.error("[LIKE ERROR]:", error);
        res.status(500).json({ message: "Erro interno" });
    }
});
