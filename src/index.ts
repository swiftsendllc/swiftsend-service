import { config } from 'dotenv';
config();

import cors from 'cors';
import express from 'express';

import http from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';
import loginRouter from './auth/auth.controller';
import messagesRouter from './messages/messages.controller';
import postsRouter from './posts/posts.controller';
import reelsRouter from './reels/reels.controller';
import storiesRouter from './stories/stories.controller';
import usersRouter from './users/users.controller';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

declare module 'express' {
  interface Request {
    user?: { userId: string };
  }
}

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

export const onlineUsers = new Map<string, {socketId: string, lastActive: Date}>();

app.get('/', (req, res) => {
  res.json({ message: 'OK' });
});

app.use(loginRouter, usersRouter, postsRouter, storiesRouter, reelsRouter, messagesRouter);

io.on('connection', socket => {

  const userId = socket.handshake.query.userId as string;
  if (userId) {
    onlineUsers.set(userId, {socketId:socket.id, lastActive: new Date()});

    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  }

  socket.on('disconnect', () => {
      onlineUsers.delete(userId);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

const port = process.env.PORT;
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
