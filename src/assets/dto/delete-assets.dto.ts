import { ObjectId } from 'mongodb';

export interface DeleteAssetsInput {
  assetIds: ObjectId[];
}
