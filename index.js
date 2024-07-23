const express = require('express');
const redis = require('redis');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const redisUrl = process.env.REDIS_URL || 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001';

const redisClient = redis.createClient({
  url: redisUrl,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with
      // a individual error
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands
      // with a individual error
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    const testUsername = 'testuser';
    const testPassword = 'password123';

    await redisClient.set(`user:${testUsername}`, testPassword);
    console.log(`Test user created: ${testUsername}`);
  } catch (error) {
    console.error('Error initializing Redis:', error);
  }
}

initializeRedis();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

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
