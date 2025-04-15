import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { AssetsEntity } from '../entities/assets.entity';
import { CreatorAssetsEntity } from '../entities/creator_assets.entity';
import { FanAssetsEntity } from '../entities/fan_assets.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { CreateAssetInput } from './dto/create-asset.dto';

const assets = db.collection<AssetsEntity>(Collections.ASSETS);
const creator_assets = db.collection<CreatorAssetsEntity>(Collections.CREATOR_ASSETS);
const fan_assets = db.collection<FanAssetsEntity>(Collections.FAN_ASSETS);

export const createAsset = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const body = req.body as CreateAssetInput;

  const newAsset = {
    creatorId,
    blurredURL: body.blurredURL,
    originalURL: body.originalURL,
    createdAt: new Date(),
    deletedAt: null,
    type: body.type,
    updatedAt: new Date(),
  } as WithId<AssetsEntity>;

  const { insertedId } = await assets.insertOne(newAsset);
  Object.assign(newAsset, { _id: insertedId });
  await creator_assets.insertOne({
    assetId: insertedId,
    createdAt: new Date(),
    creatorId: creatorId,
    deletedAt: null,
    updatedAt: null,
  });

  return res.status(200).json(newAsset);
};

export const deleteCreatorAsset = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const assetId = new ObjectId(req.params.assetId);
  const result = await creator_assets.deleteOne({ assetId: assetId, creatorId: creatorId });
  if (result.deletedCount > 0) {
    return res.status(200).json({ message: 'THE ASSET IS DELETED SUCCESSFULLY' });
  } else {
    return res.status(400).json({ message: 'FAILED TO DELETE MESSAGE!' });
  }
};

export const getCreatorAssets = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const creatorAssets = await creator_assets
    .aggregate([
      {
        $match: { creatorId: creatorId },
      },
      {
        $lookup: {
          from: Collections.ASSETS,
          localField: 'assetId',
          foreignField: '_id',
          as: '_assets',
        },
      },
    ])
    .toArray();

  return res.status(200).json(creatorAssets);
};

export const getFanAssets = async (req: Request, res: Response) => {
  const fanId = new ObjectId(req.user!.userId);
  const fanAssets = await fan_assets
    .aggregate([
      {
        $match: { fanId: fanId },
      },
      {
        $lookup: {
          from: Collections.FAN_ASSETS,
          localField: 'assetId',
          foreignField: 'assetId',
          as: '_assets',
        },
      },
    ])
    .toArray();
  return res.status(200).json(fanAssets);
};
