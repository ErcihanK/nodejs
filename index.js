const express = require('express');
const redis = require('redis');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

const redisClient = redis.createClient({
  url: 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001'
});

redisClient.connect().catch(console.error);

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const storedPassword = await redisClient.get(`user:${username}`);
    
    if (!storedPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (password === storedPassword) {
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
