const dayjs = require("dayjs");
const admin = require("firebase-admin");
const Task = require("../../models/tasks");
const Bid = require("../../models/bids");
const TaskAcceptance = require("../../models/task-acceptance");
const { compactUUID } = require("../../utils/stringUtils");
const { sendEmail } = require("../../notification/controller");
const { Status } = require("../../constants");

/* @desc:  Retrieves all tasks from the database and returns
   them in a sorted order based on creation date. */
// @route: GET /api/admin/getAllTask
exports.getAllTask = async (req, res) => {
  const { status = Status.CREATED } = req.query;

  try {
    const tasks = await Task.aggregate([
      { $match: { status } },
      {
        $addFields: {
          previewImage: {
            $cond: [
              { $gt: [{ $size: "$images" }, 0] },
              { $arrayElemAt: ["$images", 0] },
              "",
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 0, __v: 0, images: 0, address: 0 } },
    ]).exec();

    if (!tasks) {
      return res.status(404).json({ tasks: [] });
    }
    return res.status(200).json({ tasks });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get tasks" });
  }
};

/* @desc:  Retrieves a specific task by its taskId and also retrieves 
   all bids associated with that task */
// @route: GET /api/admin/getTask/:taskId
exports.getTaskById = async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ id: taskId }).select("-_id");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const bids = await Bid.find({ taskId }).select("-_id").sort({ amount: 1 });
    return res.status(200).json({ task, bids });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get task" });
  }
};

/* @desc:  Retrieves tasks created within the last seven days. */
// @route: GET /api/admin/getRecentTasks
exports.getRecentTasks = async (req, res) => {
  const sevenDaysAgo = dayjs().subtract(7, "day").toDate();

  try {
    const tasks = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      { $addFields: { images: { $size: "$images" } } },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 0, id: 1, title: 1 } },
    ]).exec();
    if (!tasks) {
      return res.status(404).json({ tasks: [] });
    }
    return res.status(200).json({ tasks });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get tasks" });
  }
};

/* desc: Creates a new task */
// route: POST /api/admin/createTask
// body: { firstName, lastName, email, title, description, images, attachments, address }
exports.createTask = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    title,
    description,
    address,
    images,
    attachments,
  } = req.body;

  if (!title || !address) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const id = compactUUID();

    const task = new Task({
      id,
      title,
      description,
      status: Status.CREATED,
      name: `${firstName} ${lastName}`,
      email,
      address,
      images,
      attachments,
    });

    await task.save();

    await sendEmail({
      action: "new-task",
      to: [email],
      context: { name: `${firstName} ${lastName}`, taskId: id },
    });

    return res.status(201).json({
      message: "Task created successfully",
      taskId: id,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ message: "Failed to create task" });
  }
};

/* desc: Updates a specific task by its taskId */
// route: PUT /api/admin/updateTask/:taskId
// body: { title, description, images }
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, images, attachments } = req.body;

  try {
    const task = await Task.findOne({ id: taskId });
    const updateFields = {};

    if (!task.isActive) {
      if (title) {
        updateFields.title = title;
      }

      if (description) {
        updateFields.description = description;
      }

      if (images && images.length > 0) {
        updateFields.images = images;
      }

      if (attachments && attachments.length > 0) {
        updateFields.attachments = attachments;
      }

      if (Object.keys(updateFields).length > 0) {
        await Task.updateOne({ id: taskId }, { $set: updateFields });
        return res.status(200).json({ message: "Task updated successfully" });
      } else {
        return res.status(400).json({ message: "No fields to update" });
      }
    }
    return res
      .status(400)
      .json({ message: "Failed to update. Task is active" });
  } catch (err) {
    console.error("Error updating task:", err);
    return res.status(500).json({ message: "Failed to update task" });
  }
};

/* @desc:  Updates the status of a task in the database. */
// @route: PUT /api/admin/updateTaskStatus/:taskId
// body: { status }
exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const task = await Task.findOne({ id: taskId }).select("-_id");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await Task.updateOne({ id: taskId }, { $set: { status } });
    return res
      .status(200)
      .json({ message: "Task status updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to update task status" });
  }
};

