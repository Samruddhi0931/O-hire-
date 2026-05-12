import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import flashcardRoutes from './routes/flashcards';
import topicRoutes from './routes/topics';
import questionRoutes from './routes/questions';
import dashboardRoutes from './routes/dashboard';
import interviewRoutes from './routes/interview';
import reportRoutes from './routes/report';

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/report', reportRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
