const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'snapduel-dev-secret';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.wallet = decoded.wallet;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(wallet) {
  return jwt.sign({ wallet }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
