import { config } from 'dotenv';
config();

import cors from 'cors';
import express from 'express';

import morgan from 'morgan';
import loginRouter from './auth/auth.controller';
import messagesRouter from './messages/messages.controller';
import postsRouter from './posts/posts.controller';
import reelsRouter from './reels/reels.controller';
import storiesRouter from './stories/stories.controller';
import usersRouter from './users/users.controller';

const app = express();

declare module 'express' {
  interface Request {
    user?: { userId: string };
  }
}
app.use(express.json());
app.use(cors());

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'OK' });
});

app.use(loginRouter, usersRouter, postsRouter, storiesRouter, reelsRouter, messagesRouter);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
