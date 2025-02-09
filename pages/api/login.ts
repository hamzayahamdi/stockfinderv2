import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { password } = req.body;

    if (password === MASTER_PASSWORD) {
      const token = jwt.sign({}, JWT_SECRET, { expiresIn: '7d' });
      res.status(200).json({ token });
    } else {
      res.status(401).json({ message: 'Invalid password' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
