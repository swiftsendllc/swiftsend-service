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
  getCommentsCreatedByYou,
  getCreatorPosts,
  getLikedPosts,
  getPost,
  getPostLikes,
  getPosts,
  getSavedPosts,
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

router.get('/posts/:id/likes', auth, getPostLikes);

router.get('/posts/user/liked', auth, getLikedPosts);

router.get('/posts/user/saved', auth, getSavedPosts);

router.get('/posts/user/commented', auth, getCommentsCreatedByYou);

router.post('/posts/upload', auth, upload.array('files'), async (req: Request, res) => {
  if (!req.files || req.files.length === 0) throw new Error('File is missing');
  const files = req.files as Express.Multer.File[];

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const originalFile = await uploadFile({
        buffer: file.buffer,
        contentType: file.mimetype,
        metadata: {
          userId: req.user!.userId,
          originalname: file.originalname,
        },
        path: `assets/${req.user!.userId}/${randomUUID()}/${file.originalname}`,
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
          userId: req.user!.userId,
          originalFile: file.originalname,
        },
        path: `assets/${req.user!.userId}/${randomUUID()}/blurred-${file.originalname}`,
      });

      return { originalFile, blurredFile };
    }),
  );

  return res.json(uploaded);
});

export default router;
