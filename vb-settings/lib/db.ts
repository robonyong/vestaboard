import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;
export const getDbClient = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};