/* @desc:  Updates the isActive of a task in the database. */
// @route: POST /api/admin/updateActivateTask/:taskId
exports.updateActivateTask = async (req, res) => {
  const { taskId } = req.params;
  const { suggestedBidders } = req.body;
  try {
    const task = await Task.findOne({ id: taskId }).select("-_id");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await Task.updateOne(
      { id: taskId },
      { $set: { isActive: true, suggestedBidders, activationDate: new Date() } }
    );

    await sendEmail({
      action: "client-task-activated",
      to: [task.email],
      context: { name: `${task.firstName} ${task.lastName}`, taskId },
    });

    await sendEmail({
      action: "company-task-activated",
      to: suggestedBidders,
      context: { taskId },
    });

    return res.status(200).json({ message: "Task activated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to activate task" });
  }
};

/* @desc: Selects a bid for a task, marking it as "accepted" and 
   rejecting all other bids for that task. */
// @route: PUT /api/admin/updateSelectBid/:taskId/:bidId
exports.updateSelectBid = async (req, res) => {
  const { taskId, bidId } = req.params;
  try {
    const task = await Task.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.assignedTo) {
      const bid = await Bid.findOne({ id: bidId });

      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      await Bid.updateOne({ id: bidId }, { $set: { status: "accepted" } });

      await Bid.updateMany(
        { taskId: taskId, id: { $ne: bidId } },
        { $set: { status: "rejected" } }
      );

      await Task.updateOne(
        { id: taskId },
        {
          $set: {
            assignedTo: { name: bid.bidder.name, email: bid.bidder.email },
            status: "assigned",
          },
        }
      );

      await sendEmail({
        action: "task-assigned",
        to: [bid.bidder.email],
        context: {
          taskId,
          name: bid.bidder.name,
          amount: `${bid.amount} ${bid.currency}`,
          quality: bid.quality,
          attachment: bid.attachment,
        },
      });

      return res.status(200).json({ message: "Bid selected successfully" });
    }
    return res.status(400).json({ message: "Task already assigned" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to select bid" });
  }
};

// exports.postCreateClient = async (req, res) => {
//   const { email, password, firstName, lastName, phoneNumber } = req.body;

//   try {
//     const userData = {
//       email,
//       password,
//       firstName,
//       lastName,
//       phoneNumber,
//       designation: "CLIENT",
//     };
//     await auth().createUser(userData);
//     return res.status(200).json({ message: "User created successfully" });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Failed to create user" });
//   }
// };

/* desc: Sends email to interested clients */
// route: POST /api/admin/email/:action
exports.postSendEmail = async (req, res) => {
  const { action } = req.params;
  const { emails, context } = req.body;

  try {
    await sendEmail({ action, to: emails, context });
    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to send email" });
  }
};

/* desc: Clears all tasks related to a client */
// route: DELETE /api/admin/disassociateClient/:email
exports.disassociateClient = async (req, res) => {
  const { email } = req.params;

  try {
    const hasActiveTask = await Task.findOne({
      email,
      $or: [
        { status: Status.CREATED },
        { status: Status.ASSIGNED },
        { status: Status.IN_PROGRESS },
      ],
    });

    if (hasActiveTask) {
      return res.status(400).json({
        message:
          "Client cannot be disassociated while it has open or active tasks",
      });
    }

    await Task.deleteMany({ email });

    return res
      .status(200)
      .json({ message: "Client related tasks cleared successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to clear client related tasks" });
  }
};

/* desc: Clears all tasks, bids related to a company */
// route: DELETE /api/admin/disassociateCompany/:email
exports.disassociateCompany = async (req, res) => {
  const { email } = req.params;

  try {
    const hasActiveTask = await Task.findOne({
      "assignedTo.email": email,
      status: "in-progress",
      //   $or: [{ status: "in-progress" }, { status: { $exists: true } }],
    });

    if (hasActiveTask) {
      return res.status(400).json({
        message:
          "Company cannot be disassociated while it has active or assigned tasks",
      });
    }

    await Promise.all([
      Bid.deleteMany({ "bidder.email": email }),
      TaskAcceptance.deleteMany({ company: email }),
    ]);

    return res
      .status(200)
      .json({ message: "Company related details cleared successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to clear company related details" });
  }
};

exports.unassignTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ id: taskId });

    if (!task) return res.status(404).json({ message: "Task not found" });

    await Task.updateOne(
      { id: taskId },
      { $set: { status: Status.CREATED, assignedTo: null } }
    );

    await Bid.updateMany(
      { taskId: taskId },
      { $set: { status: Status.PENDING } }
    );

    return res.status(200).json({ message: "Task status reset successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to reset task status" });
  }
};

exports.deleteUser = async (req, res) => {
  const { email } = req.params;
  try {
    const user = await admin.auth().getUserByEmail(email);

    if (!user) return res.status(404).json({ message: "User not found" });

    await admin.auth().deleteUser(user.uid);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};
