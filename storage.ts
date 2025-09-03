import { db } from "@db";
import { users, tweets, likes } from "@shared/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { type InsertUser, type User, type Tweet, type Like, type TweetWithUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User>;
  getAllTweets(currentUserId: number): Promise<TweetWithUser[]>;
  getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]>;
  createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null }): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;
  createLike(like: { userId: number; tweetId: number }): Promise<Like>;
  deleteLike(userId: number, tweetId: number): Promise<void>;
  getLike(userId: number, tweetId: number): Promise<Like | undefined>;
  getRandomUsers(excludeUserId: number, limit: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    const validatedData = insertUserSchema.parse(user);
    const [newUser] = await db.insert(users).values(validatedData).returning();
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result;
  }

  async updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({
        username: data.username,
        bio: data.bio,
        profileImage: data.profileImage
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getAllTweets(currentUserId: number): Promise<TweetWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      user: users,
      likeCount: sql<number>`count(${likes.id})`.mapWith(Number),
      isLiked: sql<boolean>`CASE WHEN exists(
        select 1 from ${likes} where ${likes.tweetId} = ${tweets.id} and ${likes.userId} = ${currentUserId}
      ) THEN true ELSE false END`.mapWith(Boolean),
    })
    .from(tweets)
    .leftJoin(users, eq(tweets.userId, users.id))
    .leftJoin(likes, eq(tweets.id, likes.tweetId))
    .groupBy(tweets.id, users.id)
    .orderBy(desc(tweets.createdAt));
    
    return result;
  }

  async getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      user: users,
      likeCount: sql<number>`count(${likes.id})`.mapWith(Number),
      isLiked: sql<boolean>`CASE WHEN exists(
        select 1 from ${likes} where ${likes.tweetId} = ${tweets.id} and ${likes.userId} = ${currentUserId}
      ) THEN true ELSE false END`.mapWith(Boolean),
    })
    .from(tweets)
    .leftJoin(users, eq(tweets.userId, users.id))
    .leftJoin(likes, eq(tweets.id, likes.tweetId))
    .where(eq(tweets.userId, userId))
    .groupBy(tweets.id, users.id)
    .orderBy(desc(tweets.createdAt));
    
    return result;
  }

  async createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null }): Promise<Tweet> {
    const [newTweet] = await db.insert(tweets).values(tweet).returning();
    return newTweet;
  }

  async getTweetById(id: number): Promise<Tweet | undefined> {
    const result = await db.query.tweets.findFirst({
      where: eq(tweets.id, id)
    });
    return result;
  }

  async deleteTweet(id: number): Promise<void> {
    // Primeiro, excluir todas as curtidas relacionadas a este tweet
    await db.delete(likes).where(eq(likes.tweetId, id));
    
    // Depois, excluir o tweet
    await db.delete(tweets).where(eq(tweets.id, id));
  }

  async createLike(like: { userId: number; tweetId: number }): Promise<Like> {
    const [newLike] = await db.insert(likes).values(like).returning();
    return newLike;
  }

  async deleteLike(userId: number, tweetId: number): Promise<void> {
    await db.delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.tweetId, tweetId)
        )
      );
  }

  async getLike(userId: number, tweetId: number): Promise<Like | undefined> {
    const result = await db.query.likes.findFirst({
      where: and(
        eq(likes.userId, userId),
        eq(likes.tweetId, tweetId)
      )
    });
    return result;
  }

  async getRandomUsers(excludeUserId: number, limit: number): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .where(ne(users.id, excludeUserId))
      .limit(limit);
    
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(users.username);
    return result;
  }
}

export const storage = new DatabaseStorage();
