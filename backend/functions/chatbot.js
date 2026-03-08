const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const REGION = process.env.AWS_REGION || "ap-south-1";
const s3 = new S3Client({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });

// Use APAC inference profile in ap-south-1 so Nova Lite is available (single-region Nova Lite not in ap-south-1)
const BEDROCK_MODEL_ID = REGION === "ap-south-1" ? "apac.amazon.nova-lite-v1:0" : "amazon.nova-lite-v1:0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
};

async function getS3Json(bucket, key) {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return JSON.parse(await res.Body.transformToString());
}

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Invalid JSON" }),
        };
    }

    const { message, user_id, store_id } = body;

    if (!message || typeof message !== "string") {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Message required" }),
        };
    }

    const bucket = process.env.MOCK_DATA_BUCKET;
    if (!bucket) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "MOCK_DATA_BUCKET not configured" }),
        };
    }

    let allProducts = [];
    let allOffers = [];
    try {
        [allProducts, allOffers] = await Promise.all([
            getS3Json(bucket, "mock-store/products.json"),
            getS3Json(bucket, "mock-store/offers.json"),
        ]);
    } catch (s3Err) {
        console.error("S3 load error:", s3Err);
    }

    // Filter by store_id if provided
    const products = store_id
        ? (allProducts || []).filter((p) => p.store_id === store_id)
        : (allProducts || []);

    const offers = store_id
        ? (allOffers || []).filter((o) => o.store_id === store_id)
        : (allOffers || []);

    // Build product catalog text using actual field names
    const productCatalog = products
        .map((p) => {
            const price = p.discounted_price ?? p.base_price;
            const sale = p.is_on_sale ? ` [ON SALE ₹${p.base_price}→₹${price}]` : ` ₹${price}`;
            return `- ${p.name}${sale} | ${p.section || p.category} | ${p.aisle}${p.shelf ? ", " + p.shelf : ""} | Barcode: ${p.barcode}`;
        })
        .join("\n");

    // Build active offers text
    const now = new Date();
    const activeOffers = offers
        .filter((o) => !o.valid_until || new Date(o.valid_until) > now)
        .map((o) => {
            const discount = o.discount_pct
                ? `${o.discount_pct}% off`
                : o.discount_flat
                ? `₹${o.discount_flat} off`
                : "Special offer";
            const code = o.code ? ` (Code: ${o.code})` : "";
            return `- ${o.title}: ${o.description} — ${discount}${code}`;
        })
        .join("\n");

    const systemPrompt = `You are a helpful shopping assistant for the NoQueueBilling smart self-checkout app. Help customers find products, check prices, locate items, and discover offers.

STORE INFORMATION:
Name: FreshMart Supermarket
Location: Hitech City, Hyderabad
Timings: 8:00 AM – 10:00 PM (All days)
Self-checkout available throughout the store

STORE LAYOUT:
Aisle 1 – Beverages & Juices (near entrance)
Aisle 2 – Snacks & Biscuits
Aisle 3 – Dairy & Eggs (refrigerated section)
Aisle 4 – Staples: Rice, Atta, Dal, Oil
Aisle 5 – Personal Care & Hygiene
Aisle 6 – Household & Cleaning
Aisle 7 – Frozen & Refrigerated Foods
Aisle 8 – Fruits & Vegetables (near exit)

PRODUCT CATALOG:
${productCatalog || "Product catalog unavailable."}

CURRENT OFFERS & DISCOUNTS:
${activeOffers || "No active offers at the moment."}

INSTRUCTIONS:
- Be helpful, friendly and concise
- When asked about location, give the aisle number and section clearly — e.g. "Amul Butter is in Aisle 3 – Dairy & Eggs, Top shelf"
- When asked about price, give the exact current price using ₹
- Mention relevant offers when applicable
- If a product is not in the catalog, say so politely and suggest similar items
- Keep responses under 3 sentences
- Use ₹ for prices
- Respond in the same language as the user (Hindi or English)
- Never make up products not in the catalog`;

    try {
        const command = new InvokeModelCommand({
            modelId: BEDROCK_MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                schemaVersion: "messages-v1",
                system: [{ text: systemPrompt }],
                messages: [{ role: "user", content: [{ text: message }] }],
                inferenceConfig: { maxTokens: 300 },
            }),
        });

        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const content = responseBody?.output?.message?.content;
        let reply = "Sorry, I couldn't generate a response.";
        if (Array.isArray(content) && content.length > 0) {
            const first = content[0];
            reply = (first && (first.text ?? first.content)) || reply;
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ reply, user_id, store_id }),
        };
    } catch (error) {
        console.error("Bedrock error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Chatbot unavailable",
                reply: "Sorry, something went wrong. Please try again.",
                details: error.message,
            }),
        };
    }
};
