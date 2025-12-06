import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";



export async function updatePost(event: APIGatewayProxyEvent, ddbClient: DynamoDBClient): Promise<APIGatewayProxyResult> {


    if(event.queryStringParameters && ('id' in event.queryStringParameters) && event.body) {

        const parsedBody = JSON.parse(event.body);
        const postId = event.queryStringParameters['id'];
        const requestBodyKey = Object.keys(parsedBody)[0];
        let requestBodyValue = parsedBody[requestBodyKey];

        // Ensure the value is a string (handle null/undefined by converting to empty string)
        // This is important for fields like biography which might be empty
        if (requestBodyValue === null || requestBodyValue === undefined) {
            requestBodyValue = '';
        }
        // Convert to string if it's not already
        const stringValue = String(requestBodyValue);

        const updateResult = await ddbClient.send(new UpdateItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                'id': {S: postId}
            },
            UpdateExpression: 'set #zzzNew = :new',
            ExpressionAttributeValues: {
                ':new': {
                    S: stringValue
                }
            },
            ExpressionAttributeNames: {
                '#zzzNew': requestBodyKey
            },
            ReturnValues: 'UPDATED_NEW'
        }));

        return {
            statusCode: 204,
            body: JSON.stringify(updateResult.Attributes)
        }

    }
    return {
        statusCode: 400,
        body: JSON.stringify('Please provide right args!!')
    }

}