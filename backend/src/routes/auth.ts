import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: result.rows[0].id, email: result.rows[0].email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
