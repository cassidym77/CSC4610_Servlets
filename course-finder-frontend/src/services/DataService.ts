import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AuthService } from "./AuthService";
import { DataStack, ApiStack } from '../../../course-finder/outputs.json';
import { CourseEntry, UserProfile } from "../components/model/model";

const coursesUrl = ApiStack.CoursesApiEndpoint75C265A0 + 'courses'

// Helper function to initialize vote fields for comments (backward compatibility)
function initializeCommentVotes(comments: any[]): any[] {
    if (!Array.isArray(comments)) {
        return [];
    }
    return comments.map(comment => ({
        ...comment,
        upvotes: comment.upvotes ?? 0,
        downvotes: comment.downvotes ?? 0,
        upvotedBy: comment.upvotedBy ?? [],
        downvotedBy: comment.downvotedBy ?? []
    }));
}

// Helper function to initialize vote fields for posts (backward compatibility)
function initializePostVotes(post: any): any {
    // Parse vote arrays if they're stored as JSON strings
    if (post.upvotedBy && typeof post.upvotedBy === 'string') {
        try {
            post.upvotedBy = JSON.parse(post.upvotedBy);
        } catch (e) {
            post.upvotedBy = [];
        }
    }
    if (post.downvotedBy && typeof post.downvotedBy === 'string') {
        try {
            post.downvotedBy = JSON.parse(post.downvotedBy);
        } catch (e) {
            post.downvotedBy = [];
        }
    }
    
    return {
        ...post,
        upvotes: post.upvotes !== undefined ? Number(post.upvotes) : 0,
        downvotes: post.downvotes !== undefined ? Number(post.downvotes) : 0,
        upvotedBy: post.upvotedBy ?? [],
        downvotedBy: post.downvotedBy ?? []
    };
}

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
        
        // Initialize vote fields for comments
        if (post.comments) {
            post.comments = initializeCommentVotes(post.comments);
        }
        
        // Initialize vote fields for post
        return initializePostVotes(post);
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
            createdAt: new Date().toISOString(),
            upvotes: 0,
            downvotes: 0,
            upvotedBy: [],
            downvotedBy: []
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

    public async upvotePost(postId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to vote on posts');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }

        // Get the current post
        const post = await this.getBlogPostById(postId);
        
        // Initialize vote tracking arrays if they don't exist
        if (!post.upvotedBy) {
            post.upvotedBy = [];
        }
        if (!post.downvotedBy) {
            post.downvotedBy = [];
        }
        if (post.upvotes === undefined) {
            post.upvotes = 0;
        }
        if (post.downvotes === undefined) {
            post.downvotes = 0;
        }

        // Check if user already upvoted
        const alreadyUpvoted = post.upvotedBy.includes(username);
        // Check if user already downvoted
        const alreadyDownvoted = post.downvotedBy.includes(username);

        if (alreadyUpvoted) {
            // Remove upvote (toggle off)
            post.upvotedBy = post.upvotedBy.filter(u => u !== username);
            post.upvotes = Math.max(0, (post.upvotes || 0) - 1);
        } else {
            // Add upvote
            post.upvotedBy.push(username);
            post.upvotes = (post.upvotes || 0) + 1;
            
            // If user previously downvoted, remove that downvote
            if (alreadyDownvoted) {
                post.downvotedBy = post.downvotedBy.filter(u => u !== username);
                post.downvotes = Math.max(0, (post.downvotes || 0) - 1);
            }
        }

        // Update the post with modified vote data
        // Update upvotes count
        const upvotesResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ upvotes: post.upvotes.toString() }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!upvotesResult.ok) {
            console.warn('Failed to update upvotes:', await upvotesResult.text());
        }

        // Update downvotes count
        const downvotesResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ downvotes: post.downvotes.toString() }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!downvotesResult.ok) {
            console.warn('Failed to update downvotes:', await downvotesResult.text());
        }

        // Update upvotedBy array
        const upvotedByResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ upvotedBy: JSON.stringify(post.upvotedBy) }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!upvotedByResult.ok) {
            console.warn('Failed to update upvotedBy:', await upvotedByResult.text());
        }

        // Update downvotedBy array
        const downvotedByResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ downvotedBy: JSON.stringify(post.downvotedBy) }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!downvotedByResult.ok) {
            console.warn('Failed to update downvotedBy:', await downvotedByResult.text());
        }
    }

    public async downvotePost(postId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to vote on posts');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }

        // Get the current post
        const post = await this.getBlogPostById(postId);
        
        // Initialize vote tracking arrays if they don't exist
        if (!post.upvotedBy) {
            post.upvotedBy = [];
        }
        if (!post.downvotedBy) {
            post.downvotedBy = [];
        }
        if (post.upvotes === undefined) {
            post.upvotes = 0;
        }
        if (post.downvotes === undefined) {
            post.downvotes = 0;
        }

        // Check if user already downvoted
        const alreadyDownvoted = post.downvotedBy.includes(username);
        // Check if user already upvoted
        const alreadyUpvoted = post.upvotedBy.includes(username);

        if (alreadyDownvoted) {
            // Remove downvote (toggle off)
            post.downvotedBy = post.downvotedBy.filter(u => u !== username);
            post.downvotes = Math.max(0, (post.downvotes || 0) - 1);
        } else {
            // Add downvote
            post.downvotedBy.push(username);
            post.downvotes = (post.downvotes || 0) + 1;
            
            // If user previously upvoted, remove that upvote
            if (alreadyUpvoted) {
                post.upvotedBy = post.upvotedBy.filter(u => u !== username);
                post.upvotes = Math.max(0, (post.upvotes || 0) - 1);
            }
        }

        // Update the post with modified vote data
        // Update upvotes count
        const upvotesResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ upvotes: post.upvotes.toString() }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!upvotesResult.ok) {
            console.warn('Failed to update upvotes:', await upvotesResult.text());
        }

        // Update downvotes count
        const downvotesResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ downvotes: post.downvotes.toString() }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!downvotesResult.ok) {
            console.warn('Failed to update downvotes:', await downvotesResult.text());
        }

        // Update upvotedBy array
        const upvotedByResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ upvotedBy: JSON.stringify(post.upvotedBy) }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!upvotedByResult.ok) {
            console.warn('Failed to update upvotedBy:', await upvotedByResult.text());
        }

        // Update downvotedBy array
        const downvotedByResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ downvotedBy: JSON.stringify(post.downvotedBy) }),
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });
        if (!downvotedByResult.ok) {
            console.warn('Failed to update downvotedBy:', await downvotedByResult.text());
        }
    }

    public async upvoteComment(postId: string, commentId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to vote on comments');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }

        // Get the current post
        const post = await this.getBlogPostById(postId);
        
        if (!post.comments) {
            throw new Error('Comments not found');
        }

        // Find the comment
        const commentIndex = post.comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) {
            throw new Error('Comment not found');
        }

        const comment = post.comments[commentIndex];
        
        // Initialize vote tracking arrays if they don't exist
        if (!comment.upvotedBy) {
            comment.upvotedBy = [];
        }
        if (!comment.downvotedBy) {
            comment.downvotedBy = [];
        }
        if (comment.upvotes === undefined) {
            comment.upvotes = 0;
        }
        if (comment.downvotes === undefined) {
            comment.downvotes = 0;
        }

        // Check if user already upvoted
        const alreadyUpvoted = comment.upvotedBy.includes(username);
        // Check if user already downvoted
        const alreadyDownvoted = comment.downvotedBy.includes(username);

        if (alreadyUpvoted) {
            // Remove upvote (toggle off)
            comment.upvotedBy = comment.upvotedBy.filter(u => u !== username);
            comment.upvotes = Math.max(0, (comment.upvotes || 0) - 1);
        } else {
            // Add upvote
            comment.upvotedBy.push(username);
            comment.upvotes = (comment.upvotes || 0) + 1;
            
            // If user previously downvoted, remove that downvote
            if (alreadyDownvoted) {
                comment.downvotedBy = comment.downvotedBy.filter(u => u !== username);
                comment.downvotes = Math.max(0, (comment.downvotes || 0) - 1);
            }
        }

        // Update the post with modified comments
        const commentsJson = JSON.stringify(post.comments);
        
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
            throw new Error(`Failed to upvote comment: ${errorText}`);
        }
    }

    public async downvoteComment(postId: string, commentId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to vote on comments');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }

        // Get the current post
        const post = await this.getBlogPostById(postId);
        
        if (!post.comments) {
            throw new Error('Comments not found');
        }

        // Find the comment
        const commentIndex = post.comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) {
            throw new Error('Comment not found');
        }

        const comment = post.comments[commentIndex];
        
        // Initialize vote tracking arrays if they don't exist
        if (!comment.upvotedBy) {
            comment.upvotedBy = [];
        }
        if (!comment.downvotedBy) {
            comment.downvotedBy = [];
        }
        if (comment.upvotes === undefined) {
            comment.upvotes = 0;
        }
        if (comment.downvotes === undefined) {
            comment.downvotes = 0;
        }

        // Check if user already downvoted
        const alreadyDownvoted = comment.downvotedBy.includes(username);
        // Check if user already upvoted
        const alreadyUpvoted = comment.upvotedBy.includes(username);

        if (alreadyDownvoted) {
            // Remove downvote (toggle off)
            comment.downvotedBy = comment.downvotedBy.filter(u => u !== username);
            comment.downvotes = Math.max(0, (comment.downvotes || 0) - 1);
        } else {
            // Add downvote
            comment.downvotedBy.push(username);
            comment.downvotes = (comment.downvotes || 0) + 1;
            
            // If user previously upvoted, remove that upvote
            if (alreadyUpvoted) {
                comment.upvotedBy = comment.upvotedBy.filter(u => u !== username);
                comment.upvotes = Math.max(0, (comment.upvotes || 0) - 1);
            }
        }

        // Update the post with modified comments
        const commentsJson = JSON.stringify(post.comments);
        
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
            throw new Error(`Failed to downvote comment: ${errorText}`);
        }
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
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to create posts');
        }
        const username = this.authService.getUserName();
        if (!username) {
            throw new Error('Username not found');
        }
        
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
        blogPost.authorId = username;  // Store the author's username
        // Initialize vote fields
        blogPost.upvotes = 0;
        blogPost.downvotes = 0;
        blogPost.upvotedBy = [];
        blogPost.downvotedBy = [];
        
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
        
        // After creation, update the authorId field to ensure it's stored
        // (in case the backend doesn't preserve it from the initial POST)
        try {
            await fetch(`${coursesUrl}?id=${postResultJSON.id}`, {
                method: 'PUT',
                body: JSON.stringify({ authorId: username }),
                headers: {
                    'Authorization': this.authService.jwtToken!,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.warn('Failed to set authorId after post creation:', err);
            // Non-critical, continue anyway
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
                // Ensure all fields are properly set and return a clean UserProfile object
                const userProfile: UserProfile = {
                    id: profile.id || profileId,
                    course_code: profile.course_code || 'PROFILE',
                    course_name: profile.course_name || username,
                    biography: profile.biography || '',
                    profilePictureUrl: profile.profilePictureUrl || undefined,
                    username: profile.username || username
                };
                return userProfile;
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
            // Always update biography (even if empty, to clear it if needed)
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
            
            // Update profile picture URL if provided
            // Update profile picture URL if provided (and it's not a blob URL)
            // Only update if we have a valid URL to save
            if (profilePictureUrl !== undefined && profilePictureUrl && !profilePictureUrl.startsWith('blob:')) {
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
                    // Log warning but don't fail the entire save operation
                    console.warn(`Failed to update profile picture: ${errorText}`);
                }
            }
            // If profilePictureUrl is undefined or a blob URL, we don't update it
            // This preserves the existing profile picture URL
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
        
        // Filter for private blog posts owned by the current user
        // Use authorId if available, otherwise fall back to isPublic check
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
                // Must be private
                if (isPublic !== false) {
                    return false;
                }
                // If authorId exists, use it for filtering (more reliable)
                if (post.authorId) {
                    return post.authorId === username;
                }
                // Fallback: if no authorId, include it (for backward compatibility with old posts)
                // In practice, all new posts will have authorId
                return true;
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
                // Initialize vote fields for comments
                if (post.comments) {
                    post.comments = initializeCommentVotes(post.comments);
                }
                // Initialize vote fields for post
                return initializePostVotes(post);
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

        // Preserve authorId if it exists, or set it if it doesn't
        const username = this.authService.getUserName();
        const authorId = currentPost.authorId || username;

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

        // Ensure authorId is set (preserve existing or set to current user)
        if (authorId) {
            const authorIdResult = await fetch(`${coursesUrl}?id=${postId}`, {
                method: 'PUT',
                body: JSON.stringify({ authorId: authorId }),
                headers: {
                    'Authorization': this.authService.jwtToken!,
                    'Content-Type': 'application/json'
                }
            });
            if (!authorIdResult.ok) {
                console.warn('Failed to update authorId:', await authorIdResult.text());
            }
        }

        // IMPORTANT: Never update the 'id' field - it's the primary key and must remain unchanged
    }

    public async deleteBlogPost(postId: string): Promise<void> {
        if (!this.authService.isAuthorized()) {
            throw new Error('User must be logged in to delete posts');
        }

        // Backend now allows deletion if user is admin OR the author of the post
        const deleteResult = await fetch(`${coursesUrl}?id=${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': this.authService.jwtToken!,
                'Content-Type': 'application/json'
            }
        });

        if (!deleteResult.ok) {
            const errorText = await deleteResult.text();
            // If it's a 401/403, it means the user doesn't have permission
            if (deleteResult.status === 401 || deleteResult.status === 403) {
                throw new Error('You do not have permission to delete this post. Only the author or an admin can delete posts.');
            }
            throw new Error(`Failed to delete post: ${errorText}`);
        }
    }

    public async getUserAllPosts(): Promise<CourseEntry[]> {
        // Get all posts created by the user (both public and private)
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
        
        // Filter posts by authorId (username)
        return allPosts
            .filter(post => {
                if (!post.title || !post.content || !post.id || post.id.startsWith('profile-')) {
                    return false;
                }
                // Check if post belongs to current user by authorId
                return post.authorId === username;
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
                // Initialize vote fields for comments
                if (post.comments) {
                    post.comments = initializeCommentVotes(post.comments);
                }
                // Initialize vote fields for post
                return initializePostVotes(post);
            });
    }

    public async isPostOwner(post: CourseEntry): Promise<boolean> {
        if (!this.authService.isAuthorized()) {
            return false;
        }
        const username = this.authService.getUserName();
        if (!username) {
            return false;
        }
        
        // Check ownership using authorId field (most reliable)
        if (post.authorId) {
            return post.authorId === username;
        }
        
        // Fallback: For older posts without authorId, check if it's in user's private posts
        // Parse isPublic if it's a string
        let isPublic = post.isPublic;
        if (typeof isPublic === 'string') {
            isPublic = isPublic === 'true' || isPublic === 'True';
        }
        
        // For private posts, check if it's in the user's private posts list
        // (only the author can have private posts in their list)
        if (isPublic === false) {
            const userPrivatePosts = await this.getUserPrivatePosts();
            return userPrivatePosts.some(p => p.id === post.id);
        }
        
        // For public posts without authorId, try to get all user posts
        try {
            const userAllPosts = await this.getUserAllPosts();
            return userAllPosts.some(p => p.id === post.id);
        } catch (error) {
            console.error('Error checking post ownership:', error);
            return false;
        }
    }
}