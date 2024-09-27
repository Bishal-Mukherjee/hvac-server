const dayjs = require("dayjs");
const { compactUUID } = require("../../utils/stringUtils");
const Task = require("../../models/tasks");
const Bid = require("../../models/bids");
const TaskAcceptance = require("../../models/task-acceptance");
const {
  createNotification,
  sendEmail,
} = require("../../notification/controller");
const { NOTIFICATION_TYPE } = require("../../notification/config");
const { Status, ADMIN_EMAIL } = require("../../constants");

/* @desc:  Retrieves tasks based on status. */
// @route: GET /api/company/getTasks?status="created"|"assigned"|"in-progress"|"completed"
exports.getTasks = async (req, res) => {
  const { email } = req.user;
  const { status = Status.CREATED } = req.query; // status can be 'assigned' / 'in-progress' / 'completed'
  let tasks = [];

  try {
    if (status === Status.CREATED) {
      // gets those tasks that are activated in the last 72 hours, where no bids have been placed
      const seventyTwoHoursAgo = dayjs().subtract(72, "hour").toDate();

      const rejectedTaskIds = await TaskAcceptance.aggregate([
        { $match: { company: email, status: Status.REJECTED } },
        { $project: { _id: 0, taskId: 1, status: 1 } },
      ]).exec();

      const previouslyRejectedTaskIds = rejectedTaskIds?.map(
        (task) => task.taskId
      );

      tasks = await Task.aggregate([
        {
          $match: {
            status,
            isActive: true,
            activationDate: { $gte: seventyTwoHoursAgo },
            assignedTo: null,
            id: { $nin: previouslyRejectedTaskIds },
            $or: [
              { suggestedBidders: { $size: 0 } },
              { suggestedBidders: email },
            ],
          },
        },
        {
          $lookup: {
            from: "bids",
            localField: "id",
            foreignField: "taskId",
            as: "bid",
          },
        },
        // {
        //   $match: {
        //     $expr: {
        //       $not: {
        //         $in: [email, "$bid.bidder.email"],
        //       },
        //     },
        //   },
        // },
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
        { $project: { _id: 0, email: 0, name: 0, __v: 0, bid: 0 } },
      ]).exec();
    } else if (status === Status.ASSIGNED) {
      // can also add ' status === "rejected" ' if needed
      const acceptedTasksDoc = await TaskAcceptance.aggregate([
        { $match: { company: email, status: Status.ACCEPTED } },
        { $project: { _id: 0, taskId: 1, status: 1 } },
      ]).exec();
      if (acceptedTasksDoc) {
        const ids = acceptedTasksDoc?.map((task) => task.taskId);
        // query for the tasks which the company has accepted to bid
        // and also the tasks should not be assigned to any one
        tasks = await Task.aggregate([
          { $match: { id: { $in: ids }, status } },
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
          { $project: { _id: 0, email: 0, name: 0, __v: 0 } },
        ]);
      }
    } else {
      // gets all tasks assigned to the company
      tasks = await Task.aggregate([
        { $match: { "assignedTo.email": email, status } },
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
        { $project: { _id: 0, email: 0, name: 0, __v: 0 } },
      ]).exec();
    }
    if (!tasks) {
      return res.status(404).json({ tasks });
    }
    return res.status(200).json({ tasks });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get tasks" });
  }
};

/* @desc:  Retrieves a specific task by its taskId. */
// @route: GET /api/company/getTask/:taskId
exports.getTaskById = async (req, res) => {
  const { taskId } = req.params;
  const { email } = req.user;

  try {
    const task = await Task.findOne({ id: taskId }).select("-_id");
    // also try to get the relevant bids that were raised on that task, by the company
    const bids = await Bid.find({ taskId, "bidder.email": email })
      .select("-_id")
      .sort({ amount: 1 });
    const taskAcceptance = await TaskAcceptance.findOne({
      taskId,
      company: email,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.status(200).json({ task, bids, taskAcceptance });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get task" });
  }
};

/* @desc:  create an acceptance doc in the database. */
// @route: POST /api/company/acceptOrRejectTask/:taskId
exports.postAcceptOrRejectTask = async (req, res) => {
  const { email } = req.user;
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const newTaskAcceptance = new TaskAcceptance({
      taskId,
      company: email,
      status,
    });
    await newTaskAcceptance.save();
    return res
      .status(200)
      .json({ message: "Task acceptance added successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to add task acceptance" });
  }
};

/* @desc:  Updates the status of a task in the database. */
// @route: PUT /api/company/makeInProgress/:taskId
exports.markInProgress = async (req, res) => {
  const { taskId } = req.params;
  const { firstName } = req.user;

  try {
    const task = await Task.findOne({ id: taskId }).select("-_id");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await Task.updateOne(
      { id: taskId },
      { $set: { status: Status.IN_PROGRESS } }
    );

    await sendEmail({
      action: "company-task-in-progress",
      to: [ADMIN_EMAIL],
      context: { companyName: firstName, taskId },
    });

    return res
      .status(200)
      .json({ message: "Task status updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to update task status" });
  }
};

/* @desc:  Creates a new bid for a task. */
// @route: POST /api/company/createBid/:taskId
// body: { amount }
exports.createBid = async (req, res) => {
  const { taskId } = req.params;
  const { firstName, email } = req.user;
  const { amount, attachment, estimatedCompletionDays, quality, logo } =
    req.body;
  const id = compactUUID();

  try {
    const task = await Task.findOne({ id: taskId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== Status.CREATED) {
      return res.status(400).json({ message: "Task already assigned" });
    }

    const hasExistingBids = await Bid.findOne({
      taskId,
      "bidder.email": email,
    });

    const bid = new Bid({
      id,
      taskId,
      amount,
      estimatedCompletionDays,
      attachment,
      quality,
      bidder: { name: firstName, email, ...(hasExistingBids ? {} : { logo }) },
    });

    await bid.save();

    // create notification for admin
    createNotification({
      type: NOTIFICATION_TYPE.BID_PLACED,
      title: firstName,
      resourceId: taskId,
    });
    return res.status(200).json({ bid });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to place bid" });
  }
};

exports.getBidsByTaskId = async (req, res) => {
  const { taskId } = req.params;

  try {
    const bid = await Bid.find({ taskId: taskId });
    if (!bid) {
      return res.status(404).json({ message: "Bids not found" });
    }
    return res.status(200).json({ bid });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get bids" });
  }
};

exports.getTaskAcceptances = async (req, res) => {
  const { email } = req.user;
  const seventyTwoHoursAgo = dayjs().subtract(72, "hour").toDate();

  try {
    const taskAcceptance = await TaskAcceptance.aggregate([
      {
        $match: {
          company: email,
          status: Status.ACCEPTED,
          createdAt: { $gte: seventyTwoHoursAgo },
        },
      },
      { $project: { _id: 0, taskId: 1, status: 1 } },
    ]).exec();

    const taskIds = taskAcceptance.map((task) => task.taskId);

    if (!taskAcceptance) {
      return res.status(404).json({ message: "Task acceptance not found" });
    }
    return res.status(200).json({ results: taskIds });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get task acceptance" });
  }
};
