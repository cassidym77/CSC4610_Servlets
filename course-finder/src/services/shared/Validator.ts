import { PostEntry } from "../model/Model";

export class MissingFieldError extends Error {
    constructor(missingField: string) {
        super(`Value for ${missingField} expected!`)
    }
}


export class JsonError extends Error {}

export function validateAsPostEntry(arg: any){
    if ((arg as PostEntry).title == undefined) {
        throw new MissingFieldError('title')
    }
    if ((arg as PostEntry).content == undefined) {
        throw new MissingFieldError('content')
    }
    if ((arg as PostEntry).isPublic == undefined) {
        throw new MissingFieldError('isPublic')
    }
    if ((arg as PostEntry).authorId == undefined) {
        throw new MissingFieldError('authorId')
    }
    if ((arg as PostEntry).id == undefined) {
        throw new MissingFieldError('id')
    }
}