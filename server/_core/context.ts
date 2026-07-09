import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEV_USER: User = {
  id: 1,
  openId: ENV.ownerOpenId || "local-dev-owner",
  name: "Dev User",
  email: "dev@localhost",
  loginMethod: "dev",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

async function getDevUser(): Promise<User> {
  try {
    await db.upsertUser({
      openId: DEV_USER.openId,
      name: DEV_USER.name,
      email: DEV_USER.email,
      loginMethod: DEV_USER.loginMethod,
      role: DEV_USER.role,
    });
    return (await db.getUserByOpenId(DEV_USER.openId)) ?? DEV_USER;
  } catch (error) {
    console.warn("[Auth] Using in-memory dev user:", error);
    return DEV_USER;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  if (!user && !ENV.isProduction) {
    user = await getDevUser();
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
