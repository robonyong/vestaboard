import { Firestore } from "@google-cloud/firestore";
import { NextApiRequest, NextApiResponse } from "next";

const SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID;
const CACHE_CREDENTIALS_PATH = process.env.CACHE_CREDENTIALS_PATH;
const PROJECT_ID = process.env.PROJECT_ID;

type Props = {
  id: string;
  transitStart: string;
  transitEnd: string;
  transitEnabled: boolean;
  calendarEnabled: boolean;
  lastCatIncidentDate: string;
};

let firestoreClient: Firestore | null = null;

const getFirestoreClient = (): Firestore => {
  if (!firestoreClient) {
    firestoreClient = new Firestore({
      keyFilename: CACHE_CREDENTIALS_PATH,
      projectId: PROJECT_ID,
    });
  }
  return firestoreClient;
};

export default async (req: NextApiRequest, res: NextApiResponse<Props>) => {
  const {
    query: { id },
    method,
    body,
  } = req;

  switch (method) {
    case "GET":
      if (id === SUBSCRIPTION_ID) {
        const client = getFirestoreClient();
        const document = client.doc(`subscriptions/${id}`);
        const existingSetting = await document.get();

        res.status(200).json({
          id,
          transitStart: existingSetting.get("transitStart"),
          transitEnd: existingSetting.get("transitEnd"),
          transitEnabled: existingSetting.get("transitEnabled"),
          calendarEnabled: existingSetting.get("calendarEnabled"),
          lastCatIncidentDate: existingSetting.get("lastCatIncidentDate"),
        });
      } else {
        res.status(404).end("Subscription not found");
      }
      break;
    case "PUT":
      if (id === SUBSCRIPTION_ID) {
        const client = getFirestoreClient();
        const document = client.doc(`subscriptions/${id}`);
        await document.update(body);
        const updatedResult = await document.get();
        const updatedDocument = updatedResult.data();

        res.status(200).json({ id, ...updatedDocument } as Props);
      } else {
        res.status(404).end("Subscription not found");
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};
