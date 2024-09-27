const mongoose = require("mongoose");
const admin = require("firebase-admin");
require("dotenv").config();

exports.initializeFirebaseAdmin = () => {
  admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail: process.env.CLIENT_EMAIL,
      privateKey: process.env.PRIVATE_KEY,
      projectId: process.env.PROJECT_ID,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return admin;
};

exports.initializeMongoose = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    mongoose.set("strictQuery", true);
    console.log("🛢️  DATABASE CONNECTED");
  } catch (err) {
    console.log("DATABASE CONNECTION ERROR");
    console.log(err);
  }
};
