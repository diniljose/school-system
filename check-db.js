const { MongoClient } = require('mongodb');
(async () => {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('school-platform-dev');
  const user = await db.collection('users').findOne({ email: 'admin@school.com' });
  console.log('User:', JSON.stringify(user, null, 2));
  const school = await db.collection('schools').findOne({});
  console.log('School:', JSON.stringify(school, null, 2));
  await client.close();
})();
