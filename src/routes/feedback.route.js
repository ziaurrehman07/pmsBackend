import { Router } from "express";
import { verifyJWT, verifyAdmin, verifyJwtForCompany } from "../middlewares/auth.middleware.js";
import { deleteAllFeedbacks, getAllFeedbacks, newFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.route("/write-new-student-feedback").post(verifyJWT, newFeedback);
router.route("/write-new-company-feedback").post(verifyJwtForCompany, newFeedback);
router.route("/get-all-feedbacks").get(verifyAdmin, getAllFeedbacks);
router.route("/delete-all-feedbacks").delete(verifyAdmin, deleteAllFeedbacks);

export default router;
