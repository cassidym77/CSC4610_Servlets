import { DeleteItemCommand, DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { hasAdminGroup } from "../shared/Utils";
import { unmarshall } from "@aws-sdk/util-dynamodb";



export async function deletePost(event: APIGatewayProxyEvent, ddbClient: DynamoDBClient): Promise<APIGatewayProxyResult> {

    // Check if user is admin first
    const isAdmin = hasAdminGroup(event);
    
    // Get username from JWT token claims
    const username = event.requestContext.authorizer?.claims['cognito:username'] || 
                     event.requestContext.authorizer?.claims['username'] ||
                     event.requestContext.authorizer?.claims['sub'];

    if(event.queryStringParameters && ('id' in event.queryStringParameters)) {

        const postId = event.queryStringParameters['id'];

        // If not admin, check if user is the author of the post
        if (!isAdmin) {
            if (!username) {
                return {
                    statusCode: 401,
                    body: JSON.stringify(`Not authorized! Username not found.`)
                }
            }

            // Get the post to check ownership
            const getItemResponse = await ddbClient.send(new GetItemCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    'id': {S: postId}
                }
            }));

            if (!getItemResponse.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Post with id ${postId} not found!`)
                }
            }

            const post = unmarshall(getItemResponse.Item);
            
            // Check if user is the author
            if (post.authorId !== username) {
                return {
                    statusCode: 403,
                    body: JSON.stringify(`Not authorized! You can only delete your own posts.`)
                }
            }
        }

        // User is either admin or the author - proceed with deletion
        await ddbClient.send(new DeleteItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                'id': {S: postId}
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(`Deleted post with id ${postId}`)
        }

    }
    return {
        statusCode: 400,
        body: JSON.stringify('Please provide right args!!')
    }

}