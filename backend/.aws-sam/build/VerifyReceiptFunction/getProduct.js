const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

// Initialize S3 Client
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
    // 1. Extract params from the URL (e.g., /product/12345?store_id=STORE_001)
    const { barcode } = event.pathParameters || {};
    const { store_id } = event.queryStringParameters || {};

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    };

    if (!store_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Missing store_id query parameter" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    const fileName = "mock-store/products.json";

    try {
        // 2. Fetch the JSON file from S3
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });

        const response = await s3Client.send(command);
        const dataStr = await response.Body.transformToString();
        const products = JSON.parse(dataStr);

        // 3. Filter by Barcode and Store_ID
        const product = products.find(p => 
            p.barcode === barcode && p.store_id === store_id
        );

        if (!product) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Product not found in this store" }),
            };
        }

        // 4. Add AI Metadata (Enrichment)
        const enrichedProduct = {
            ...product,
            ai_metadata: {
                // Hardcoded for demo: IDs from mock products so "Often bought with" resolves
                frequently_bought_with: ["PROD-0011", "PROD-0013"],
                scanned_at: new Date().toISOString()
            }
        };

        // 5. Return Success with CORS
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(enrichedProduct),
        };

    } catch (error) {
        console.error("S3 Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch product data" }),
        };
    }
};