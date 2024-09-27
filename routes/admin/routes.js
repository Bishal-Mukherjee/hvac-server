const { Router } = require("express");
const router = Router();
const {
  getAllTask,
  getTaskById,
  getRecentTasks,
  createTask,
  updateTaskStatus,
  updateSelectBid,
  updateActivateTask,
  updateTask,
  disassociateClient,
  disassociateCompany,
  unassignTask,
  postSendEmail,
  deleteUser,
  //   createTask,
  //   deleteTask,
} = require("../../controllers/admin");
const { auth } = require("../../middlewares/auth");

router.get("/getAllTask", auth("ADMIN"), getAllTask);

router.get("/getTask/:taskId", auth("ADMIN"), getTaskById);

router.get("/getRecentTasks", auth("ADMIN"), getRecentTasks);

router.post("/createTask", auth("ADMIN"), createTask);

router.put("/updateTaskStatus/:taskId", auth("ADMIN"), updateTaskStatus);

router.put("/updateSelectBid/:taskId/:bidId", auth("ADMIN"), updateSelectBid);

router.post("/updateActivateTask/:taskId", auth("ADMIN"), updateActivateTask);

router.put("/updateTask/:taskId", auth("ADMIN"), updateTask);

router.delete("/disassociateClient/:email", auth("ADMIN"), disassociateClient);

router.delete(
  "/disassociateCompany/:email",
  auth("ADMIN"),
  disassociateCompany
);

router.put("/unassignTask/:taskId", auth("ADMIN"), unassignTask);

router.post("/email/:action", postSendEmail);

router.delete("/deleteUser/:email", auth("ADMIN"), deleteUser);

// router.post("/createTask", auth("CLIENT"), createTask);

// router.delete("/deleteTask/:taskId", auth("CLIENT"), deleteTask);

module.exports = router;
