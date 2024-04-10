import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { Job } from "../models/job.model.js";
import { asyncHandler } from "../utils/asnycHandler.util.js";
import { Company } from "../models/company.model.js";
import { sendMail } from "../utils/emailSender.util.js";
import { getFormattedDate } from "../utils/getCurrentDate.util.js";
import { getAllStudentEmails } from "../utils/studentsEmail.util.js";

const newJobProfile = asyncHandler(async (req, res) => {
  const {
    designation,
    description,
    salaryPackage,
    criteria_10,
    criteria_12,
    criteria_cllg_cgpa,
    lastDate,
  } = req.body;

  const job = await Job.create({
    designation,
    description,
    salaryPackage,
    criteria_10,
    criteria_12,
    criteria_cllg_cgpa,
    lastDate,
    company: req.company._id,
  });
  const company = await Company.findByIdAndUpdate(
    req.company._id,
    {
      $push: {
        jobs: job._id,
      },
    },
    {
      new: true,
    }
  );
  if (!job) {
    throw new ApiError(400, "Something went wrong while creating job profile");
  }
  const email = await getAllStudentEmails();
  const subject = `Job alert`;
  const content = `New Job profile is added for ${job.designation} in ${req.company?.name} .`;
  const mailResponse = await sendMail(subject, content, email);

  return res
    .status(200)
    .json(new ApiResponse(200, job, "New Job Profile Created Successfully"));
});

const deleteJobProfile = asyncHandler(async (req, res) => {
  const jobId = req.params._id;
  if (!jobId) {
    throw new ApiError(400, "Job id is required");
  }
  const job = await Job.findByIdAndDelete(jobId);

  return res
    .status(200)
    .json(new ApiResponse(200, job, "Job Profile is deleted successfully"));
});

const getCurrentJobProfile = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, job, "Current job profile fetched successfully")
    );
});

const getAllJobProfile = asyncHandler(async (req, res) => {
  const jobs = await Job.find({})
    .sort({ createdAt: -1 })
    .select("_id company designation salaryPackage createdAt")
    .populate({
      path: "company",
      select: "name",
    });

  if (!jobs.length) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Job Profiles not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Job Profiles fetched successfully"));
});

const getJobDetailsById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    throw new ApiError(404, "Job id is required !");
  }

  const job = await Job.findById(jobId).populate({
    path: "company",
    select: "name address website avatar",
  });

  if (!job) {
    throw new ApiError(404, "Job profile doesn't exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, job, "Job Details fetched Successfully!"));
});

const updateJobProfile = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const {
    designation,
    description,
    salaryPackage,
    criteria_10,
    criteria_12,
    criteria_cllg_cgpa,
    lastDate,
  } = req.body;

  const job = await Job.findOne({
    $and: [{ company: req.company._id }, { _id: jobId }],
  });

  const newJobProfile = await Job.findOneAndUpdate(
    job._id,
    {
      designation,
      description,
      salaryPackage,
      criteria_10,
      criteria_12,
      criteria_cllg_cgpa,
      lastDate,
    },
    {
      new: true,
    }
  );

  if (!newJobProfile) {
    throw new ApiError(400, "Something went wrong while updating profile");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newJobProfile, "Profile updated successfully"));
});

const applyForJob = asyncHandler(async (req, res) => {
  const student = req.user;
  const { jobId } = req.params;
  const currentDate = getFormattedDate();
  const isJobAvailable = await Job.findById(jobId);
  if (!isJobAvailable) {
    throw new ApiError(400, "Job profile is not available");
  }
  const existingApplication = await Job.findOne({
    $and: [{ _id: jobId }, { students: { $in: [student._id] } }],
  });

  if (existingApplication) {
    throw new ApiError(400, "You have already applied in this company");
  }

  if (
    !(
      student.result_10 >= isJobAvailable.criteria_10 &&
      student.result_12 >= isJobAvailable.criteria_12 &&
      student.college_cgpa >= isJobAvailable.criteria_cllg_cgpa &&
      student.resume !== "" &&
      currentDate <= isJobAvailable.lastDate &&
      student.isPlaced === false
    )
  ) {
    throw new ApiError(400, "You are not eligible for this job profile");
  }
  const job = await Job.findByIdAndUpdate(
    isJobAvailable._id,
    {
      $push: {
        students: student._id,
      },
    },
    {
      new: true,
    }
  );
  if (!job) {
    throw new ApiError(400, "Something went wrong while appling for job");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, job, "Successfully applied for the job "));
});

const appliedJobsIdByStudent = asyncHandler(async (req, res) => {
  const jobs = await Job.find({
    students: {
      $in:req.user?._id,
    }
  },{
    _id:1
  })
  if (!jobs.length) {
    return res.status(404).json(new ApiResponse(404,{},"Not applied for any jobs yet!"));
  }
  const jobIds = jobs.map(job => job._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        jobIds,
        "Applied jobs list by a Student fetched successfully!"
      )
    );
});

const getCompanyAllJobs = asyncHandler(async (req, res) => {
  const companyId = req.company?._id;
  if (!companyId) {
    throw new ApiError(404, "Unauthorized access");
  }

  const jobs = await Job.find({ company: companyId }).select(
    "designation lastDate"
  );

  if (!jobs.length) {
    return res.status(404).json(new ApiResponse(404, {}, "No Jobs found!"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Jobs fetched successfully!"));
});

const getCompanyJobDetailsById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    throw new ApiError(404, "Job id is required!");
  }

  const job = await Job.findById(jobId).populate({
    path: "students",
    select: "fullName enrollment",
  });
  if (!job) {
    throw new ApiError(404, "Job not found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, job, "Job details fetched successfully!"));
});

export {
  newJobProfile,
  deleteJobProfile,
  getAllJobProfile,
  updateJobProfile,
  applyForJob,
  appliedJobsIdByStudent,
  getCurrentJobProfile,
  getJobDetailsById,
  getCompanyAllJobs,
  getCompanyJobDetailsById,
};
