const admin = require("firebase-admin");

const getUserByEmail = async (email) => {
  const db = admin.firestore();
  const usersCollection = db.collection("users");
  try {
    const querySnapshot = await usersCollection
      .where("email", "==", email)
      .limit(1)
      .get();
    if (querySnapshot.empty) {
      return null;
    }
    const userDoc = querySnapshot.docs[0];
    return userDoc.data();
  } catch (error) {
    console.error("Error retrieving user by email:", error);
    throw new Error("Error retrieving user by email");
  }
};

module.exports = { getUserByEmail };
