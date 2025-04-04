import { config } from 'dotenv';
config();

import { sentry } from './util/sentry';
sentry();

import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { ENV } from './util/constants';

import http from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';
import assetsRouter from './assets/assets.controller';
import loginRouter from './auth/auth.controller';
import messagesRouter from './messages/messages.controller';
import paymentsRouter from './payments/payments.controller';
import { webhook } from './payments/payments.service';
import postsRouter from './posts/posts.controller';
import { redis } from './rdb/redis';
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

app.use('/stripe/payment/status/webhook', express.raw({ type: 'application/json' }), webhook);

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

export const onlineUsers = new Map<string, { socketId: string; lastActive: Date }>();

app.get('/', (req, res) => {
  res.json({ message: 'OK' });
});

app.get('/debug', () => {
  throw new Error('This is a test error');
});

app.use(
  loginRouter,
  usersRouter,
  postsRouter,
  storiesRouter,
  reelsRouter,
  messagesRouter,
  paymentsRouter,
  assetsRouter,
);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    onlineUsers.set(userId, { socketId: socket.id, lastActive: new Date() });

    socket.on('join', (room: string) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  }

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  Sentry.captureException(err);
  res.status(500).json('Internal server error');
});

const port = ENV('PORT');

server.listen(port, async () => {
  await redis.connect();
  console.log(`Server listening at http://localhost:${port}`);
});
