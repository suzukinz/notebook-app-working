const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  console.log('Register request:', req.body);
  res.json({
    user: {
      id: '123',
      email: req.body.email,
      displayName: req.body.displayName
    },
    tokens: {
      accessToken: 'test-token',
      refreshToken: 'test-refresh'
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});