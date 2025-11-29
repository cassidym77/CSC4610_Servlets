import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AuthService } from "./AuthService";
import { DataStack, ApiStack } from '../../../course-finder/outputs.json';
import { CourseEntry } from "../components/model/model";

const coursesUrl = ApiStack.CoursesApiEndpoint75C265A0 + 'courses'


export class DataService {

    private authService: AuthService;
    private s3Client: S3Client | undefined;
    private awsRegion = 'us-east-1';

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    public enrollCourse(courseId: string) {
        return '123';
    }

    public async getCourses():Promise<CourseEntry[]>{
        const getCoursesResult = await fetch(coursesUrl, {
            method: 'GET',
            headers: {
                'Authorization': this.authService.jwtToken!
            }
        });
        const getCoursesResultJson = await getCoursesResult.json();
        return getCoursesResultJson;
    }


    public async createCourse(code: string, name: string, photo?: File){
        const course = {} as any;  
        course.course_code = code;
        course.course_name = name;
        if (photo) {
            const uploadUrl = await this.uploadPublicFile(photo);
            course.photoUrl = uploadUrl
        }
        const postResult = await fetch(coursesUrl, {
            method: 'POST',
            body: JSON.stringify(course),
            headers: {
                'Authorization': this.authService.jwtToken!
            }
        });
        const postResultJSON = await postResult.json();
        return postResultJSON.id
    }

    public async createBlogPost(title: string, content: string, isPublic: boolean){
        // Map blog post fields to course entry structure for backend compatibility
        // The backend validation requires course_code and course_name
        const blogPost = {} as any;  
        blogPost.course_name = title;  // Map title to course_name (required by backend)
        // Generate a short code from title for course_code (required by backend)
        // Use first few words of title, uppercase, max 20 chars
        const codeFromTitle = title
            .split(' ')
            .slice(0, 3)
            .join('')
            .toUpperCase()
            .substring(0, 20) || 'BLOG';
        blogPost.course_code = codeFromTitle;
        // Store original blog post fields as additional data
        blogPost.title = title;
        blogPost.content = content;
        blogPost.isPublic = isPublic;
        const postResult = await fetch(coursesUrl, {
            method: 'POST',
            body: JSON.stringify(blogPost),
            headers: {
                'Authorization': this.authService.jwtToken!
            }
        });
        if (!postResult.ok) {
            const errorText = await postResult.text();
            throw new Error(`Failed to create blog post: ${errorText}`);
        }
        const postResultJSON = await postResult.json();
        return postResultJSON.id
    }

    private async uploadPublicFile(file: File){
        const credentials = await this.authService.getTemporaryCredentials();
        if (!this.s3Client) {
            this.s3Client = new S3Client({
                credentials: credentials as any,
                region: this.awsRegion
            });
        }
        const command = new PutObjectCommand({
            Bucket: DataStack.CourseFinderPhotosBucketName,
            Key: file.name,
            ACL: 'public-read',
            Body: file
        });
        await this.s3Client.send(command);
        return `https://${command.input.Bucket}.s3.${this.awsRegion}.amazonaws.com/${command.input.Key}`
    }

    public isAuthorized(){
        return this.authService.isAuthorized();
    }
}