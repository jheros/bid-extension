import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import applicationsRouter from './routes/applications.js';
import adminRouter from './routes/admin.js';
import teamRouter from './routes/team.js';
import profilesRouter from './routes/profiles.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());


app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/team', teamRouter);
app.use('/api/profiles', profilesRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'Bid Extension Backend is running' }));

if (process.env.NODE_ENV === "DEVELOPMENT") {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

export default app;
