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
const redisUrl = process.env.REDIS_URL || 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => console.error('Redis Client Error', err));

client.connect().then(() => {
  console.log('Connected to Redis');
});

// API endpoint to post a new food entry
app.post('/food-entry', async (req, res) => {
  const { userName, foodItem, calories } = req.body;
  if (!userName || !foodItem || !calories) {
    return res.status(400).send('User name, food item, and calories are required');
  }

  const id = `food:${Date.now()}`;
  console.log('Adding to Redis:', id, { userName, foodItem, calories });

  try {
    await client.hSet(id, 'userName', userName);
    await client.hSet(id, 'foodItem', foodItem);
    await client.hSet(id, 'calories', calories);

    res.status(201).send('Food entry added');
  } catch (error) {
    console.error('Error adding to Redis:', error);
    res.status(500).send('Error adding food entry');
  }
});

// API endpoint to get all food entries
app.get('/food-entries', async (req, res) => {
  const keys = await client.keys('food:*');
  const foodEntries = [];
  for (const key of keys) {
    const entry = await client.hGetAll(key);
    entry.id = key;
    foodEntries.push(entry);
  }
  res.json(foodEntries);
});

// API endpoint to delete a food entry
app.delete('/food-entry/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const exists = await client.exists(id);
    if (!exists) {
      return res.status(404).send('Food entry not found');
    }

    await client.del(id);
    res.status(200).send('Food entry deleted');
  } catch (error) {
    console.error('Error deleting from Redis:', error);
    res.status(500).send('Error deleting food entry');
  }
});

// Community forum endpoints

// API endpoint to get all messages
app.get('/messages', async (req, res) => {
  const keys = await client.keys('message:*');
  const messages = [];
  for (const key of keys) {
    const message = await client.hGetAll(key);
    messages.push(message);
  }
  res.json(messages);
});

// API endpoint to post a new message
app.post('/messages', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).send('Message is required');
  }

  const id = `message:${Date.now()}`;
  const newMessage = { message, timestamp: new Date().toISOString() };
  console.log('Adding to Redis:', id, newMessage);

  try {
    await client.hSet(id, 'message', newMessage.message);
    await client.hSet(id, 'timestamp', newMessage.timestamp);

    res.status(201).send(newMessage);
  } catch (error) {
    console.error('Error adding to Redis:', error);
    res.status(500).send('Error adding message');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
