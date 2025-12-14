import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamodb";

const TABLE_NAME = process.env.DDB_TABLE_NAME || "DailyMessages";

export async function putDailyMessage(
  date: string,
  text: string
): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: "MSG",
        SK: `DATE#${date}`,
        text,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      },
    })
  );
}

export async function getDailyMessage(
  date: string
): Promise<string | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "MSG",
        SK: `DATE#${date}`,
      },
    })
  );

  if (!res.Item) {
    return null;
  }

  if (res.Item.status !== "ACTIVE") {
    return null;
  }

  return res.Item.text;
}