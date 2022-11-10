import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

type Props = {
  id: string;
  transitStart: string;
  transitEnd: string;
  transitEnabled: boolean;
  calendarEnabled: boolean;
  // lastCatIncidentDate: string;
};

let prisma: PrismaClient;
const getDbClient = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export default async (req: NextApiRequest, res: NextApiResponse<Props>) => {
  const { query, method, body } = req;

  const name = Array.isArray(query.id) ? query.id[0] : query.id;

  switch (method) {
    case "GET":
      const prismaClient = getDbClient();
      const boardSettings = await prismaClient.local_boards.findUnique({
        where: { name: name },
      });
      if (!boardSettings) {
        res.status(404).end("Subscription not found");
        return;
      }
      res.status(200).json({
        id: boardSettings.name,
        transitStart: boardSettings.transitStart,
        transitEnd: boardSettings.transitEnd,
        transitEnabled: boardSettings.transitEnabled,
        calendarEnabled: boardSettings.calendarEnabled,
        // lastCatIncidentDate: existingSetting.get("lastCatIncidentDate"),
      });
      break;
    case "PUT":
      const client = getDbClient();
      const updated = await client.local_boards.update({
        select: {
          transitEnabled: true,
          calendarEnabled: true,
          transitStart: true,
          transitEnd: true,
        },
        data: body,
        where: {
          name,
        },
      });

      res.status(200).json({ id: name, ...updated } as Props);
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};
