import { randomUUID } from 'crypto';
import { Request, Router } from 'express';
import multer from 'multer';
import { auth } from '../auth/middleware';
import { uploadFile } from '../util/upload';
import {
  followProfile,
  getFollowers,
  getFollowing,
  getUserProfileByUsernameOrId,
  getUserProfiles,
  sendReport,
  unFollowProfile,
  updateUserProfile,
} from './users.service';

const upload = multer();

const router = Router();

router.get('/users/search', auth, getUserProfiles);

router.get('/users/:usernameOrId', auth, getUserProfileByUsernameOrId);

router.patch('/users/me/edit', auth, updateUserProfile);

router.post('/users/:userId/follow-user', auth, followProfile);

router.delete('/users/:userId/remove-follower', auth, unFollowProfile);

router.get('/users/:userId/followers', auth, getFollowers);

router.get('/users/:userId/following', auth, getFollowing);

router.post('/send/report', sendReport);

router.post('/users/upload', auth, upload.single('file'), async (req: Request, res) => {
  if (!req.file) throw new Error('File is missing');

  const result = await uploadFile({
    buffer: req.file.buffer,
    contentType: req.file.mimetype,
    metadata: {
      userId: req.user!.userId,
      originalname: req.file.originalname,
    },
    path: `assets/${req.user!.userId}/${randomUUID()}/${req.file.originalname}`,
  });
  return res.json(result);
});

// router.delete('/users/images/delete', auth, async (req: Request, res: Response) => {
//   if (!req.file) throw new Error('File is missing');

//   const result = await deleteFile({
//     path: `assets/${req.user!.userId}/${randomUUID()}/${req.file.originalname}`,
//   });
//   return res.json(result)
// });

export default router;
