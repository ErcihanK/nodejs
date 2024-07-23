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
  console.log('Login attempt:', { username, password }); // Log the received credentials

  try {
    const storedPassword = await redisClient.get(`user:${username}`);
    
    if (!storedPassword) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (password === storedPassword) {
      console.log('Login successful');
      return res.status(200).json({ message: 'Login successful' });
    } else {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
