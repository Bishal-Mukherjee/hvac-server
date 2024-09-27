const { getDatabase } = require("firebase-admin/database");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");
const { compactUUID } = require("../utils/stringUtils");
const { NOTIFICATION_CONFIG } = require("./config");
const { actionMap } = require("./actionMap");
require("dotenv").config();

exports.createNotification = ({
  title,
  description,
  resourceType,
  resourceId,
  type,
}) => {
  try {
    const notification = {
      id: compactUUID(),
      title,
      description: description || NOTIFICATION_CONFIG[type].description,
      resourceType: resourceType || NOTIFICATION_CONFIG[type].resourceType,
      resourceId,
      type,
      createdAt: new Date().toISOString(),
      isUnRead: true,
    };
    const database = getDatabase();
    database.ref(`/${notification.id}`).set(notification);
    return notification;
  } catch (err) {
    console.log(err.message);
  }
};

exports.sendEmail = async ({ to, action, context }) => {
  if (!action || !to || !context) {
    console.log("parameters missing");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SENDER_HOST,
    port: process.env.SENDER_PORT,
    secure: false,
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASSWORD,
    },
  });

  const subject = actionMap[action].subject;
  const templatePath = actionMap[action].path;

  const resultantPath = path.join(process.cwd(), templatePath);
  const template = path.resolve(process.cwd(), resultantPath);
  const content = fs.readFileSync(template, "utf-8");
  const compiledTemplate = handlebars.compile(content);
  const html = compiledTemplate(context);

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    subject,
    html,
  };

  try {
    const info = await Promise.all(
      to.map((recipient) =>
        transporter.sendMail({ ...mailOptions, to: recipient })
      )
    );
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
