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
            .filter(post => {
                // Ensure post has required fields and is not a profile
                if (!post.title || !post.content || post.id?.startsWith('profile-')) {
                    return false;
                }
                // Parse isPublic if it's a string
                let isPublic = post.isPublic;
                if (typeof isPublic === 'string') {
                    isPublic = isPublic === 'true' || isPublic === 'True';
                }
                return isPublic === true;
            })
            .map(post => {
                // Parse isPublic if it's stored as a string
                if (post.isPublic !== undefined && typeof post.isPublic === 'string') {
                    post.isPublic = post.isPublic === 'true' || post.isPublic === 'True';
                }
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
        // IMPORTANT: Do NOT include 'id' field - backend will generate a unique ID
        const blogPost = {} as any;  
        blogPost.course_name = title;  // Map title to course_name (required by backend)
        // Generate a short code from title for course_code (required by backend)
        // Use first few words of title, uppercase, max 20 chars
        // Add timestamp to ensure uniqueness even with similar titles
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        const codeFromTitle = (title
            .split(' ')
            .slice(0, 3)
            .join('')
            .toUpperCase()
            .substring(0, 14) || 'BLOG') + timestamp;
        blogPost.course_code = codeFromTitle;
        // Store original blog post fields as additional data
        blogPost.title = title;
        blogPost.content = content;
        blogPost.isPublic = isPublic;
        
        // Ensure we never send an 'id' field - backend must generate it
        if (blogPost.id) {
            delete blogPost.id;
        }
        
        const postResult = await fetch(coursesUrl, {
            method: 'POST',
            body: JSON.stringify(blogPost),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!postResult.ok) {
            const errorText = await postResult.text();
            throw new Error(`Failed to create blog post: ${errorText}`);
        }
        const postResultJSON = await postResult.json();
        if (!postResultJSON.id) {
            throw new Error('Backend did not return a post ID');
        }
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
        
        // Try to get existing profile first
        const existingProfile = await this.getUserProfile();
        
        if (existingProfile) {
            // Update existing profile - Update one field at a time (backend limitation)
            // Update biography
            const biographyUpdateResult = await fetch(`${coursesUrl}?id=${profileId}`, {
                method: 'PUT',
                body: JSON.stringify({ biography: biography || '' }),
                headers: {
                    'Authorization': this.authService.jwtToken!,
                    'Content-Type': 'application/json'
                }
            });
            if (!biographyUpdateResult.ok) {
                const errorText = await biographyUpdateResult.text();
                throw new Error(`Failed to update biography: ${errorText}`);
            }
            
            // Update profile picture URL if provided (and it's not a blob URL)
            if (profilePictureUrl && !profilePictureUrl.startsWith('blob:')) {
                const pictureUpdateResult = await fetch(`${coursesUrl}?id=${profileId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ profilePictureUrl: profilePictureUrl }),
                    headers: {
                        'Authorization': this.authService.jwtToken!,
                        'Content-Type': 'application/json'
                    }
                });
                if (!pictureUpdateResult.ok) {
                    const errorText = await pictureUpdateResult.text();
                    throw new Error(`Failed to update profile picture: ${errorText}`);
                }
            }
        } else {
            // Create new profile
            const profile: UserProfile = {
                id: profileId,
                course_code: 'PROFILE',  // Required by backend
                course_name: username,   // Required by backend
                biography: biography || '',
                profilePictureUrl: (profilePictureUrl && !profilePictureUrl.startsWith('blob:')) ? profilePictureUrl : undefined,
                username: username
            };
            
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
            .filter(post => {
                // Ensure post has required fields and is not a profile
                if (!post.title || !post.content || !post.id || post.id.startsWith('profile-')) {
                    return false;
                }
                // Parse isPublic if it's a string
                let isPublic = post.isPublic;
                if (typeof isPublic === 'string') {
                    isPublic = isPublic === 'true' || isPublic === 'True';
                }
                return isPublic === false;
            })
            .map(post => {
                // Parse isPublic if it's stored as a string
                if (post.isPublic !== undefined && typeof post.isPublic === 'string') {
                    post.isPublic = post.isPublic === 'true' || post.isPublic === 'True';
                }
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

    public async updateBlogPost(postId: string, title: string, content: string, isPublic: boolean): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to update posts');
        }

        // Get the current post to preserve other fields and verify it exists
        const currentPost = await this.getBlogPostById(postId);
        if (!currentPost || !currentPost.id) {
            throw new Error('Post not found or invalid');
        }

        // Ensure we preserve the original ID - never update it
        // Update title (mapped to course_name) - required by backend
        const titleUpdateResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ course_name: title }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!titleUpdateResult.ok) {
            throw new Error(`Failed to update title: ${await titleUpdateResult.text()}`);
        }

        // Update title field (blog post field)
        const titleFieldResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ title: title }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!titleFieldResult.ok) {
            console.warn('Failed to update title field:', await titleFieldResult.text());
        }

        // Update content
        const contentResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ content: content }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!contentResult.ok) {
            throw new Error(`Failed to update content: ${await contentResult.text()}`);
        }

        // Update isPublic - store as boolean string for backend compatibility
        // Backend UpdatePost expects string values, but we'll store it as "true"/"false"
        const isPublicResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ isPublic: isPublic ? 'true' : 'false' }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!isPublicResult.ok) {
            console.warn('Failed to update isPublic:', await isPublicResult.text());
        }

        // Update course_code (generate from title) - required by backend
        const codeFromTitle = title
            .split(' ')
            .slice(0, 3)
            .join('')
            .toUpperCase()
            .substring(0, 20) || 'BLOG';
        const codeResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ course_code: codeFromTitle }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!codeResult.ok) {
            console.warn('Failed to update course_code:', await codeResult.text());
        }

        // IMPORTANT: Never update the 'id' field - it's the primary key and must remain unchanged
    }

    public async deleteBlogPost(postId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to delete posts');
        }

        // Note: Backend delete requires admin access, but we'll attempt it
        const deleteResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });

        if (!deleteResult.ok) {
            const errorText = await deleteResult.text();
            // If it's a 401, it means the user doesn't have admin access
            if (deleteResult.status === 401) {
                throw new Error('You do not have permission to delete posts. Admin access required.');
            }
            throw new Error(`Failed to delete post: ${errorText}`);
        }
    }

    public async isPostOwner(post: CourseEntry): Promise<boolean> {
        if (!this.authService.isAuthorized()) {
            return false;
        }
        const username = this.authService.getUserName();
        if (!username) {
            return false;
        }
        // For private posts, check if it's in the user's private posts list
        if (post.isPublic === false) {
            const userPrivatePosts = await this.getUserPrivatePosts();
            return userPrivatePosts.some(p => p.id === post.id);
        }
        // For public posts, we need to check all user's posts (both public and private)
        // Get all posts and filter for ones that belong to this user
        try {
            const allPosts = await this.getCourses();
            // Check if this post exists in the user's posts
            // Since we don't have an explicit author field, we'll check if it's in private posts
            // or if we can determine ownership another way
            const userPrivatePosts = await this.getUserPrivatePosts();
            return userPrivatePosts.some(p => p.id === post.id);
        } catch (error) {
            console.error('Error checking post ownership:', error);
            return false;
        }
    }
}