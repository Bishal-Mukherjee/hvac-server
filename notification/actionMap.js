const actionMap = {
  "client-sign-up": {
    path: "/views/client/sign-up/index.hbs",
    subject: "Welcome to HVAC Negotiators",
  },
  "new-task": {
    path: "/views/client/new-task/index.hbs",
    subject: "New task created",
  },
  "client-task-activated": {
    path: "/views/client/task-activated/index.hbs",
    subject: "Task activated",
  },
  "company-sign-up": {
    path: "/views/company/sign-up/index.hbs",
    subject: "Welcome to HVAC Negotiators",
  },
  "company-task-activated": {
    path: "/views/company/task-activated/index.hbs",
    subject: "Task activated",
  },
  "task-assigned": {
    path: "/views/company/task-assigned/index.hbs",
    subject: "Task assigned",
  },
  "company-task-in-progress": {
    path: "/views/company/task-in-progress/index.hbs",
    subject: "Task in progress",
  },
};

module.exports = { actionMap };
