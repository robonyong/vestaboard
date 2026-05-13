import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

const getDatabaseUrl = () => {
  const url = process.env.PRISMA_DB_URL;

  if (!url) {
    throw new Error("PRISMA_DB_URL is required to initialize PrismaClient");
  }

  return url.startsWith("file:") ? url : `file:${url}`;
};

export const getDbClient = () => {
  if (!prisma) {
    const adapter = new PrismaLibSql({
      url: getDatabaseUrl(),
    });

    prisma = new PrismaClient({ adapter });
  }
  return prisma;
};
