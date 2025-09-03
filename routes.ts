import type { Express } from "express";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { eq, desc, sql, and } from "drizzle-orm";
import { tweets, likes, users } from "@shared/schema";
import { z } from "zod";
import { insertTweetSchema } from "@shared/schema";
import { processFileUpload, getPublicFilePath } from "./uploads";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuração para servir arquivos estáticos
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Set up authentication routes
  setupAuth(app);
  
  // API routes
  // Get all tweets with user info and like count
  app.get("/api/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const allTweets = await storage.getAllTweets(req.user.id);
      return res.json(allTweets);
    } catch (error) {
      console.error("Error fetching tweets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new tweet
  app.post("/api/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Processar upload de arquivos
      let content = "";
      let mediaUrl = null;
      
      try {
        const { fields, files } = await processFileUpload(req);
        content = fields.content || "";
        
        if (files.media) {
          mediaUrl = files.media.path;
        }
      } catch (error) {
        console.error("Error processing file upload:", error);
        return res.status(400).json({ message: error.message || "Erro ao processar upload" });
      }
      
      if (!content && !mediaUrl) {
        return res.status(400).json({ message: "Conteúdo ou mídia são obrigatórios" });
      }
      
      if (content && content.length > 280) {
        return res.status(400).json({ message: "Tweet excede 280 caracteres" });
      }
      
      const newTweet = await storage.createTweet({
        content,
        userId: req.user.id,
        mediaUrl
      });
      
      return res.status(201).json(newTweet);
    } catch (error) {
      console.error("Error creating tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Like a tweet
  app.post("/api/tweets/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const tweetId = parseInt(req.params.id);
      if (isNaN(tweetId)) {
        return res.status(400).json({ message: "Invalid tweet ID" });
      }
      
      // Check if tweet exists
      const tweet = await storage.getTweetById(tweetId);
      if (!tweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }
      
      // Check if already liked
      const existingLike = await storage.getLike(req.user.id, tweetId);
      if (existingLike) {
        return res.status(400).json({ message: "Tweet already liked" });
      }
      
      // Create like
      await storage.createLike({
        userId: req.user.id,
        tweetId
      });
      
      return res.status(201).json({ message: "Tweet liked successfully" });
    } catch (error) {
      console.error("Error liking tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Unlike a tweet
  app.delete("/api/tweets/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const tweetId = parseInt(req.params.id);
      if (isNaN(tweetId)) {
        return res.status(400).json({ message: "Invalid tweet ID" });
      }
      
      // Check if like exists
      const existingLike = await storage.getLike(req.user.id, tweetId);
      if (!existingLike) {
        return res.status(404).json({ message: "Like not found" });
      }
      
      // Delete like
      await storage.deleteLike(req.user.id, tweetId);
      
      return res.status(200).json({ message: "Tweet unliked successfully" });
    } catch (error) {
      console.error("Error unliking tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get user profile
  app.get("/api/profile/:username", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get user tweets
  app.get("/api/profile/:username/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userTweets = await storage.getUserTweets(user.id, req.user.id);
      return res.json(userTweets);
    } catch (error) {
      console.error("Error fetching user tweets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Endpoint para atualizar o perfil do usuário
  app.post("/api/profile/update", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let username = "";
      let bio = "";
      let profileImage = null;
      
      try {
        const { fields, files } = await processFileUpload(req);
        username = fields.username || "";
        bio = fields.bio || "";
        
        if (files.profileImage) {
          profileImage = files.profileImage.path;
        }
      } catch (error) {
        console.error("Error processing profile update:", error);
        return res.status(400).json({ message: error.message || "Erro ao processar upload" });
      }
      
      if (!username.trim()) {
        return res.status(400).json({ message: "Nome de delegação é obrigatório" });
      }
      
      // Verificar se o nome de usuário já existe (exceto para o próprio usuário)
      if (username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Nome de delegação já está em uso" });
        }
      }
      
      // Atualizar o perfil
      const updatedUser = await storage.updateUser(req.user.id, {
        username,
        bio,
        profileImage
      });
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Admin endpoints
  app.delete("/api/admin/tweets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const tweetId = parseInt(req.params.id);
      
      // Check if tweet exists
      const tweet = await storage.getTweetById(tweetId);
      if (!tweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }
      
      await storage.deleteTweet(tweetId);
      
      return res.status(200).json({ success: true, message: "Tweet deleted successfully" });
    } catch (error) {
      console.error("Error deleting tweet:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Endpoint para listar todos os usuários (apenas para admin)
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      
      return res.status(200).json(allUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Get trending topics (mock for now)
  app.get("/api/trending", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const trendingTopics = [
        { id: 1, name: "GreveDosCaminhoneiros", category: "Política", count: 8245 },
        { id: 2, name: "PreçoDoDiesel", category: "Economia", count: 5189 },
        { id: 3, name: "DesabastecimentoNoBrasil", category: "Transporte", count: 3721 },
        { id: 4, name: "NegociaçãoGoverno", category: "Política", count: 2834 }
      ];
      
      return res.json(trendingTopics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get suggested users (mock for now)
  app.get("/api/users/suggested", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get actual users from the database
      const allUsers = await storage.getRandomUsers(req.user.id, 3);
      const suggestedUsers = allUsers.map(user => ({ user }));
      
      return res.json(suggestedUsers);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
