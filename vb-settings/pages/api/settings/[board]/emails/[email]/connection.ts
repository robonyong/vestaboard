import { NextApiRequest, NextApiResponse } from "next";
import { getDbClient } from "../../../../../../lib/db";
import { getCalendar } from "../../../../../../lib/gcal";

export default async function emailsHandler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  const { query, method, body } = req;

  const boardName = Array.isArray(query.board) ? query.board[0] : query.board;
  const email = Array.isArray(query.email) ? query.email[0] : query.email;

  switch (method) {
    case "GET":
      const prismaClient = getDbClient();
      const dbEmail = await prismaClient.email.findFirstOrThrow({
        where: { boardId: boardName, email: email },
      });
      if (!dbEmail) {
        res.status(404).end("Subscription not found");
        return;
      }

      try {
        await getCalendar(dbEmail.email);
        const { count } = await prismaClient.email.updateMany({
          data: { connected: true },
          where: { email, boardId: boardName },
        });

        if (count > 0) {
          res.revalidate(`/api/settings/${boardName}/emails`);
        }
        res.status(204).end();
      } catch (error) {
        const { count } = await prismaClient.email.updateMany({
          data: { connected: false },
          where: { email, boardId: boardName },
        });
        if (count > 0) {
          res.revalidate(`/api/settings/${boardName}/emails`);
        }
        res
          .status(400)
          .end(
            "Could not reach calendar. Make sure to share it with the vestaboard service account."
          );
      }
      break;
    default:
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
