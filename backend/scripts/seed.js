const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const Academy = require('../src/models/Academy');
const Scout = require('../src/models/Scout');

dotenv.config();

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/goalconnect';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Academy.deleteMany({});
    await Scout.deleteMany({});
    console.log('Cleared existing users and profiles.');

    // 1. Create Admin
    const adminUser = await User.create({
      email: 'admin@goalconnect.com',
      password: 'password123',
      role: 'admin',
      status: 'approved',
      emailVerified: true
    });
    console.log('Admin user created: admin@goalconnect.com / password123');

    // 2. Create Academy
    const academyUser = await User.create({
      email: 'academy@goalconnect.com',
      password: 'password123',
      role: 'academy',
      status: 'approved',
      emailVerified: true
    });

    await Academy.create({
      user: academyUser._id,
      name: 'St. George Academy',
      region: 'Addis Ababa',
      registrationStatus: 'approved',
      description: 'The most successful football academy in Ethiopia.'
    });
    console.log('Academy user created: academy@goalconnect.com / password123');

    // 3. Create Scout
    const scoutUser = await User.create({
      email: 'scout@goalconnect.com',
      password: 'password123',
      role: 'scout',
      status: 'approved',
      emailVerified: true
    });

    await Scout.create({
      user: scoutUser._id,
      fullName: 'John Scout',
      organization: 'European Talent Hub',
      country: 'Germany',
      bio: 'Professional scout with 10 years of experience in African football.'
    });
    console.log('Scout user created: scout@goalconnect.com / password123');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
