const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

async function generateToken() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    
    // Get a user from school_scho_7028
    const db = client.db('school_scho_7028');
    const user = await db.collection('users').findOne(
      { email: 't3school12@gmail.com' }
    );
    
    if (!user) {
      console.log('No suitable user found');
      process.exit(1);
    }

    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Name:', user.firstName, user.lastName);
    
    // Get permissions from the role
    const role = await db.collection('roles').findOne({
      code: user.role
    });
    
    const permissions = role?.permissions || [];
    console.log('  Permissions:', permissions.length, 'permissions');
    
    // Use the dev JWT secret from .env.dev
    const secret = 'dev-secret-change-in-production-min-32-chars-long!!';

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolCode: 'scho_7028',
        isTenantUser: true,
        schoolId: user.school?.toString() || new ObjectId().toString(),
        id: user._id.toString(),
        permissions: permissions,
      },
      secret,
      { expiresIn: '24h' }
    );

    console.log('\nGenerated JWT Token:');
    console.log(token);
    
    return token;
  } finally {
    await client.close();
  }
}

generateToken().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
