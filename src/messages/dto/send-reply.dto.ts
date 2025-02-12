import { ObjectId } from "mongodb"

export interface SendReplyInput{
  content:string
  contentId:ObjectId
}