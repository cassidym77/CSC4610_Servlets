export interface Comment {
    id: string,
    postId: string,
    author: string,
    content: string,
    createdAt?: string,
    upvotes?: number,
    downvotes?: number,
    upvotedBy?: string[],  // Array of usernames who upvoted
    downvotedBy?: string[]  // Array of usernames who downvoted
}

export interface UserProfile {
    id: string,  // Will be "profile-{username}"
    course_code: string,  // Required by backend, set to "PROFILE"
    course_name: string,  // Required by backend, set to username
    biography?: string,
    profilePictureUrl?: string,
    username: string
}

export interface CourseEntry {
    id: string,
    course_code: string,
    course_name: string,
    photoUrl?: string,
    // Blog post fields (optional, stored as additional data)
    title?: string,
    content?: string,
    isPublic?: boolean,
    authorId?: string,  // Username of the post author
    comments?: Comment[]
}
