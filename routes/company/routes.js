const { Router } = require("express");
const router = Router();
const { auth } = require("../../middlewares/auth");
const {
  getTasks,
  getTaskById,
  createBid,
  markInProgress,
  postAcceptOrRejectTask,
  getTaskAcceptances,
} = require("../../controllers/company");

router.get("/getTasks", auth("COMPANY"), getTasks);

router.get("/getTask/:taskId", auth("COMPANY"), getTaskById);

router.post("/createBid/:taskId", auth("COMPANY"), createBid);

router.put("/updateTaskStatus/:taskId", auth("COMPANY"), markInProgress);

router.put(
  "/acceptOrRejectTask/:taskId",
  auth("COMPANY"),
  postAcceptOrRejectTask
);

router.get("/getRecentTaskAcceptances", auth("COMPANY"), getTaskAcceptances);

module.exports = router;
