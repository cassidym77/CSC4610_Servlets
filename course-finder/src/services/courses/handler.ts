import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { postBlgPst } from "./PostBlgPst";
import { getPost } from "./GetPost";
import { updatePost } from "./UpdatePost";
import { deletePost } from "./DeletePost";
import { JsonError, MissingFieldError } from "../shared/Validator";
import { addCorsHeader } from "../shared/Utils";

const ddbClient = new DynamoDBClient({});

async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    let response: APIGatewayProxyResult;

    try {
        switch (event.httpMethod) {
            case 'GET':
                const getResponse = await getPost(event, ddbClient);
                response = getResponse;
                break;
            case 'POST':
                const postResponse = await postBlgPst(event, ddbClient);
                response = postResponse;
                break;
            case 'PUT':
                const putResponse = await updatePost(event, ddbClient);
                response = putResponse;
                break;
            case 'DELETE':
                const deleteResponse = await deletePost(event, ddbClient);
                response = deleteResponse;
                break;
            default:
                break;
        }
    } catch (error) {
        if (error instanceof MissingFieldError) {
            return {
                statusCode: 400,
                body: error.message
            }
        }
        if (error instanceof JsonError) {
            return {
                statusCode: 400,
                body: error.message
            }
        }
        return {
            statusCode: 500,
            body: error.message
        }
    }
    addCorsHeader(response);
    return response;
}

export { handler }