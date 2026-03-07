const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
    const { store_id } = event.pathParameters || {};
    const { q } = event.queryStringParameters || {};
    const searchQuery = (q || "").trim().toLowerCase();

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    };

    if (!store_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Missing store_id in path" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    const key = "mock-store/products.json";

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await s3Client.send(command);
        const dataStr = await response.Body.transformToString();
        const allProducts = JSON.parse(dataStr);

        let products = allProducts.filter((p) => p.store_id === store_id);

        if (searchQuery) {
            products = products.filter((p) => {
                const name = (p.name || "").toLowerCase();
                const brand = (p.brand || "").toLowerCase();
                const category = (p.category || "").toLowerCase();
                return name.includes(searchQuery) ||
                    brand.includes(searchQuery) ||
                    category.includes(searchQuery);
            });
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error("getStoreProducts S3 Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch products" }),
        };
    }
};
