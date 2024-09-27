const NOTIFICATION_TYPE = {
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
  BID_PLACED: "bid_placed",
};

const NOTIFICATION_CONFIG = {
  task_created: {
    description: "has created a task",
    resourceType: "task",
  },
  task_updated: {
    description: "has updated a task",
    resourceType: "task",
  },
  bid_placed: {
    description: "has placed a bid",
    resourceType: "bid",
  },
};

module.exports = {
  NOTIFICATION_TYPE,
  NOTIFICATION_CONFIG,
};
