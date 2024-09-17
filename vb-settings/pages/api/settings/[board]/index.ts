import { NextApiRequest, NextApiResponse } from "next";
import { getDbClient } from "../../../../lib/db";

type Props = {
  id: string;
  transitStart: string;
  transitEnd: string;
  transitEnabled: boolean;
  calendarEnabled: boolean;
  transitDays: string;
  calendarDays: string;
  // lastCatIncidentDate: string;
};

export default async function boardSettingHandler(
  req: NextApiRequest,
  res: NextApiResponse<Props>
) {
  const { query, method, body } = req;

  const name = Array.isArray(query.board) ? query.board[0] : query.board;

  switch (method) {
    case "GET":
      const prismaClient = getDbClient();
      const boardSettings = await prismaClient.localBoard.findUnique({
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
        transitDays: boardSettings.transitDays,
        calendarDays: boardSettings.calendarDays,
        // lastCatIncidentDate: existingSetting.get("lastCatIncidentDate"),
      });
      break;
    case "PUT":
      const client = getDbClient();
      const updated = await client.localBoard.update({
        select: {
          transitEnabled: true,
          calendarEnabled: true,
          transitStart: true,
          transitEnd: true,
          transitDays: true,
          calendarDays: true,
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
}
