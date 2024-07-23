const express = require('express');
const redis = require('redis');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

const redisClient = redis.createClient({
  url: 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001'
});

async function initializeRedis() {
  await redisClient.connect();
  console.log('Connected to Redis');

  // Create a test user
  const testUsername = 'testuser';
  const testPassword = 'password123';

  try {
    await redisClient.set(`user:${testUsername}`, testPassword);
    console.log(`Test user created: ${testUsername}`);
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

initializeRedis().catch(console.error);

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
