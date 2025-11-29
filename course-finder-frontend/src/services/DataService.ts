import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AuthService } from "./AuthService";
import { DataStack, ApiStack } from '../../../course-finder/outputs.json';
import { CourseEntry, UserProfile } from "../components/model/model";

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

    public async getPublicBlogPosts(): Promise<CourseEntry[]> {
        const getPostsResult = await fetch(coursesUrl, {
            method: 'GET',
            headers: {
                'Authorization': this.authService.jwtToken || ''
            }
        });
        const allPosts: CourseEntry[] = await getPostsResult.json();
        
        // Filter for public blog posts (has title/content and isPublic is true)
        // Also parse comments if stored as JSON string
        return allPosts
            .filter(post => 
                post.title && post.content && post.isPublic === true
            )
            .map(post => {
                // Parse comments if it's stored as a JSON string
                if (post.comments && typeof post.comments === 'string') {
                    try {
                        post.comments = JSON.parse(post.comments);
                    } catch (e) {
                        console.error('Error parsing comments:', e);
                        post.comments = [];
                    }
                }
                return post;
            });
    }

    public async getBlogPostById(postId: string): Promise<CourseEntry> {
        const getPostResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'GET',
            headers: {
                'Authorization': this.authService.jwtToken || ''
            }
        });
        if (!getPostResult.ok) {
            throw new Error(`Failed to fetch post: ${await getPostResult.text()}`);
        }
        const post = await getPostResult.json();
        
        // Parse comments if it's stored as a JSON string
        if (post.comments && typeof post.comments === 'string') {
            try {
                post.comments = JSON.parse(post.comments);
            } catch (e) {
                console.error('Error parsing comments:', e);
                post.comments = [];
            }
        }
        
        return post;
    }

    public async addComment(postId: string, content: string): Promise<string> {
        // Get the current post
        const post = await this.getBlogPostById(postId);
        
        // Create new comment
        const comment = {
            id: `comment-${Date.now()}`,
            postId: postId,
            author: this.authService.getUserName() || 'Anonymous',
            content: content,
            createdAt: new Date().toISOString()
        };

        // Add comment to post's comments array
        if (!post.comments) {
            post.comments = [];
        }
        post.comments.push(comment);

        // Serialize comments array to JSON string for backend UpdatePost function
        // (UpdatePost only handles single string field updates)
        const commentsJson = JSON.stringify(post.comments);
        
        // Update the post with new comment using the backend's update endpoint
        const updateResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ comments: commentsJson }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        
        if (!updateResult.ok) {
            const errorText = await updateResult.text();
            throw new Error(`Failed to add comment: ${errorText}`);
        }
        
        return comment.id;
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

    public async getUserProfile(): Promise<UserProfile | null> {
        if (!this.authService.isAuthorized()) {
            return null;
        }
        const username = this.authService.getUserName();
        if (!username) {
            return null;
        }
        const profileId = `profile-${username}`;
        try {
            const getProfileResult = await fetch(`${coursesUrl}?id=${profileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.authService.jwtToken || ''
                }
            });
            if (getProfileResult.ok) {
                const profile = await getProfileResult.json();
                return profile as UserProfile;
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        return null;
    }

    public async saveUserProfile(biography: string, profilePictureUrl?: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to save profile');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }
        const profileId = `profile-${username}`;
        
        const profile: UserProfile = {
            id: profileId,
            course_code: 'PROFILE',  // Required by backend
            course_name: username,   // Required by backend
            biography: biography,
            profilePictureUrl: profilePictureUrl,
            username: username
        };

        // Try to get existing profile first
        const existingProfile = await this.getUserProfile();
        
        if (existingProfile) {
            // Update existing profile
            const updateResult = await fetch(`${coursesUrl}?id=${profileId}`, {
                method: 'PUT',
                body: JSON.stringify({ biography: biography }),
                headers: {
                    'Authorization': this.authService.jwtToken!,
                    'Content-Type': 'application/json'
                }
            });
            if (!updateResult.ok) {
                throw new Error(`Failed to update profile: ${await updateResult.text()}`);
            }
            
            // Update profile picture URL if provided
            if (profilePictureUrl) {
                await fetch(`${coursesUrl}?id=${profileId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ profilePictureUrl: profilePictureUrl }),
                    headers: {
                        'Authorization': this.authService.jwtToken!,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } else {
            // Create new profile
            const postResult = await fetch(coursesUrl, {
                method: 'POST',
                body: JSON.stringify(profile),
                headers: {
                    'Authorization': this.authService.jwtToken!,
                    'Content-Type': 'application/json'
                }
            });
            if (!postResult.ok) {
                const errorText = await postResult.text();
                throw new Error(`Failed to save profile: ${errorText}`);
            }
        }
    }

    public async uploadProfilePicture(file: File): Promise<string> {
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }
        // Use username-based filename to avoid conflicts
        const fileName = `profile-${username}-${Date.now()}-${file.name}`;
        return await this.uploadPublicFileWithName(file, fileName);
    }

    private async uploadPublicFileWithName(file: File, fileName: string): Promise<string> {
        const credentials = await this.authService.getTemporaryCredentials();
        if (!this.s3Client) {
            this.s3Client = new S3Client({
                credentials: credentials as any,
                region: this.awsRegion
            });
        }
        const command = new PutObjectCommand({
            Bucket: DataStack.CourseFinderPhotosBucketName,
            Key: fileName,
            ACL: 'public-read',
            Body: file
        });
        await this.s3Client.send(command);
        return `https://${command.input.Bucket}.s3.${this.awsRegion}.amazonaws.com/${command.input.Key}`
    }

    public async getUserPrivatePosts(): Promise<CourseEntry[]> {
        if (!this.authService.isAuthorized()) {
            return [];
        }
        const username = this.authService.getUserName();
        if (!username) {
            return [];
        }
        
        const getPostsResult = await fetch(coursesUrl, {
            method: 'GET',
            headers: {
                'Authorization': this.authService.jwtToken || ''
            }
        });
        const allPosts: CourseEntry[] = await getPostsResult.json();
        
        // Filter for private blog posts (has title/content and isPublic is false)
        // Also parse comments if stored as JSON string
        return allPosts
            .filter(post => 
                post.title && post.content && post.isPublic === false && !post.id.startsWith('profile-')
            )
            .map(post => {
                // Parse comments if it's stored as a JSON string
                if (post.comments && typeof post.comments === 'string') {
                    try {
                        post.comments = JSON.parse(post.comments);
                    } catch (e) {
                        console.error('Error parsing comments:', e);
                        post.comments = [];
                    }
                }
                return post;
            });
    }
}