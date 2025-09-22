const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../src/models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/1001-login');
    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out in production)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Create admin user
    const adminUser = {
      name: 'System Administrator',
      email: 'admin@1001stories.com',
      password: 'Admin123!@#',
      role: ROLES.ADMIN,
      isEmailVerified: true,
      termsAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      privacyPolicyAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      profile: {
        bio: 'System Administrator for 1001 Stories platform'
      }
    };

    // Create moderator user
    const moderatorUser = {
      name: 'Content Moderator',
      email: 'moderator@1001stories.com',
      password: 'Moderator123!@#',
      role: ROLES.MODERATOR,
      isEmailVerified: true,
      termsAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      privacyPolicyAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      profile: {
        bio: 'Content moderator ensuring quality and safety'
      }
    };

    // Create creator user
    const creatorUser = {
      name: 'Story Creator',
      email: 'creator@1001stories.com',
      password: 'Creator123!@#',
      role: ROLES.CREATOR,
      isEmailVerified: true,
      termsAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      privacyPolicyAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      profile: {
        bio: 'Creative storyteller and content creator'
      }
    };

    // Create learner user
    const learnerUser = {
      name: 'Story Learner',
      email: 'learner@1001stories.com',
      password: 'Learner123!@#',
      role: ROLES.LEARNER,
      isEmailVerified: true,
      termsAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      privacyPolicyAccepted: {
        version: '1.0',
        acceptedAt: new Date()
      },
      profile: {
        bio: 'Eager learner exploring the world of stories'
      }
    };

    // Create demo users
    const demoUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        role: ROLES.LEARNER,
        isEmailVerified: true,
        termsAccepted: { version: '1.0', acceptedAt: new Date() },
        privacyPolicyAccepted: { version: '1.0', acceptedAt: new Date() }
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'Password123!',
        role: ROLES.CREATOR,
        isEmailVerified: true,
        termsAccepted: { version: '1.0', acceptedAt: new Date() },
        privacyPolicyAccepted: { version: '1.0', acceptedAt: new Date() }
      },
      {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        password: 'Password123!',
        role: ROLES.LEARNER,
        isEmailVerified: false, // Test email verification
        termsAccepted: { version: '1.0', acceptedAt: new Date() },
        privacyPolicyAccepted: { version: '1.0', acceptedAt: new Date() }
      }
    ];

    // Insert users
    const allUsers = [adminUser, moderatorUser, creatorUser, learnerUser, ...demoUsers];
    
    for (const userData of allUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (!existingUser) {
          const user = await User.create(userData);
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        } else {
          console.log(`⚠️  User already exists: ${userData.email}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\nDefault login credentials:');
    console.log('Admin: admin@1001stories.com / Admin123!@#');
    console.log('Moderator: moderator@1001stories.com / Moderator123!@#');
    console.log('Creator: creator@1001stories.com / Creator123!@#');
    console.log('Learner: learner@1001stories.com / Learner123!@#');
    console.log('\nDemo users: john@example.com, jane@example.com, bob@example.com / Password123!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
