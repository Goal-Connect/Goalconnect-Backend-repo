const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

const seedUsers = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/goalconnect";

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = [
      {
        email: "admin@example.com",
        password: await bcrypt.hash("Admin123!", 10),
        role: "admin",
        status: "verified",
      },
      {
        email: "academy@example.com",
        password: await bcrypt.hash("Academy123!", 10),
        role: "academy",
        status: "verified",
      },
      {
        email: "scout@example.com",
        password: await bcrypt.hash("Scout123!", 10),
        role: "scout",
        status: "verified",
      },
      {
        email: "player@example.com",
        password: await bcrypt.hash("Player123!", 10),
        role: "player",
        status: "verified",
      },
    ];

    for (const user of users) {
      const existingUser = await User.findOne({ email: user.email });
      if (!existingUser) {
        await User.create(user);
        console.log(`User with email ${user.email} created.`);
      } else {
        console.log(`User with email ${user.email} already exists.`);
      }
    }

    console.log("Seeding completed.");
    process.exit();
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
