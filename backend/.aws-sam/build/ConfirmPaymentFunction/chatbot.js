const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
};

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

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
            body: JSON.stringify({ error: "Invalid JSON body" }),
        };
    }

    const { message, store_id } = body;
    if (!message || typeof message !== "string") {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Missing or invalid message" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    if (!bucketName) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "MOCK_DATA_BUCKET not configured" }),
        };
    }

    try {
        // Step 1: Load products from S3, filter by store_id, take first 30
        const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: "mock-store/products.json",
        });
        const s3Response = await s3Client.send(getCommand);
        const productsStr = await s3Response.Body.transformToString();
        const allProducts = JSON.parse(productsStr);
        const storeProducts = (allProducts || [])
            .filter((p) => p.store_id === (store_id || ""))
            .slice(0, 30);

        // Step 2: Build system prompt
        const systemPrompt = `You are a helpful shopping assistant for a supermarket. Be brief and helpful. Answer questions about product locations, prices, stock, and offers. Store products: ${JSON.stringify(storeProducts)}`;

        // Step 3: Call Bedrock
        const invokeBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 250,
            system: systemPrompt,
            messages: [{ role: "user", content: message }],
        };

        const invokeResponse = await bedrockClient.send(
            new InvokeModelCommand({
                modelId: MODEL_ID,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(invokeBody),
            })
        );

        // Step 4: Extract reply from response.content[0].text
        const outputStr = new TextDecoder().decode(invokeResponse.body);
        const output = JSON.parse(outputStr);
        const reply =
            output.content && output.content[0] && output.content[0].text
                ? output.content[0].text
                : "Sorry, I couldn't generate a response.";

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ reply }),
        };
    } catch (err) {
        console.error("Chatbot Error:", err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Could not process chat",
                reply: "Sorry, something went wrong. Please try again.",
            }),
        };
    }
};
