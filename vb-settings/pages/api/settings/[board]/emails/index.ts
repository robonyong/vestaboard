import { NextApiRequest, NextApiResponse } from "next";
import { getDbClient } from "../../../../../lib/db";
import { getCalendar } from "../../../../../lib/gcal";
import type { Email } from "@prisma/client";

export default async function emailsHandler(
  req: NextApiRequest,
  res: NextApiResponse<Email[]>
) {
  const { query, method, body } = req;

  const boardName = Array.isArray(query.board) ? query.board[0] : query.board;
  if (!boardName) {
    res.status(400).end("Board is required");
    return;
  }

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
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

      if (!email) {
        res.status(400).end("Email is required");
        return;
      }

      const existingEmail = await client.email.findFirst({
        where: { boardId: boardName, email },
      });

      if (existingEmail) {
        res.status(409).end("Calendar email already exists");
        return;
      }

      let connected = false;
      try {
        await getCalendar(email);
        connected = true;
      } catch {
        connected = false;
      }

      await client.email.create({
        data: {
          email,
          boardId: boardName,
          connected,
        },
      });

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
