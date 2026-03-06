const { PersonalizeRuntimeClient, GetRecommendationsCommand } = require("@aws-sdk/client-personalize-runtime");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const personalizeClient = new PersonalizeRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

function scoreToReason(score) {
    if (score == null || typeof score !== "number") return "Pairs with your last scan";
    if (score > 0.9) return "Based on weekly purchase";
    if (score >= 0.7) return "Bought every few days";
    return "Pairs with your last scan";
}

async function getProductsFromS3() {
    const bucketName = process.env.MOCK_DATA_BUCKET;
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: "mock-store/products.json",
    }));
    const dataStr = await response.Body.transformToString();
    return JSON.parse(dataStr);
}

exports.handler = async (event) => {
    const { user_id } = event.pathParameters || {};

    if (!user_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Missing user_id in path" }),
        };
    }

    const campaignArn = process.env.PERSONALIZE_CAMPAIGN_ARN;

    try {
        let itemList = [];

        if (campaignArn) {
            try {
                const recResponse = await personalizeClient.send(new GetRecommendationsCommand({
                    campaignArn,
                    userId: user_id,
                    numResults: 10,
                }));
                itemList = recResponse.itemList || [];
            } catch (personalizeError) {
                console.warn("Personalize fallback:", personalizeError.message);
            }
        }

        const products = await getProductsFromS3();
        const byId = Object.fromEntries(products.map((p) => [p.product_id, p]));

        let results;
        if (itemList.length > 0) {
            results = itemList
                .map((item) => {
                    const id = item.itemId || item.itemid;
                    const product = id ? byId[id] : null;
                    if (!product) return null;
                    const score = item.score ?? item.relevance;
                    return {
                        name: product.name,
                        price: product.discounted_price ?? product.base_price,
                        reason: scoreToReason(score),
                        image: product.image ?? null,
                        aisle: product.aisle,
                    };
                })
                .filter(Boolean);
        }

        if (!results || results.length === 0) {
            const fallback = products.slice(0, 5).map((p) => ({
                name: p.name,
                price: p.discounted_price ?? p.base_price,
                reason: "Pairs with your last scan",
                image: p.image ?? null,
                aisle: p.aisle,
            }));
            results = fallback;
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error("getRecommendations Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch recommendations" }),
        };
    }
};
