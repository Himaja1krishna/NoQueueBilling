# Connect Amazon Personalize to NoQueueBilling

This guide walks you through creating an AWS Personalize campaign and connecting it to the app so the **Recommendations** section on the Home screen shows personalized product picks.

## Overview

- The app calls `GET /recommendations/{user_id}`.
- The backend Lambda uses **Amazon Personalize** when `PERSONALIZE_CAMPAIGN_ARN` is set.
- If no campaign is set, it falls back to the first few products from S3.

---

## Step 1: Create a Dataset Group

1. Open **AWS Console** → **Amazon Personalize** → **Dataset groups**.
2. Click **Create dataset group**.
3. **Name**: e.g. `noqueue-recommendations`.
4. **Domain**: choose **E-commerce** (or **Custom** if you prefer).
5. Click **Next**.

---

## Step 2: Create the Items Dataset (Products)

Personalize needs an **Items** dataset with your products. Each item must have an `ITEM_ID` that matches your app’s `product_id` (e.g. `PROD-0001`).

1. In the dataset group, go to **Datasets** → **Create dataset**.
2. **Dataset type**: **Items**.
3. **Dataset name**: e.g. `noqueue-items`.
4. **Schema**: use a schema that includes at least `itemId`. Example:

```json
{
  "type": "record",
  "name": "Items",
  "namespace": "com.amazon.personalize.schema",
  "fields": [
    { "name": "itemId", "type": "string" },
    { "name": "category", "type": "string", "categorical": true },
    { "name": "brand", "type": "string", "categorical": true }
  ],
  "version": "1.0"
}
```

5. Create the dataset, then **Import data**:
   - **Import name**: e.g. `noqueue-items-import`.
   - **Data location**: S3 path to a CSV file, e.g.  
     `s3://your-bucket/personalize/items/items.csv`

**Items CSV format** (header required):

```csv
itemId,category,brand
PROD-0001,dairy,Amul
PROD-0002,grains,Fortune
PROD-0003,beverages,Tata
...
```

- `itemId` must match `product_id` in your `products.json` / app.
- Export your products from `backend/mock-store/products.json` to CSV with columns `itemId` (from product_id), `category`, `brand`, etc., and upload to S3.

---

## Step 3: Create the Interactions Dataset

Interactions describe user behavior (views, cart adds, purchases). Personalize uses this to learn preferences.

1. In the same dataset group, **Create dataset** → **Interactions**.
2. **Dataset name**: e.g. `noqueue-interactions`.
3. **Schema** example:

```json
{
  "type": "record",
  "name": "Interactions",
  "namespace": "com.amazon.personalize.schema",
  "fields": [
    { "name": "USER_ID", "type": "string" },
    { "name": "ITEM_ID", "type": "string" },
    { "name": "TIMESTAMP", "type": "long" },
    { "name": "EVENT_TYPE", "type": "string" }
  ],
  "version": "1.0"
}
```

4. **Import data** from S3. CSV format:

```csv
USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE
user-123,PROD-0001,1709900000,Purchase
user-123,PROD-0006,1709901000,View
guest-456,PROD-0003,1709902000,Purchase
...
```

- `USER_ID`: same as the app’s `userId` (e.g. Cognito sub or `guest`).
- `ITEM_ID`: same as `product_id` / Items `itemId`.
- `TIMESTAMP`: Unix seconds.
- `EVENT_TYPE`: e.g. `Purchase`, `View`, `AddToCart`. Use consistently.

For a quick test you can create a small CSV with a few rows and upload to S3.

---

## Step 4: Create a Solution (Recipe + Training)

1. In the dataset group, open **Solutions** → **Create solution**.
2. **Solution name**: e.g. `noqueue-user-personalization`.
3. **Recipe**: choose **User-Personalization** (recommended for “recommended for you” by user).
4. Start **training**. Training can take 30 minutes to several hours.
5. Wait until **Solution status** is **Active**.

---

## Step 5: Create a Campaign

1. Open the **solution** → **Create campaign**.
2. **Campaign name**: e.g. `noqueue-recs-campaign`.
3. **Minimum provisioned TPS**: e.g. `1`.
4. Create the campaign and wait until **Status** is **Active**.

---

## Step 6: Get the Campaign ARN

1. Open the **campaign** you created.
2. Copy the **Campaign ARN**, e.g.  
   `arn:aws:personalize:ap-south-1:123456789012:campaign/noqueue-recs-campaign`

---

## Step 7: Connect the Campaign to the Backend

Pass the campaign ARN into SAM so the Lambda can call Personalize.

**Option A – SAM deploy (recommended)**

```bash
cd backend
sam build
sam deploy --parameter-overrides PersonifyCampaignArn="arn:aws:personalize:REGION:ACCOUNT:campaign/CAMPAIGN_NAME" ...
```

Include your other existing parameters (e.g. `MockDataBucket`, `KmsKeyId`, `RzpKeyId`, etc.) in the same `--parameter-overrides` or in `samconfig.toml`.

**Option B – samconfig.toml**

Edit `backend/samconfig.toml` and set `PersonifyCampaignArn` in `parameter_overrides`:

```toml
parameter_overrides = "MockDataBucket=\"your-bucket\" PersonifyCampaignArn=\"arn:aws:personalize:ap-south-1:ACCOUNT:campaign/noqueue-recs-campaign\" ..."
```

Then run:

```bash
sam build && sam deploy
```

---

## Step 8: IAM Permissions

The **GetRecommendationsFunction** Lambda already has a policy that allows `personalize-runtime:GetRecommendations`. Ensure the Lambda execution role is not restricted to a specific resource so it can call your campaign (e.g. `Resource: "*"` for Personalize in that role).

---

## Step 9: Send Real Interactions (Optional but Recommended)

For better recommendations over time:

- When a user views a product, add an interaction (e.g. `View`) to your data pipeline.
- When a user adds to cart or completes a purchase, add `AddToCart` or `Purchase`.
- Periodically export new interactions to S3 and run a **new import** into the same Interactions dataset, then **update the solution** or retrain and create a new campaign when you want to refresh the model.

---

## Checklist

- [ ] Dataset group created (E-commerce or Custom).
- [ ] Items dataset created and imported (CSV with `itemId` = product_id).
- [ ] Interactions dataset created and imported (USER_ID, ITEM_ID, TIMESTAMP, EVENT_TYPE).
- [ ] Solution created and trained (e.g. User-Personalization), status Active.
- [ ] Campaign created, status Active.
- [ ] Campaign ARN set in SAM (`PersonifyCampaignArn`) and backend redeployed.
- [ ] App Home screen **Recommendations** section shows personalized products (or fallback list if no recs yet).

---

## Troubleshooting

- **Empty or fallback recommendations**: Ensure Items and Interactions imports have finished successfully and the solution has been trained. New users or users with no interactions may get fallback results.
- **Wrong region**: Create the dataset group and campaign in the same AWS region as your Lambda (e.g. `ap-south-1`). The Lambda uses `AWS_REGION`; Personalize client must match.
- **Invalid userId**: The app sends `userId` from the store (e.g. Cognito sub or `guest`). Use the same IDs in your Interactions CSV so Personalize can match them.
