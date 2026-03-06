// STRINGS
await redis.set('key', 'value');
await redis.get('key');
await redis.set('key', 'value', { EX: 10 }); // Expires in 10 seconds
await redis.del('key');
await redis.incr('counter'); // Increment by 1
await redis.incrBy('counter', 5); // Increment by 5

// HASHES (objects)
await redis.hSet('user:1', 'name', 'John');
await redis.hSet('user:1', { age: 30, email: '[email protected]' });
await redis.hGet('user:1', 'name');
await redis.hGetAll('user:1');
await redis.hKeys('user:1');
await redis.hVals('user:1');

// LISTS
await redis.lPush('tasks', 'task1');
await redis.rPush('tasks', 'task2');
await redis.lRange('tasks', 0, -1); // Get all
await redis.lPop('tasks'); // Remove from left

// SETS (unique values)
await redis.sAdd('tags', 'nodejs');
await redis.sAdd('tags', 'redis');
await redis.sMembers('tags'); // Get all members
await redis.sIsMember('tags', 'nodejs'); // Check membership

// SORTED SETS (with scores)
await redis.zAdd('leaderboard', [
{ score: 100, value: 'player1' },
{ score: 200, value: 'player2' }
]);
await redis.zRange('leaderboard', 0, -1); // Get all by rank
await redis.zRangeWithScores('leaderboard', 0, -1); // With scores

// PUB/SUB (messaging)
const subscriber = redisClient.duplicate(); // Create separate connection
await subscriber.subscribe('channel', (message) => {
console.log('Received:', message);
});
await redisClient.publish('channel', 'Hello subscribers!');
