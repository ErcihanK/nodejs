const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Redis client setup
const redisUrl = 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => console.error('Redis Client Error', err));

client.connect().then(() => {
  console.log('Connected to Redis');
});

// API endpoints
app.post('/food-entry', async (req, res) => {
  const { userName, foodItem, calories } = req.body;
  if (!userName || !foodItem || !calories) {
    return res.status(400).send('User name, food item, and calories are required');
  }

  const id = `food:${Date.now()}`;
  await client.hSet(id, 'userName', userName, 'foodItem', foodItem, 'calories', calories);
  res.status(201).send('Food entry added');
});

app.get('/food-entries', async (req, res) => {
  const keys = await client.keys('food:*');
  const foodEntries = [];
  for (const key of keys) {
    const entry = await client.hGetAll(key);
    foodEntries.push(entry);
  }
  res.json(foodEntries);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
