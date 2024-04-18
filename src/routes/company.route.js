import {Router} from "express"
import { changeCompanyCurrentPassword, downloadAppliedStudentsCSV, downloadCompanyPlacedStudentCSV, getAllCompanyDetails, getApplyStudentList, getCompanyDetails, getCurrentCompanyDetails, hireStudent, loginCompany, logOutCompany,registerCompany, unHiredAllStudent, unPlacedStudentByCompany, updateCompanyAvatar, updateCompanyDetails, updateCompanyDetailsByAmin } from "../controllers/company.controller.js"
import { verifyJwtForCompany,verifyAdmin, verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"


const router = Router()

router.route("/register-company").post(verifyAdmin,registerCompany)
router.route("/login-company").post(loginCompany)
router.route("/log-out-company").get(verifyJwtForCompany,logOutCompany)
router.route("/update-company-details").patch(verifyJwtForCompany,updateCompanyDetails)
router.route("/get-current-company-details").get(verifyJwtForCompany,getCurrentCompanyDetails)
router.route("/update-company-avatar").patch(verifyJwtForCompany,upload.single("avatar"),updateCompanyAvatar)
router.route("/get-applied-students-list/:jobId").get(verifyJwtForCompany,getApplyStudentList)
router.route("/hire-student/:studentId/:jobId").get(verifyJwtForCompany,hireStudent)
router.route("/unhire-student/:studentId").get(verifyJwtForCompany,unPlacedStudentByCompany)
router.route("/unhire-all-student/:jobId").get(verifyJwtForCompany,unHiredAllStudent)
router.route("/change-company-password").patch(verifyJwtForCompany,changeCompanyCurrentPassword)
router.route("/applied-student-list-download/:jobId").get(verifyJwtForCompany,downloadAppliedStudentsCSV)
router.route("/hired-student-list-download").get(verifyJwtForCompany,downloadCompanyPlacedStudentCSV)

// Admin Routes for company
router.route("/update-company-details/:companyId").patch(verifyAdmin,updateCompanyDetailsByAmin)

// Admin and Student Routes for company
router.route("/get-company-details/:companyId").get(verifyJWT,getCompanyDetails)
router.route("/get-all-companies-list").get(verifyJWT,getAllCompanyDetails)

export default router;
