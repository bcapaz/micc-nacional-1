import { db } from "@db";
import { users, tweets, likes, reposts, type Repost } from "@shared/schema";
import { eq, and, desc, sql, ne, ilike, lt } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { type InsertUser, type User, type Tweet, type Like, type TweetWithUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { randomBytes } from "crypto";
import { hashPassword } from "./auth"; // CORRIGIDO: Importação correta de auth

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string; password?: string }): Promise<User>;
  getAllTweets(currentUserId: number, options?: { limit?: number; cursor?: string }): Promise<TweetWithUser[]>;
  getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]>;
  createTweet(tweet: { content: string; userId: number; mediaData?: string | null; parentId?: number; isComment?: boolean; }): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;
  createLike(like: { userId: number; tweetId: number }): Promise<void>;
  deleteLike(userId: number, tweetId: number): Promise<void>;
  getLike(userId: number, tweetId: number): Promise<Like | undefined>;
  getRandomUsers(excludeUserId: number, limit: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getNonAdminUsers(): Promise<User[]>;
  sessionStore: session.Store;
  createComment(comment: { content: string; userId: number; tweetId: number }): Promise<Tweet>;
  getComments(tweetId: number): Promise<TweetWithUser[]>;
  getRepost(userId: number, tweetId: number): Promise<Repost | undefined>;
  createRepost(userId: number, tweetId: number): Promise<void>;
  deleteRepost(userId: number, tweetId: number): Promise<void>;
  getReposts(tweetId: number): Promise<(Repost & { user: User | null })[]>;
  resetUserPassword(userId: number): Promise<string>;
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
    const result = await db.insert(users).values(validatedData).returning();
    if (!result || result.length === 0) throw new Error("Falha ao criar usuário.");
    return result[0];
  }

  async getUser(id: number): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: ilike(users.username, username) });
  }

  async updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string; password?: string; isAdmin?: boolean }): Promise<User> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("Utilizador não encontrado.");
    return result[0];
  }

  async getAllTweets(currentUserId: number, options: { limit?: number; cursor?: string } = {}): Promise<TweetWithUser[]> {
    const { limit = 15, cursor } = options; 
    const result = await db.select({
      id: tweets.id, content: tweets.content, mediaData: tweets.mediaData, userId: tweets.userId,
      createdAt: tweets.createdAt, likeCount: tweets.likeCount, repostCount: tweets.repostCount,
      commentCount: sql<number>`(SELECT count(*) FROM ${tweets} AS comments WHERE comments.parent_id::integer = ${tweets.id}::integer)`.mapWith(Number),
      user: { id: users.id, username: users.username, name: users.name, profileImage: users.profileImage, avatarColor: users.avatarColor },
      isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId}::integer = ${tweets.id}::integer AND ${likes.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
      isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId}::integer = ${tweets.id}::integer AND ${reposts.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.userId, users.id))
    .where(and(eq(tweets.isComment, false), cursor ? lt(tweets.createdAt, new Date(cursor)) : undefined))
    .orderBy(desc(tweets.createdAt))
    .limit(limit);
    return result as unknown as TweetWithUser[];
  }

  async getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]> {
    const profileUser = await this.getUser(userId);
    const profileUsername = profileUser?.username ?? '';
    const originalTweets = await db.select({
      id: tweets.id, content: tweets.content, mediaData: tweets.mediaData, userId: tweets.userId,
      createdAt: tweets.createdAt, repostCount: tweets.repostCount,
      likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.tweetId}::integer = ${tweets.id}::integer)`.mapWith(Number),
      // CORRIGIDO: Adicionado ::integer aqui
      commentCount: sql<number>`(SELECT COUNT(*) FROM ${tweets} AS comments WHERE (comments.parent_id)::integer = (${tweets.id})::integer)`.mapWith(Number),
      isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId}::integer = ${tweets.id}::integer AND ${likes.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
      isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId}::integer = ${tweets.id}::integer AND ${reposts.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
      user: { id: users.id, username: users.username, name: users.name, profileImage: users.profileImage, avatarColor: users.avatarColor },
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.userId, users.id))
    .where(and(eq(tweets.userId, userId), eq(tweets.isComment, false)));

    const formattedOriginals = originalTweets.map(t => ({ ...t, type: 'original' as const, activityTimestamp: t.createdAt, repostedBy: null }));

    const userReposts = await db.select({
      repostTimestamp: reposts.createdAt,
      originalTweet: {
        id: tweets.id, content: tweets.content, mediaData: tweets.mediaData, userId: tweets.userId,
        createdAt: tweets.createdAt, repostCount: tweets.repostCount,
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.tweetId}::integer = ${tweets.id}::integer)`.mapWith(Number),
        // CORRIGIDO: Adicionado ::integer aqui também
        commentCount: sql<number>`(SELECT count(*) FROM ${tweets} AS comments WHERE (comments.parent_id)::integer = (${tweets.id})::integer)`.mapWith(Number),
        isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId}::integer = ${tweets.id}::integer AND ${likes.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
        isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId}::integer = ${tweets.id}::integer AND ${reposts.userId}::integer = ${currentUserId}::integer)`.mapWith(Boolean),
        user: { id: users.id, username: users.username, name: users.name, profileImage: users.profileImage, avatarColor: users.avatarColor },
      }
    })
    .from(reposts)
    .innerJoin(tweets, eq(reposts.tweetId, tweets.id))
    .innerJoin(users, eq(tweets.userId, users.id))
    .where(eq(reposts.userId, userId));

    const formattedReposts = userReposts.map(r => ({ ...r.originalTweet, type: 'repost' as const, activityTimestamp: r.repostTimestamp, repostedBy: profileUsername }));
    const feed = [...formattedOriginals, ...formattedReposts];
    feed.sort((a, b) => new Date(b.activityTimestamp).getTime() - new Date(a.activityTimestamp).getTime());
    return feed as unknown as TweetWithUser[];
  }

  async createTweet(tweet: { content: string; userId: number; mediaData?: string | null; parentId?: number; isComment?: boolean; }): Promise<Tweet> {
    // CORRIGIDO: Adicionado o ... (spread operator) para salvar os dados corretamente
    const [newTweet] = await db.insert(tweets).values({
      ...tweet, 
      likeCount: 0,
      repostCount: 0
    }).returning();
    return newTweet;
  }

  async getTweetById(id: number): Promise<Tweet | undefined> {
    return await db.query.tweets.findFirst({ where: eq(tweets.id, id) });
  }

  async deleteTweet(id: number): Promise<void> {
    await db.delete(likes).where(eq(likes.tweetId, id));
    await db.delete(reposts).where(eq(reposts.tweetId, id));
    await db.delete(tweets).where(eq(tweets.parentId, id));
    await db.delete(tweets).where(eq(tweets.id, id));
  }

  async createLike(like: { userId: number; tweetId: number }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(likes).values(like);
      await tx.update(tweets).set({ likeCount: sql`${tweets.likeCount} + 1` }).where(eq(tweets.id, like.tweetId));
    });
  }

  async deleteLike(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(likes).where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)));
      await tx.update(tweets).set({ likeCount: sql`${tweets.likeCount} - 1` }).where(eq(tweets.id, tweetId));
    });
  }

  async getLike(userId: number, tweetId: number): Promise<Like | undefined> {
    return await db.query.likes.findFirst({ where: and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)) });
  }

  async getRandomUsers(excludeUserId: number, limit: number): Promise<User[]> {
    return await db.select().from(users).where(ne(users.id, excludeUserId)).limit(limit);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }
  
  async getNonAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false)).orderBy(users.username);
  }

  async createComment(comment: { content: string; userId: number; tweetId: number; }): Promise<Tweet> {
    const [newComment] = await db.insert(tweets).values({
      content: comment.content,
      userId: comment.userId,
      parentId: comment.tweetId,
      isComment: true,
      createdAt: new Date(),
      likeCount: 0
    }).returning();
    return newComment;
  }

  async getComments(tweetId: number): Promise<TweetWithUser[]> {
    const result = await db.query.tweets.findMany({
      where: (tweets, { eq }) => eq(tweets.parentId, tweetId),
      with: { user: { columns: { id: true, username: true, profileImage: true, avatarColor: true } } },
      orderBy: (tweets, { desc }) => [desc(tweets.createdAt)]
    });
    return result.map(tweet => ({ ...tweet, isLiked: false, likeCount: tweet.likeCount || 0 })) as unknown as TweetWithUser[];
  }

  async getRepost(userId: number, tweetId: number): Promise<Repost | undefined> {
    return await db.query.reposts.findFirst({ where: and(eq(reposts.userId, userId), eq(reposts.tweetId, tweetId)) });
  }

  async createRepost(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(reposts).values({ userId, tweetId });
      await tx.update(tweets).set({ repostCount: sql`${tweets.repostCount} + 1` }).where(eq(tweets.id, tweetId));
    });
  }

  async deleteRepost(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(reposts).where(and(eq(reposts.userId, userId), eq(reposts.tweetId, tweetId)));
      await tx.update(tweets).set({ repostCount: sql`${tweets.repostCount} - 1` }).where(eq(tweets.id, tweetId));
    });
  }

  async getReposts(tweetId: number): Promise<(Repost & { user: User | null })[]> {
    return await db.query.reposts.findMany({
        where: eq(reposts.tweetId, tweetId),
        with: { user: true },
        orderBy: desc(reposts.createdAt)
    });
  }

  async resetUserPassword(userId: number): Promise<string> {
    const newPassword = `mudar${randomBytes(3).toString('hex')}`;
    const hashedPassword = await hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
    return newPassword;
  }
}

export const storage = new DatabaseStorage();
