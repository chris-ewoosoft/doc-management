import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { documentsRouter } from "./routers/documents";
import { groupsRouter } from "./routers/groups";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  groups: groupsRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
