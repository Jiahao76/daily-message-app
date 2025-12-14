# Lec 3 — Bulk Register API: POST /messages/bulk

Goal: Add an API that lets you **pre-register many daily messages at once** and store them safely in DynamoDB.

Output of this lecture (Commit 4):

- New endpoint: POST /messages/bulk
- Lambda can write multiple items to DynamoDB
- BatchWriteItem used correctly
- Overwrite safety via `force=true`
- API Gateway + Lambda + DynamoDB write path works end-to-end

--------------------------------------------------
Pre-Flight Checklist (Do NOT Skip)
--------------------------------------------------

Before starting Lec 3, confirm:

1) Lec 2 works:

   - GET /today returns either a message or MESSAGE_NOT_FOUND
   - API Gateway → Lambda → DynamoDB path is correct

2) You know your Invoke URL, including stage:

   - Example: https://xxxx.execute-api.us-east-1.amazonaws.com/prod

--------------------------------------------------
What We Are Building (Conceptual)
--------------------------------------------------

Until now:

- You could only insert messages manually (console or script)

Now:

- You can preload many messages in one request
- Typical use:
  - prepare messages for the next 7 / 30 / 90 days
  - then each day just call GET /today

This is a **write-heavy API**, unlike Lec 2 which was read-only.

--------------------------------------------------
API Contract (Final)
--------------------------------------------------

Method: POST  
Path: /messages/bulk  
Content-Type: application/json

Request body (date-based):

    {
      "items": [
        { "date": "2025-01-01", "text": "Happy New Year!" },
        { "date": "2025-01-02", "text": "Day 2 message" }
      ],
      "force": false
    }

Alternative request body (startDate + texts):

    {
      "startDate": "2025-01-10",
      "texts": [
        "Message for day 1",
        "Message for day 2",
        "Message for day 3"
      ],
      "force": true
    }

Meaning of force:

- force = false → do NOT overwrite existing items
- force = true  → overwrite if item already exists

--------------------------------------------------
Important DynamoDB Concept: Batch Writes
--------------------------------------------------

DynamoDB rules:

- BatchWriteItem supports up to 25 items per request
- Batch writes do NOT support conditions
- Unprocessed items may be returned (retry needed)

For this lecture:

- We keep batches ≤ 25
- We retry unprocessed items once
- This is enough for small-scale use



--------------------------------------------------
Step 1 — Create Bulk Register Lambda
--------------------------------------------------

AWS Console → Lambda → Create function

Settings:

- Function name: BulkRegisterLambda
- Runtime: Node.js 20.x
- Architecture: x86_64
- Role: Create a new role with basic Lambda permissions

After creation, in configuration, environment variable.

- Add environment variable:
  - `DDB_TABLE_NAME` = DailyMessages

--------------------------------------------------
Step 2 — Update Lambda IAM Role (Write Permission)
--------------------------------------------------

Your Lambda now needs write access.

1) AWS Console → Lambda → BulkRegisterLambda

2) Configuration → Permissions

3) Click Role name

4) Attach policy:

    AmazonDynamoDBFullAccess

(For learning. We will tighten permissions later.)


--------------------------------------------------
Step 3 — Bulk Register Lambda Logic (Conceptual)
--------------------------------------------------

The Lambda must:

1) Parse request body

2) Normalize input into a list of {date, text}

3) Validate date format (YYYY-MM-DD)

4) Write items in batches

5) Respect `force` flag

6) Return a summary

--------------------------------------------------
Step 4 — Lambda Code (Console Paste Version)
--------------------------------------------------

In Lambda console:

- Open BulkRegisterLambda
- Replace code with the following
- Click Deploy

Paste exactly:

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

function expandItems(body) {
  if (body.items) {
    return body.items;
  }

  if (body.startDate && body.texts) {
    const start = new Date(body.startDate);
    return body.texts.map((text, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        text
      };
    });
  }

  throw new Error("Invalid request body");
}

export const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const force = body.force === true;

  const items = expandItems(body);

  if (items.length > 25) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "MAX_25_ITEMS_PER_REQUEST" })
    };
  }

  if (!force) {
    for (const item of items) {
      const res = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: "MSG", SK: `DATE#${item.date}` }
        })
      );
      if (res.Item) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            error: "ITEM_ALREADY_EXISTS",
            date: item.date
          })
        };
      }
    }
  }

  const putRequests = items.map((item) => ({
    PutRequest: {
      Item: {
        PK: "MSG",
        SK: `DATE#${item.date}`,
        text: item.text,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      }
    }
  }));

  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests
      }
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      written: items.length,
      force
    })
  };
};
```

--------------------------------------------------
Step 5 — Create API Gateway Route
--------------------------------------------------

In API Gateway, click `daily-message-api`, then

1) Routes → Add route

2) Method: POST

3) Path: /messages/bulk

4) Integration: BulkRegisterLambda

5) Save

Auto-deploy should be enabled.

--------------------------------------------------
Step 6 — Test Bulk Register API
--------------------------------------------------

Recall the **invoke url** you got in the last lecture. Then in the terminal, try

    curl -X POST <INVOKE_URL>/messages/bulk \
      -H "Content-Type: application/json" \
      -d '{
        "startDate": "2025-12-13",
        "texts": [
          "Message day 1",
          "Message day 2",
          "Message day 3"
        ],
        "force": true
      }'

Expected response:

    {
      "written": 3,
      "force": true
    }

Then test:

    curl <INVOKE_URL>/today

--------------------------------------------------
Step 7 — Save This Lecture and Commit (Commit 4)
--------------------------------------------------

Save as:

    docs/lec-3-bulk-register-api.md

Commit:

    git add .
    git commit -m "L3: bulk register API with batch write"
    git push origin main

--------------------------------------------------
Definition of Done (Lec 3)
--------------------------------------------------

- POST /messages/bulk works
- Multiple messages written in one request
- force flag prevents accidental overwrite
- GET /today returns preloaded message
- Commit 4 pushed

--------------------------------------------------
Preview of Lec 4
--------------------------------------------------

Next lecture:

- EventBridge scheduled check
- SQS queue
- Detect missing daily message automatically
