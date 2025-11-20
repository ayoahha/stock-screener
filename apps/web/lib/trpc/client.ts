/**
 * Configuration tRPC côté client
 *
 * Utilisé dans les composants React pour appeler les procedures tRPC
 */

'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './routers/_app';

export const trpc = createTRPCReact<AppRouter>();
