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
console.log(process.env.SOCKET_ADMIN_PASSWORD);
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

export const onlineUsers = new Map<string, string>();

app.get('/', (req, res) => {
  res.json({ message: 'OK' });
});

app.use(loginRouter, usersRouter, postsRouter, storiesRouter, reelsRouter, messagesRouter);

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  const userId = socket.handshake.query.userId as string;
  if (userId) {
    onlineUsers.set(userId, socket.id);

    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  }

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    const deleteUserId = Array.from(onlineUsers.entries()).find(([, socketId]) => socketId === socket.id)?.[0];

    if (deleteUserId) {
      onlineUsers.delete(deleteUserId);
    }
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

const port = process.env.PORT;
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
