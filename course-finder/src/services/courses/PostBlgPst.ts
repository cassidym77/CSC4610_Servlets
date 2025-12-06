import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { validateAsCourseEntry } from "../shared/Validator";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createRandomId, parseJSON } from "../shared/Utils";

export async function postBlgPst(event: APIGatewayProxyEvent, ddbClient: DynamoDBClient): Promise<APIGatewayProxyResult> {

    const item = parseJSON(event.body);
    // Only generate a random ID if one isn't already provided
    // This allows profiles to use their custom ID (profile-{username})
    if (!item.id) {
        item.id = createRandomId();
    }
    validateAsCourseEntry(item)

    const result = await ddbClient.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(item)
    }));

    return {
        statusCode: 201,
        body: JSON.stringify({id: item.id})
    }
}