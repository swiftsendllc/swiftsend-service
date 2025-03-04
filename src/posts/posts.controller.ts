import { randomUUID } from 'crypto';
import { Request, Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { auth } from '../auth/middleware';
import { uploadFile } from '../util/upload';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  editPost,
  getComment,
  getCreatorPosts,
  getLike,
  getLikes,
  getPost,
  getPosts,
  getSaves,
  likePost,
  savePost,
  sharePost,
  timeline,
} from './posts.service';

const router = Router();

const upload = multer();

router.get('/posts', auth, getPosts);

router.get('/posts/timeline', auth, timeline);

router.get('/posts/:postId', auth, getPost);

router.get('/posts/creators/:userId', auth, getCreatorPosts);

router.post('/posts/create', auth, createPost);

router.delete('/posts/:id/delete', auth, deletePost);

router.patch('/posts/:id/edit', auth, editPost);

router.put('/posts/:id/like', auth, likePost);

router.put('/posts/:id/create-comment', auth, createComment);

router.delete('/posts/:postId/comments/:commentId', auth, deleteComment);

router.put('/posts/:id/save', auth, savePost);

router.post('/posts/:id/share', auth, sharePost);

router.get('/posts/:id/likes', auth, getLikes);

router.get('/posts/user/:userId/likes', auth, getLike);

router.get('/posts/:userId/saves', auth, getSaves);

router.get('/posts/:userId/comments', auth, getComment);

router.post('/posts/upload', auth, upload.single('file'), async (req: Request, res) => {
  if (!req.file) throw new Error('File is missing');

  const originalFile = await uploadFile({
    buffer: req.file.buffer,
    contentType: req.file.mimetype,
    metadata: {
      userId: req.user!.userId,
      originalname: req.file.originalname,
    },
    path: `assets/${req.user!.userId}/${randomUUID()}/${req.file.originalname}`,
  });

  const blurredBuffer = await sharp(req.file.buffer)
    .blur(15)
    .resize(200, 200, {
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .toFormat('jpeg')
    .toBuffer();

  const blurredFile = await uploadFile({
    buffer: blurredBuffer,
    contentType: req.file.mimetype,
    metadata: {
      userId: req.user!.userId,
      originalFile: req.file.originalname,
    },
    path: `assets/${req.user!.userId}/${randomUUID()}/blurred-${req.file.originalname}`,
  });

  return res.json({
    originalUrl: originalFile.url,
    blurredUrl: blurredFile.url,
  });
});

export default router;
