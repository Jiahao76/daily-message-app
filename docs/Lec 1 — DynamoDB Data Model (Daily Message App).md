# Lec 1 — AWS Region, IAM, and DynamoDB (Daily Message App)

Goal: Set up AWS access correctly and build the DynamoDB data layer so that local code can successfully read and write real AWS data.

Output of this lecture (Commit 2):
- AWS CLI installed
- IAM credentials configured and verified
- AWS region fixed to us-east-1
- DynamoDB table created
- Local code can put/get a daily message successfully

--------------------------------------------------
IMPORTANT: This Lecture Is Self-Contained
--------------------------------------------------

If you follow this lecture from top to bottom, you will NOT hit:

- credential errors
- region mismatch
- hidden AWS prerequisites

Do NOT skip steps.

--------------------------------------------------
Phase A — Fix the AWS Region (Decision First)
--------------------------------------------------

AWS resources are region-scoped.
Code does NOT search across regions.

For this course, we FIX the region to:

    us-east-1 (N. Virginia)

Reasons:

- most AWS docs and examples use it
- all services are available
- good for teaching and demos
- zero downside for this app

From now on:

- Console region = us-east-1
- AWS_REGION = us-east-1
- All resources live in us-east-1



--------------------------------------------------
Phase B — IAM and Credentials (MANDATORY)
--------------------------------------------------

Your laptop is NOT inside AWS.
AWS must know who you are before allowing access.

This is done via IAM credentials.

--------------------------------------------------
What IAM Is (Conceptual)
--------------------------------------------------

IAM = Identity and Access Management

IAM answers:

- Who are you?
- What AWS actions are you allowed to perform?

For local development:

- You use an IAM User
- That user has:
  - Access Key ID (public identifier)
  - Secret Access Key (private secret)

--------------------------------------------------
Step B1 — Install AWS CLI
--------------------------------------------------

### For Mac Users

Check if AWS CLI exists:

    aws --version

If command not found, install using Homebrew.

Check Homebrew:

    brew --version

If Homebrew is missing, install it:

    /bin/bash -c "$(
    curl -fsSL \
    https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
    )"

Then install AWS CLI:

    brew install awscli

Verify:

    aws --version
    
### For Windows Users

Download AWS CLI Installer

1.	Open a browser
2.	Go to the official AWS page:
[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
)
	
3.	Under Windows, download the 64-bit Windows installer (MSI)

Then, install AWS CLI

1.	Double-click the downloaded .msi file
2.	Follow the installer steps
3.	Use default options
4.	Finish installation

Verify:

    aws --version

--------------------------------------------------
Step B2 — Create IAM User (AWS Console)
--------------------------------------------------

1. Open AWS Console
2. Switch region to us-east-1 (top right)
3. Go to IAM
4. Click Users → Create user

User name:
    daily-message-app-dev

Permissions:

- Choose "Attach policies directly"
- Attach this AWS-managed policy:
    AmazonDynamoDBFullAccess

(This is acceptable for learning. We will tighten later.)

Create the user.

--------------------------------------------------
Step B3 — Create Access Key
--------------------------------------------------

Inside the IAM user:

1. Go to "Security credentials"
2. Click "Create access key"
3. Choose "Command Line Interface (CLI)"
4. Create the key
5. COPY:
   - Access Key ID
   - Secret Access Key

Store them safely. You will not see the secret again.

--------------------------------------------------
Step B4 — Configure Credentials Locally
--------------------------------------------------

Run:

    aws configure

Enter:

- AWS Access Key ID: <your key>
- AWS Secret Access Key: <your secret>
- Default region name: us-east-1
- Default output format: json

This saves credentials to ~/.aws/credentials

--------------------------------------------------
Step B5 — Verify Credentials (CRITICAL)
--------------------------------------------------

Run:

    aws sts get-caller-identity

Expected output includes:

- Account ID
- ARN of your IAM user

If this command FAILS, STOP HERE and fix IAM before continuing.

--------------------------------------------------
Phase C — DynamoDB Setup
--------------------------------------------------

Only proceed if Phase B succeeded.

--------------------------------------------------
Step C1 — Create DynamoDB Table
--------------------------------------------------

1. AWS Console → DynamoDB
2. Region: us-east-1
3. Click "Create table"

Settings:
- Table name: DailyMessages
- Partition key: PK (String)
- Sort key: SK (String)

Table settings:
- Capacity mode: On-demand
- All other options: default

Create table and wait until status is ACTIVE.

--------------------------------------------------
Step C2 — DynamoDB Data Model
--------------------------------------------------

We use a single-table design.

Message item:

    PK = "MSG"
    SK = "DATE#YYYY-MM-DD"

Attributes:
- text
- createdAt
- status ("ACTIVE" | "DISABLED")

Ack item (used later):

    PK = "ACK"
    SK = "DATE#YYYY-MM-DD"

--------------------------------------------------
Phase D — Code: DynamoDB Access Layer
--------------------------------------------------

--------------------------------------------------
Step D1 — Install AWS SDK
--------------------------------------------------

From repo root:

    npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

--------------------------------------------------
Step D2 — Create DynamoDB Client Helper
--------------------------------------------------

Create file:

    services/lib/dynamodb.ts

Content:

    import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
    import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    export const ddb = DynamoDBDocumentClient.from(client);

--------------------------------------------------
Step D3 — Create Message Repository
--------------------------------------------------

Create file:

    services/repositories/messageRepo.ts

Content:

    import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
    import { ddb } from "../lib/dynamodb";

    const TABLE_NAME = process.env.DDB_TABLE_NAME || "DailyMessages";

    export async function putDailyMessage(date: string, text: string) {
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

    export async function getDailyMessage(date: string) {
      const res = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: "MSG",
            SK: `DATE#${date}`,
          },
        })
      );

      if (!res.Item || res.Item.status !== "ACTIVE") {
        return null;
      }

      return res.Item.text;
    }

--------------------------------------------------
Phase E — End-to-End Test (Success Gate)
--------------------------------------------------

Create file:

    services/scripts/test-dynamodb.ts

Content:

    import { putDailyMessage, getDailyMessage } from "../repositories/messageRepo";

    async function main() {
      const date = "2025-01-01";
      await putDailyMessage(date, "Happy New Year!");
      const msg = await getDailyMessage(date);
      console.log("Message:", msg);
    }

    main().catch(console.error);

Run from repo root:

    AWS_REGION=us-east-1 DDB_TABLE_NAME=DailyMessages npx ts-node services/scripts/test-dynamodb.ts

Expected output:

    Message: Happy New Year!

--------------------------------------------------
If This Works, You Are DONE
--------------------------------------------------

You have:

- correct AWS credentials
- correct region
- correct IAM permissions
- working DynamoDB access

--------------------------------------------------
Step F — Commit (Commit 2)
--------------------------------------------------

    git add .
    git commit -m "L1: aws region, iam setup, and dynamodb data layer"
    git push origin main

--------------------------------------------------
Definition of Done (Lec 1)
--------------------------------------------------

- aws sts get-caller-identity works
- DynamoDB table exists in us-east-1
- Local script reads/writes DynamoDB successfully
- No credential or region errors
- Commit 2 pushed

--------------------------------------------------
Preview of Lec 2
--------------------------------------------------

Next lecture:
- API Gateway HTTP API
- Lambda handler for GET /today
- API → Lambda → DynamoDB
