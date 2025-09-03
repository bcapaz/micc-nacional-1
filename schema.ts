import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  profileImage: text("profile_image"),
  avatarColor: text("avatar_color").notNull().default("#009c3b"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentId: integer("parent_id").references(() => tweets.id),
  isComment: boolean("is_comment").default(false),
  likeCount: integer("like_count").default(0),
  // --- ADICIONADO ---
  // Para contar os reposts de forma eficiente, similar ao likeCount.
  repostCount: integer("repost_count").default(0)
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
    return {
        // --- ADICIONADO ---
        // Garante que um usuário só pode repostar um tweet uma única vez.
        uniqueRepost: unique('unique_repost').on(table.userId, table.tweetId),
    };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tweets: many(tweets),
  likes: many(likes),
  comments: many(comments),
  reposts: many(reposts)
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  user: one(users, { fields: [tweets.userId], references: [users.id] }),
  likes: many(likes),
  comments: many(comments),
  reposts: many(reposts),
  parent: one(tweets, {
    fields: [tweets.parentId],
    references: [tweets.id],
    relationName: "tweet_replies"
  }),
  replies: many(tweets, {
    relationName: "tweet_replies"
  })
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [likes.tweetId], references: [tweets.id] })
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [comments.tweetId], references: [tweets.id] })
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(users, { fields: [reposts.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [reposts.tweetId], references: [tweets.id] })
}));

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Nome de Delegação deve ter pelo menos 3 caracteres"),
  password: (schema) => schema.min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: (schema) => schema.min(2, "Nome completo deve ter pelo menos 2 caracteres"),
}).omit({ id: true, createdAt: true, isAdmin: true, bio: true, profileImage: true });

export const updateUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Nome de Delegação deve ter pelo menos 3 caracteres"),
  bio: (schema) => schema.optional(),
  profileImage: (schema) => schema.optional(),
}).omit({ id: true, createdAt: true, isAdmin: true, password: true, name: true });

export const insertTweetSchema = createInsertSchema(tweets, {
  content: (schema) => schema.max(280, "Tweet deve ter menos de 280 caracteres")
}).omit({ id: true, createdAt: true, mediaUrl: true });

export const insertLikeSchema = createInsertSchema(likes).omit({ id: true, createdAt: true });

export const insertCommentSchema = createInsertSchema(comments, {
  content: (schema) => schema.max(280, "Comentário deve ter menos de 280 caracteres")
}).omit({ id: true, createdAt: true });

export const insertRepostSchema = createInsertSchema(reposts).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Tweet = typeof tweets.$inferSelect;
export type NewTweet = typeof tweets.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Repost = typeof reposts.$inferSelect;
export type NewRepost = typeof reposts.$inferInsert;

export type TweetWithUser = {
  id: number;
  content: string;
  userId: number;
  createdAt: string;
  parentId?: number;
  isComment?: boolean;
  user: {
    id: number;
    username: string;
    profileImage?: string;
  };
  likeCount?: number;
  isLiked?: boolean;
  // --- ADICIONADO ---
  repostCount?: number;
  isReposted?: boolean;
};

export type CommentWithUser = Comment & {
  user: Pick<User, 'id' | 'username' | 'profileImage' | 'avatarColor'>;
};

export type RepostWithUser = Repost & {
  user: Pick<User, 'id' | 'username' | 'profileImage' | 'avatarColor'>;
};