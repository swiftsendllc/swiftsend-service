import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import sharp from 'sharp';
import { AssetsEntity } from '../entities/assets.entity';
import { Collections } from '../util/constants';
import { assetsService, creatorAssetService, fanAssetsService } from '../util/repositories';
import { uploadFile } from '../util/upload';
import { CreateAssetInput } from './dto/create-asset.dto';


export const createAsset = async (req: Request, res: Response, originalURL: string, blurredURL: string) => {
  const creatorId = new ObjectId(req.user!.userId);
  const body = req.body as CreateAssetInput;
  const newAsset = {
    creatorId,
    blurredURL,
    originalURL,
    createdAt: new Date(),
    deletedAt: null,
    type: body.type,
    updatedAt: new Date(),
  } as WithId<AssetsEntity>;

  const { insertedId } = await assetsService.insertOne(newAsset);
  Object.assign(newAsset, { _id: insertedId });
  await creatorAssetService.insertOne({
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
  const result = await creatorAssetService.deleteOne({ assetId: assetId, creatorId: creatorId });
  if (result.deletedCount > 0) {
    return res.status(200).json({ message: 'THE ASSET IS DELETED SUCCESSFULLY' });
  } else {
    return res.status(400).json({ message: 'FAILED TO DELETE MESSAGE!' });
  }
};

export const getCreatorAssets = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const creatorAssets = await creatorAssetService
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
  const fanAssets = await fanAssetsService
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

export const uploadAndCreateAsset = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  if (!req.file) throw new Error('File is missing!');
  const file = req.file as Express.Multer.File;

  const originalFile = await uploadFile({
    buffer: file.buffer,
    contentType: file.mimetype,
    metadata: {
      userId: userId,
      originalName: req.file.originalname,
    },
    path: `assets/${userId}/${randomUUID()}/${file.originalname}`,
  });
  const blurredBuffer = await sharp(file.buffer)
    .blur(15)
    .resize(200, 200, {
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .toFormat('jpeg')
    .toBuffer();

  const blurredFile = await uploadFile({
    buffer: blurredBuffer,
    contentType: file.mimetype,
    metadata: {
      userId: userId,
      originalName: req.file.originalname,
    },
    path: `assets/${userId}/${randomUUID()}/${file.originalname}`,
  });
  await createAsset(req, res, originalFile.url, blurredFile.url);
  return { originalFile, blurredFile };
};