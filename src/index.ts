import { config } from 'dotenv';
config();

import cors from 'cors';
import express from 'express';

import loginRouter from './auth/auth.controller';
import postsRouter from './posts/posts.controller';
import usersRouter from './users/users.controller';

const app = express();

declare module 'express' {
  interface Request {
    user?: { userId: string };
  }
}
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ message: 'OK' });
});

app.use(loginRouter);
app.use(usersRouter);
app.use(postsRouter);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
