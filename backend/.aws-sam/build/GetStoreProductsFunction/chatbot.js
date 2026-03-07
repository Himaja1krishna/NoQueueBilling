const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const REGION = process.env.AWS_REGION || "ap-south-1";
const s3 = new S3Client({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });

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

    // Load products and offers in parallel from S3
    const [allProducts, allOffers] = await Promise.all([
        getS3Json(bucket, "mock-store/products.json"),
        getS3Json(bucket, "mock-store/offers.json"),
    ]);

    // Filter by store_id if provided, take up to 50 products
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
${productCatalog}

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
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 300,
                system: systemPrompt,
                messages: [{ role: "user", content: message }],
            }),
        });

        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const reply =
            responseBody.content && responseBody.content[0] && responseBody.content[0].text
                ? responseBody.content[0].text
                : "Sorry, I couldn't generate a response.";

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
