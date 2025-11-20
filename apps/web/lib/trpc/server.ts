/**
 * Configuration tRPC côté serveur
 *
 * Ce fichier configure :
 * - Le context tRPC (accès DB, etc.)
 * - Les procedures (publiques, protégées si auth plus tard)
 * - Le router principal
 */

import { initTRPC } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { ZodError } from 'zod';

/**
 * Contexte tRPC
 *
 * Accessible dans toutes les procedures via `ctx`
 * Contient : session, DB client, etc.
 */
export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  // Pour l'instant, contexte simple
  // En v2 avec auth : récupérer la session Supabase ici
  return {
    // Ajoutez ici ce qui doit être accessible dans les procedures
    // Ex: supabase client, user session, etc.
    headers: opts.req.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialisation tRPC
 */
const t = initTRPC.context<Context>().create({
  // SuperJSON pour sérialiser Date, Map, Set, etc.
  transformer: superjson,

  // Formater les erreurs (inclure Zod errors)
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export des éléments tRPC réutilisables
 */
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware pour procedures protégées (v2 avec auth)
// const isAuthed = t.middleware(({ ctx, next }) => {
//   if (!ctx.session) {
//     throw new TRPCError({ code: 'UNAUTHORIZED' });
//   }
//   return next({
//     ctx: {
//       session: ctx.session,
//     },
//   });
// });
// export const protectedProcedure = t.procedure.use(isAuthed);
