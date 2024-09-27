const admin = require("firebase-admin");
const { getUserByEmail } = require("./helpers");

const auth = (requiredDesignation) => async (req, res, next) => {
  const idToken = req.headers.authorization;
  if (!idToken) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await getUserByEmail(decodedToken.email);

    if (!user) {
      return res.status(401).send("Unauthorized: User not found");
    }

    if (user.designation !== requiredDesignation) {
      return res
        .status(401)
        .send(`Unauthorized: User does not have ${requiredDesignation} access`);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return res.status(401).send("Unauthorized: Invalid token");
  }
};

module.exports = { auth };
