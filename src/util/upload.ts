import * as AWS from '@aws-sdk/client-s3';
import { configService } from './config';

const s3 = new AWS.S3({
  region: 'auto',
  endpoint: configService.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: configService.AWS_ACCESS_KEY_ID,
    secretAccessKey: configService.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketUrl = configService.AWS_BUCKET_URL;
const bucketName = configService.AWS_BUCKET_NAME;

export async function uploadFile(input: {
  path: string;
  contentType: string;
  buffer: Buffer;
  metadata: Record<string, string>;
}) {
  await s3.putObject({
    Key: input.path,
    Bucket: bucketName,
    Body: input.buffer,
    ACL: 'public-read',
    Metadata: input.metadata,
    ContentType: input.contentType,
  });

  return { path: input.path, url: `${bucketUrl}/${input.path}` };
}

export async function deleteFile(input: { path: string }) {
  await s3.deleteObject({
    Key: input.path,
    Bucket: bucketName,
  });

  return { path: input.path, url: `${bucketUrl}/${input.path}` };
}
