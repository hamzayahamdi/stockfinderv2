import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const CORRECT_PASSWORD = process.env.AUTH_PASSWORD;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { password } = req.body;

    if (!JWT_SECRET || !CORRECT_PASSWORD) {
      console.error('JWT_SECRET or AUTH_PASSWORD is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    if (password === CORRECT_PASSWORD) {
      const token = jwt.sign({ authorized: true }, JWT_SECRET, { expiresIn: '7d' });
      res.status(200).json({ message: 'Authentication successful', token });
    } else {
      res.status(401).json({ message: 'Invalid password' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
