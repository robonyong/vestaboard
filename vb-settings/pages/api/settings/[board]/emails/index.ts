import { Email, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { getDbClient } from "../../../../../lib/db";

export default async function emailsHandler(
  req: NextApiRequest,
  res: NextApiResponse<Email[]>
) {
  const { query, method, body } = req;

  const boardName = Array.isArray(query.board) ? query.board[0] : query.board;

  switch (method) {
    case "GET":
      const prismaClient = getDbClient();
      const emails = await prismaClient.email.findMany({
        where: { boardId: boardName },
      });
      if (!emails.length) {
        res.status(404).end("Subscription not found");
        return;
      }
      res.status(200).json(emails);
      break;
    case "POST":
      const client = getDbClient();
      await client.email.create({ data: body });

      const allEmails = await client.email.findMany({
        where: { boardId: boardName },
      });

      res.status(200).json(allEmails);
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
