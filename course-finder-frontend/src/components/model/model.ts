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
    biography?: string,
    profilePictureUrl?: string,
    username: string
}

export interface PostEntry {
    id: string,
    title: string,
    content: string,
    isPublic: boolean,
    authorId: string,  // Username of the post author
    photoUrl?: string,
    comments?: Comment[],
    // Voting fields
    upvotes?: number,
    downvotes?: number,
    upvotedBy?: string[],  // Array of usernames who upvoted
    downvotedBy?: string[]  // Array of usernames who downvoted
}
