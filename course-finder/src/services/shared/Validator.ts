import { CourseEntry } from "../model/Model";

export class MissingFieldError extends Error {
    constructor(missingField: string) {
        super(`Value for ${missingField} expected!`)
    }
}


export class JsonError extends Error {}

export function validateAsCourseEntry(arg: any){
    if ((arg as CourseEntry).course_name == undefined) {
        throw new MissingFieldError('course_name')
    }
    if ((arg as CourseEntry).course_code == undefined) {
        throw new MissingFieldError('course_code')
    }
    if ((arg as CourseEntry).id == undefined) {
        throw new MissingFieldError('id')
    }
}