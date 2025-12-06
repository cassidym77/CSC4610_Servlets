import { 
    SignInOutput, 
    fetchAuthSession,
    signUp, 
    confirmSignUp, 
    signIn, 
    getCurrentUser, 
    AuthUser 
} from '@aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { AuthStack } from '../../../course-finder/outputs.json';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const awsRegion = 'us-east-1';

Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: AuthStack.CourseUserPoolId,
        userPoolClientId: AuthStack.CourseUserPoolClientId,
        identityPoolId: AuthStack.CourseIdentityPoolId,        
      },
    },
  });

export class AuthService {

    private user: SignInOutput | AuthUser |undefined;
    public jwtToken: string | undefined;
    private temporaryCredentials: object | undefined;
    private userName: string ='';

    public isAuthorized(){
        if (this.user) {
            return true;
        }
        return false;
    }

    /**
     * call only after login
     */
    public async getIdToken(){
        const authSession = await fetchAuthSession();
        return authSession.tokens?.idToken?.toString();
    }


    public async signup (
        username: string, 
        password: string, 
        email: string, 
        attributes?: Record<string, string>
    ) {
        return await signUp({
            username,
            password,
            options: {
                userAttributes: {
                    ...attributes,
                    email: email
                }
            }
        })
    }

    public async confirmSignUp(email: string, verificationCode: string) {
        try {
            await confirmSignUp({
                username: email,
                confirmationCode: verificationCode
            })
        } catch (error) {
           console.error('Error signing up during confirmation:', error)
        }
    }

    public async login(userName: string, password: string): Promise<Object | undefined> {
        try {
            // check if user is already logged in
            const user = await this.getCurrentUser();
            if (user) {
                this.user = user;
            } else { 
                const signInOutput: SignInOutput = await signIn({
                    username: userName,
                    password: password,
                    options: {
                        authFlowType: 'USER_PASSWORD_AUTH'
                    }
                });
                this.user = signInOutput;
            }

            this.userName = userName;
            this.jwtToken = await this.getIdToken();

            console.log(this.jwtToken)
            return this.user;
        } catch (error) {
            console.error(error);
            return undefined
        }
    }

    private async getCurrentUser(){
        try {
            const user = await getCurrentUser();
            return user;
        } catch (error) {
            return undefined;
        }
    }

    public async getTemporaryCredentials(){
        if (this.temporaryCredentials) {
            return this.temporaryCredentials;
        }
        this.temporaryCredentials = await this.generateTemporaryCredentials();
        return this.temporaryCredentials;
    }

    public getUserName(){
        return this.userName;
    }

    /**
     * Extract username from JWT token claims to match backend extraction logic
     * This ensures the username used in authorId matches what the backend will extract
     */
    public getUsernameFromToken(): string | null {
        if (!this.jwtToken) {
            return null;
        }
        try {
            // JWT tokens have 3 parts: header.payload.signature
            const parts = this.jwtToken.split('.');
            if (parts.length !== 3) {
                return null;
            }
            // Decode the payload (second part)
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            // Match backend extraction logic: cognito:username || username || sub
            return payload['cognito:username'] || payload['username'] || payload['sub'] || null;
        } catch (error) {
            console.error('Error decoding JWT token:', error);
            return null;
        }
    }

    private async generateTemporaryCredentials() {
        const cognitoIdentityPool = `cognito-idp.${awsRegion}.amazonaws.com/${AuthStack.CourseUserPoolId}`;
        const cognitoIdentity = new CognitoIdentityClient({
            credentials: fromCognitoIdentityPool({
                clientConfig: {
                    region: awsRegion
                },
                identityPoolId: AuthStack.CourseIdentityPoolId,
                logins: {
                    [cognitoIdentityPool]: this.jwtToken!
                }
            })
        });
        const credentials = await cognitoIdentity.config.credentials();
        return credentials;
    }
}