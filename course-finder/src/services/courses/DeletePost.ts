import { DeleteItemCommand, DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { hasAdminGroup } from "../shared/Utils";
import { unmarshall } from "@aws-sdk/util-dynamodb";



export async function deletePost(event: APIGatewayProxyEvent, ddbClient: DynamoDBClient): Promise<APIGatewayProxyResult> {

    // Check if user is admin first
    const isAdmin = hasAdminGroup(event);
    
    // Get username from JWT token claims
    // Prefer cognito:username (actual username/email used for login)
    // Then try username (alternative claim)
    // Then try email (sometimes Cognito uses email as username)
    // Do NOT use 'sub' as fallback - it's a UUID and won't match the authorId stored in database
    const claims = event.requestContext.authorizer?.claims || {};
    const username = claims['cognito:username'] || 
                     claims['username'] ||
                     claims['email'] ||
                     null;

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
            // Handle case where authorId might be undefined or the comparison might fail
            const postAuthorId = post.authorId;
            
            // Log for debugging (can be removed in production)
            console.log('Delete authorization check:', {
                username: username,
                postAuthorId: postAuthorId,
                postId: postId,
                claims: event.requestContext.authorizer?.claims
            });
            
            // If authorId is missing, deny access (safety first)
            if (!postAuthorId) {
                return {
                    statusCode: 403,
                    body: JSON.stringify(`Not authorized! Post author information not found.`)
                }
            }
            
            // Compare authorId with username
            // Use case-sensitive comparison (authorId should match exactly what was stored)
            // Trim whitespace in case of any data inconsistencies
            const normalizedAuthorId = String(postAuthorId).trim();
            const normalizedUsername = String(username).trim();
            
            if (normalizedAuthorId !== normalizedUsername) {
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