import { ObjectId } from "mongodb";

export interface LikesEntity{
  userId: ObjectId
  postId: ObjectId
}