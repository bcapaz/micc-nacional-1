import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Check if users already exist
    const existingUsers = await db.select().from(schema.users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      // Create admin user
      const adminUser = {
        username: "admin",
        password: await hashPassword("admin123"),
        name: "Administrador",
        role: "Administrador do Sistema",
        character: "Admin",
        isAdmin: true,
        avatarColor: "#002776" // Brazil blue
      };
      
      await db.insert(schema.users).values(adminUser);
      
      // Create sample users
      const sampleUsers = [
        {
          username: "ministro_transportes",
          password: await hashPassword("password123"),
          name: "Marcos Silva",
          role: "Ministro dos Transportes",
          character: "MinistroTransportes",
          avatarColor: "#002776" // Brazil blue
        },
        {
          username: "rep_caminhoneiros",
          password: await hashPassword("password123"),
          name: "Camila Oliveira",
          role: "Representante dos Caminhoneiros",
          character: "RepresentanteCaminhoneiros",
          avatarColor: "#ffdf00" // Brazil yellow
        },
        {
          username: "pres_petrobras",
          password: await hashPassword("password123"),
          name: "Ana Costa",
          role: "Presidente da Petrobras",
          character: "PresidentePetrobras",
          avatarColor: "#009c3b" // Brazil green
        },
        {
          username: "ministro_economia",
          password: await hashPassword("password123"),
          name: "Paulo Rocha",
          role: "Ministro da Economia",
          character: "MinistroEconomia",
          avatarColor: "#6B8E23" // Olive drab
        }
      ];
      
      for (const user of sampleUsers) {
        await db.insert(schema.users).values(user);
      }
      
      console.log("Users seeded successfully!");
      
      // Get the created users to reference in tweets
      const users = await db.select().from(schema.users);
      const userMap = users.reduce((acc, user) => {
        acc[user.username] = user;
        return acc;
      }, {} as Record<string, schema.User>);
      
      console.log("Seeding tweets...");
      
      // Create sample tweets
      const sampleTweets = [
        {
          content: "O governo está avaliando propostas para reduzir o preço do diesel e atender às reivindicações dos caminhoneiros. Manteremos o diálogo aberto com os representantes da categoria. #GreveDosCaminhoneiros",
          userId: userMap.ministro_transportes.id
        },
        {
          content: "As propostas do governo são insuficientes. Precisamos de uma redução significativa nos preços dos combustíveis e fim da política de preços da Petrobras. A paralisação continua até que nossas demandas sejam atendidas. #GreveContinua",
          userId: userMap.rep_caminhoneiros.id
        },
        {
          content: "A Petrobras está comprometida com o diálogo, mas a política de preços é essencial para a sustentabilidade da empresa. Estamos buscando soluções que equilibrem os interesses da companhia e do mercado consumidor. #GreveCaminhoneiros",
          userId: userMap.pres_petrobras.id
        },
        {
          content: "A paralisação está causando graves prejuízos à economia nacional. Estimamos perdas de R$ 10 bilhões por dia. É urgente encontrarmos uma solução negociada que atenda parcialmente às demandas sem comprometer o equilíbrio fiscal.",
          userId: userMap.ministro_economia.id
        }
      ];
      
      for (const tweet of sampleTweets) {
        await db.insert(schema.tweets).values(tweet);
      }
      
      console.log("Tweets seeded successfully!");
    } else {
      console.log("Database already contains data, skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
