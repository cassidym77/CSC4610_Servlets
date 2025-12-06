export interface PostEntry {
    id: string,
    title: string,
    content: string,
    isPublic: boolean,
    authorId: string,
    photoUrl?: string
}