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