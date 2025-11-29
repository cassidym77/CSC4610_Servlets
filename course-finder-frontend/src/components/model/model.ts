export interface CourseEntry {
    id: string,
    course_code: string,
    course_name: string,
    photoUrl?: string,
    // Blog post fields (optional, stored as additional data)
    title?: string,
    content?: string,
    isPublic?: boolean
}
