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

// Function to fetch food image from TheMealDB API
const fetchFoodImage = async (foodItem) => {
  try {
    const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${foodItem}`);
    if (response.data.meals) {
      return response.data.meals[0].strMealThumb;
    }
    return null;
  } catch (error) {
    console.error('Error fetching food image:', error);
    return null;
  }
};

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

// API endpoint to get all threads
app.get('/threads', async (req, res) => {
  const keys = await client.keys('thread:*');
  const threads = [];
  for (const key of keys) {
    const thread = await client.hGetAll(key);
    threads.push(thread);
  }
  res.json(threads);
});

// API endpoint to post a new thread
app.post('/threads', async (req, res) => {
  const { userName, title, message } = req.body;
  if (!userName || !title || !message) {
    return res.status(400).send('User name, title, and message are required');
  }

  const id = `thread:${Date.now()}`;
  const newThread = { id, userName, title, message, timestamp: new Date().toISOString(), replies: [] };
  console.log('Adding to Redis:', id, newThread);

  try {
    await client.hSet(id, 'id', newThread.id);
    await client.hSet(id, 'userName', newThread.userName);
    await client.hSet(id, 'title', newThread.title);
    await client.hSet(id, 'message', newThread.message);
    await client.hSet(id, 'timestamp', newThread.timestamp);

    res.status(201).send(newThread);
  } catch (error) {
    console.error('Error adding to Redis:', error);
    res.status(500).send('Error adding thread');
  }
});

// API endpoint to get a specific thread with replies
app.get('/threads/:id', async (req, res) => {
  const { id } = req.params;
  const thread = await client.hGetAll(id);

  if (!thread) {
    return res.status(404).send('Thread not found');
  }

  const replyKeys = await client.keys(`reply:${id}:*`);
  const replies = [];
  for (const key of replyKeys) {
    const reply = await client.hGetAll(key);
    replies.push(reply);
  }

  thread.replies = replies;
  res.json(thread);
});

// API endpoint to post a reply to a thread
app.post('/threads/:id/replies', async (req, res) => {
  const { id } = req.params;
  const { userName, message } = req.body;
  if (!userName || !message) {
    return res.status(400).send('User name and message are required');
  }

  const replyId = `reply:${id}:${Date.now()}`;
  const newReply = { id: replyId, userName, message, timestamp: new Date().toISOString(), likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
  console.log('Adding to Redis:', replyId, newReply);

  try {
    await client.hSet(replyId, 'id', newReply.id);
    await client.hSet(replyId, 'userName', newReply.userName);
    await client.hSet(replyId, 'message', newReply.message);
    await client.hSet(replyId, 'timestamp', newReply.timestamp);
    await client.hSet(replyId, 'likes', newReply.likes);
    await client.hSet(replyId, 'dislikes', newReply.dislikes);
    await client.hSet(replyId, 'likedBy', JSON.stringify(newReply.likedBy));
    await client.hSet(replyId, 'dislikedBy', JSON.stringify(newReply.dislikedBy));

    res.status(201).send(newReply);
  } catch (error) {
    console.error('Error adding to Redis:', error);
    res.status(500).send('Error adding reply');
  }
});

// API endpoint to like a reply
app.post('/threads/:threadId/replies/:replyId/like', async (req, res) => {
  const { replyId } = req.params;
  const { userName } = req.body;

  try {
    const reply = await client.hGetAll(replyId);
    const likedBy = JSON.parse(reply.likedBy || '[]');

    if (likedBy.includes(userName)) {
      return res.status(400).send('User already liked this reply');
    }

    likedBy.push(userName);
    const dislikedBy = JSON.parse(reply.dislikedBy || '[]').filter(user => user !== userName);

    await client.hSet(replyId, 'likes', parseInt(reply.likes) + 1);
    await client.hSet(replyId, 'dislikedBy', JSON.stringify(dislikedBy));
    await client.hSet(replyId, 'likedBy', JSON.stringify(likedBy));

    const updatedReply = await client.hGetAll(replyId);
    res.status(200).send(updatedReply);
  } catch (error) {
    console.error('Error liking reply:', error);
    res.status(500).send('Error liking reply');
  }
});

// API endpoint to dislike a reply
app.post('/threads/:threadId/replies/:replyId/dislike', async (req, res) => {
  const { replyId } = req.params;
  const { userName } = req.body;

  try {
    const reply = await client.hGetAll(replyId);
    const dislikedBy = JSON.parse(reply.dislikedBy || '[]');

    if (dislikedBy.includes(userName)) {
      return res.status(400).send('User already disliked this reply');
    }

    dislikedBy.push(userName);
    const likedBy = JSON.parse(reply.likedBy || '[]').filter(user => user !== userName);

    await client.hSet(replyId, 'dislikes', parseInt(reply.dislikes) + 1);
    await client.hSet(replyId, 'likedBy', JSON.stringify(likedBy));
    await client.hSet(replyId, 'dislikedBy', JSON.stringify(dislikedBy));

    const updatedReply = await client.hGetAll(replyId);
    res.status(200).send(updatedReply);
  } catch (error) {
    console.error('Error disliking reply:', error);
    res.status(500).send('Error disliking reply');
  }
});

// API endpoint to update user data
app.put('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { weight, height, age } = req.body;

  try {
    await client.hSet(id, 'weight', weight);
    await client.hSet(id, 'height', height);
    await client.hSet(id, 'age', age);

    res.status(200).send('User data updated');
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).send('Error updating user data');
  }
});

// API endpoint to get user data
app.get('/user/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const userData = await client.hGetAll(id);
    if (!userData) {
      return res.status(404).send('User not found');
    }

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
