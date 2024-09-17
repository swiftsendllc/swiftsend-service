import { Request } from "express";
import { db } from "../rdb/mongodb";
import { MessagesEntity } from "../entities/messages.entity";
import { Collections } from "../util/constants";
import { ObjectId } from "mongodb";



const messages = db.collection<MessagesEntity>(Collections.MESSAGES)

export  const getMessages = async (req: Request, res: Response) => {
 const senderId = new ObjectId(req.user!.userId)
 const receiverId = new ObjectId(req.params.id)
 
}