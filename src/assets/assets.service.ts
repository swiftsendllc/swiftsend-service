import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import sharp from 'sharp';
import { AssetsEntity } from '../entities/assets.entity';
import { Collections } from '../util/constants';
import {
  assetsRepository,
  creatorAssetsRepository,
  fanAssetsRepository,
  postAssetsRepository,
} from '../util/repositories';
import { uploadFile } from '../util/upload';
import { DeleteAssetsInput } from './dto/delete-assets.dto';

export const deleteCreatorAssets = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const body = req.body as DeleteAssetsInput;
  const validAssetIds = body.assetIds.filter((id) => ObjectId.isValid(id));

  if (validAssetIds.length === 0) return res.status(400).json('Invalid asset ids!');

  const assetIds = validAssetIds.map((id) => new ObjectId(id));

  await creatorAssetsRepository.updateMany(
    { assetId: { $in: assetIds }, creatorId: creatorId },
    { $set: { deletedAt: new Date() } },
  );

  await creatorAssetsRepository.deleteMany({
    assetId: { $in: assetIds },
    creatorId: creatorId,
  });
  return res.status(200).json({ message: 'THE ASSET IS DELETED SUCCESSFULLY' });
};

export const getCreatorAssets = async (req: Request, res: Response) => {
  const creatorId = new ObjectId(req.user!.userId);
  const creatorAssets = await creatorAssetsRepository
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
  const fanAssets = await fanAssetsRepository
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

export const getPostAssets = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const postAssets = await postAssetsRepository.aggregate([
    {
      $match: {},
    },
  ]);
};

export const uploadAndCreateAsset = async (req: Request, res: Response) => {
  if (!req.file) throw new Error('File is missing!');
  const file = req.file as Express.Multer.File;
  const creatorId = new ObjectId(req.user!.userId);
  const type = req.query.type as string;

  const originalFile = await uploadFile({
    buffer: file.buffer,
    contentType: file.mimetype,
    metadata: {
      userId: creatorId.toString(),
      originalName: req.file.originalname,
    },
    path: `assets/${creatorId.toString()}/${randomUUID()}/${file.originalname}`,
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
      userId: creatorId.toString(),
      originalName: req.file.originalname,
    },
    path: `assets/${creatorId.toString()}/${randomUUID()}/${file.originalname}`,
  });

  const newAsset = {
    creatorId,
    blurredURL: blurredFile.url,
    originalURL: originalFile.url,
    createdAt: new Date(),
    deletedAt: null,
    type: type || 'image',
    updatedAt: new Date(),
  } as WithId<AssetsEntity>;

  const { insertedId } = await assetsRepository.insertOne(newAsset);
  Object.assign(newAsset, { _id: insertedId });
  await creatorAssetsRepository.insertOne({
    assetId: insertedId,
    createdAt: new Date(),
    creatorId: creatorId,
    deletedAt: null,
    updatedAt: null,
  });

  return res.status(200).json({ _assets: [newAsset] });
};
