import { PrismaClient, Prisma } from "../../prisma/generated/client";

import "dotenv/config";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


// const prisma = new PrismaClient();

export { Prisma };

// for serverless vercel code: 
// import { PrismaClient } from '@prisma/client'
