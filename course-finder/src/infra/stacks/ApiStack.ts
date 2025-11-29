import { Stack, StackProps } from 'aws-cdk-lib'
import { AuthorizationType, CognitoUserPoolsAuthorizer, Cors, LambdaIntegration, MethodOptions, ResourceOptions, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { AuthorizationToken } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

interface ApiStackProps extends StackProps {
    coursesLambdaIntegration: LambdaIntegration,
    userPool: IUserPool;
}

export class ApiStack extends Stack {

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const api = new RestApi(this, 'CoursesApi');

        const authorizer = new CognitoUserPoolsAuthorizer(this, 'CoursesApiAuthorizer', {
            cognitoUserPools:[props.userPool],
            identitySource: 'method.request.header.Authorization'
        });

        const optionsWithAuth: MethodOptions = {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: authorizer 
        }

        const optionsWithCors: ResourceOptions = {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS
            }
        }

        const coursesResource = api.root.addResource('courses', optionsWithCors);
        coursesResource.addMethod('GET', props.coursesLambdaIntegration, optionsWithAuth);
        coursesResource.addMethod('POST', props.coursesLambdaIntegration,optionsWithAuth);
        coursesResource.addMethod('PUT', props.coursesLambdaIntegration, optionsWithAuth);
        coursesResource.addMethod('DELETE', props.coursesLambdaIntegration, optionsWithAuth);
    }
}