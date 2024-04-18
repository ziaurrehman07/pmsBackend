import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { asyncHandler } from "../utils/asnycHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.util.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/emailSender.util.js";
import { Notice } from "../models/notification.model.js";
import { getFormattedDate } from "../utils/getCurrentDate.util.js";
import { Otps } from "../models/emailOtp.model.js";
import { Feedback } from "../models/feedback.model.js";
import csv from "fast-csv"
import fs from "fs"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.accessToken = accessToken;
    user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const otpGenerator = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const registerStudent = asyncHandler(async (req, res) => {
  const { fullName, email, password, enrollment } = req.body;

  if (
    [fullName, email, password, enrollment].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ enrollment }, { email }],
  });
  if (existedUser) {
    throw new ApiError(
      400,
      "Student with email or enrollment is already exist"
    );
  }

  const user = await User.create({
    fullName: fullName,
    password: password,
    email: email,
    enrollment: enrollment,
    isPlaced: false,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  const subject = `Registered to IPS Academy PMS`;
  const content = `You have been registered to the college PMS(Placement Management System)<br> Email: ${email}<br>Password:${password}`;

  const mailResponse = await sendMail(subject, content, email);

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User register successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, "Email field must be filled");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid email");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid Password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  user.accessToken = accessToken;
  user.refreshToken = refreshToken;
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken "
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken },
        "Logged in Successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized Access");
  }
  const decodedRefreshToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET_KEY
  );
  const user = await User.findById(decodedRefreshToken?._id);
  if (!user) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh Token is expired");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {}, "New  access token generated successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const verifyPassword = await user.isPasswordCorrect(oldPassword);
  if (!verifyPassword) {
    throw new ApiError(400, "Invalid Password");
  }

  user.password = newPassword;
  user.save({
    validateBeforeSave: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched Successfully"));
});

const updateStudentAccountDetails = asyncHandler(async (req, res) => {
  const {
    fullName,
    mobile,
    email,
    branch,
    result_10,
    result_12,
    address,
    college_cgpa,
    dob,
  } = req.body;
  if (email && email !== req.user.email) {
    const isUserAvailable = await User.findOne({ email: email });
    if (isUserAvailable) {
      throw new ApiError(400, "Email already exist enter another one");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
        branch,
        mobile,
        college_cgpa,
        result_10,
        result_12,
        address,
        dob,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"));
});

const updateStudentDetailsByAdmin = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await User.findById(studentId);
  const {
    fullName,
    mobile,
    email,
    branch,
    result_10,
    result_12,
    address,
    college_cgpa,
    dob,
    enrollment,
  } = req.body;

  if (
    (email && email !== student.email) ||
    (enrollment && enrollment !== student.enrollment)
  ) {
    const isUserAvailable = await User.findOne({
      $or: [{ enrollment }, { email }],
    });
    if (isUserAvailable) {
      throw new ApiError(
        400,
        "Email or Enrollment already exist enter another one"
      );
    }
  }
  const user = await User.findByIdAndUpdate(
    studentId,
    {
      $set: {
        fullName,
        email,
        branch,
        mobile,
        college_cgpa,
        result_10,
        result_12,
        address,
        dob,
        enrollment,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  const folder = "avatar";
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(
    avatarLocalPath,
    req.user._id,
    folder
  );
  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary");
  }

  const oldAvatarUrl = req.user.avatar;
  if (oldAvatarUrl) {
    await deleteFromCloudinary(oldAvatarUrl, folder);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateStudentResume = asyncHandler(async (req, res) => {
  const resumeLocalPath = req.file?.path;
  const folder = "resume";
  if (!resumeLocalPath) {
    throw new ApiError(400, "Resume file is missing");
  }

  const resume = await uploadOnCloudinary(
    resumeLocalPath,
    req.user._id,
    folder
  );
  if (!resume.url) {
    throw new ApiError(400, "Error while uploading resume on cloudinary");
  }

  const oldResumeUrl = req.user.resume;
  if (oldResumeUrl) {
    await deleteFromCloudinary(oldResumeUrl, folder);
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        resume: resume.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Resume updated successfully"));
});

const previewAvatar = asyncHandler(async (req, res) => {
  const avatarUrl = req.user.avatar;
  if (!avatarUrl) {
    throw new ApiError(400, "Avatar not found");
  }

  return res
    .status(200)
    .redirect(avatarUrl)
    .json(200, avatarUrl, "Resume fetched Successfully");
});

const previewResume = asyncHandler(async (req, res) => {
  const resumeUrl = req.user.resume;
  if (!resumeUrl) {
    throw new ApiError(400, "Resume not found");
  }

  return res
    .status(200)
    .redirect(resumeUrl)
    .json(200, resumeUrl, "Resume fetched Successfully");
});

const downloadResume = asyncHandler(async (req, res) => {
  //  TODO: write this function
  const resumeUrl = req.user.resume;
  if (!resumeUrl) {
    throw new ApiError(401, "No Resume Found");
  }
  return res.redirect(resumeUrl);
});

const placedStudentsListByAdmin = asyncHandler(async (req, res) => {
  const students = await User.find(
    {
      isPlaced: true,
    },
    {
      fullName: 1,
      avatar: 1,
      enrollment: 1,
    }
  ).select("-password -refreshToken");

  if (!students.length) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No Students Placed Yet!"));
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, students, "Placed student list fetched successfully")
    );
});

const placedStudentsListByCompany = asyncHandler(async (req, res) => {
  const students = await Company.aggregate([
    { $match: { _id: req.company?._id } },
    { $unwind: "$selectedStudents" },
    {
      $lookup: {
        from: "users",
        localField: "selectedStudents",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $match: { "user.isPlaced": true } },
    {
      $project: {
        _id: "$user._id",
        fullName: "$user.fullName",
        avatar: "$user.avatar",
        enrollment: "$user.enrollment",
      },
    },
  ]);

  if (!students.length) {
    throw new ApiError(400, "No Placed Student Found!");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        students,
        "Places Student list fetched successfully!"
      )
    );
});

const placedStudentsDetailsById = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  if (!studentId) {
    throw new ApiError(404, "Student id is required!");
  }

  const student = await User.findById(studentId)
    .populate({
      path: "designation",
      select: "company salaryPackage designation",
      populate: {
        path: "company",
        select: "name",
      },
    })
    .select("-password -refreshToken");

  if (!student) {
    throw new ApiError(404, "Student Not Found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        student,
        "Placed students details fetched successfully"
      )
    );
});

const deleteStudent = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params;
    const folder1 = "avatar";
    const folder2 = "resume";
    const student = await User.findByIdAndDelete(studentId);
    if (!student) {
      throw new ApiError(404, "Student doesn't exist ");
    }
    if (student.isPlaced) {
      const jobId = student.designation;
      const job = await Job.findById(jobId);
      if (!job) {
        throw new ApiError(404, "Job does not exists");
      }
      const companyId = job.company;
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          $pull: { selectedStudents: studentId },
        },
        {
          new: true,
        }
      ).select("-password -refreshToken");
    }
    if (student.avatar) {
      const response = await deleteFromCloudinary(student.avatar, folder1);
    }
    if (student.resume) {
      const response = await deleteFromCloudinary(student.resume, folder2);
    }

    const feedback = await Feedback.deleteMany({owner:student._id})

    return res
      .status(200)
      .json(new ApiResponse(200, student, "Student deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting student");
  }
});

const deleteCompany = asyncHandler(async (req, res) => {
  try {
    const { companyId } = req.params;
    const folder = "avatar";
    const company = await Company.findByIdAndDelete(companyId);
    if (!company) {
      throw new ApiError(404, "Company doesn't exist!");
    }
    const selectedStudents = company.selectedStudents;
    if (selectedStudents) {
      await Promise.all(
        selectedStudents.map(async (studentId) => {
          await User.findByIdAndUpdate(studentId, {
            designation: null,
          });
        })
      );
    }
    const jobs = company.jobs;
    if (jobs) {
      await Promise.all(
        jobs.map(async (jobId) => {
          await Job.findByIdAndDelete(jobId);
        })
      );
    }
    if (company.avatar) {
      const response = await deleteFromCloudinary(company.avatar, folder);
    }
    const feedback = await Feedback.deleteMany({companyOwner:company._id})

    return res
      .status(200)
      .json(new ApiResponse(200, company, "Student deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting company");
  }
});

const getAllStudents = asyncHandler(async (req, res) => {
  const students = await User.find(
    { role: "student" },
    { fullName: 1, _id: 1, avatar: 1, branch: 1 }
  ).sort({ fullName: 1 });
  if (!students) {
    throw new ApiError(400, "Student details is not available");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, students, "Students details fetched successfully")
    );
});

const getStudentDetails = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  if (!studentId) {
    throw new ApiError(400, "Student id is required!");
  }

  const student = await User.findById(studentId)
    .populate({
      path: "designation",
      select: "company salaryPackage designation",
      populate: {
        path: "company",
        select: "name",
      },
    })
    .select("-password -refreshToken");
  if (!student) {
    throw new ApiError(404, "Student not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, student, "Student Details Fetched Successfully")
    );
});

const publishNewNotice = asyncHandler(async (req, res) => {
  const { message, title } = req.body;
  if (!message || !title) {
    throw new ApiError(400, "Title and Message is required!");
  }

  const notice = await Notice.create({
    message: message,
    title: title,
  });

  if (!notice) {
    throw new ApiError(500, "Error while creating the notice ");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { notice }, "Notice created successfully"));
});

const getAllNotice = asyncHandler(async (req, res) => {
  const notices = await Notice.find({}).sort({ createdAt: -1 });
  if (!notices.length) {
    return res.status(404).json(new ApiResponse(404, {}, "No Notices Found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notices, "All notices fetched successfully"));
});

const deleteNoticeByAdmin = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;
  if (!noticeId) {
    throw new ApiError(404, "Notice id is required!");
  }
  await Notice.findByIdAndDelete(noticeId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Notice deleted Successfully!"));
});

const activeJobCount = asyncHandler(async (req, res) => {
  const currentDate = getFormattedDate();
  const jobs = await Job.find(
    {
      lastDate: {
        $gte: currentDate,
      },
    },
    {
      _id: 1,
    }
  );

  const jobCount = jobs.length;

  if (!jobCount) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No Active Jobs found!"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, jobCount, "Active Job count fetced successfully!")
    );
});

const generateOtpForVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const existedUser = await User.findOne({ email: email });
  if (existedUser) {
    throw new ApiError(400, "Email is already registered. Try differrent One!");
  }
  const generatedOtp = otpGenerator();
  const emailOtp = await Otps.findOne({ email: email });
  let otp;
  if (emailOtp) {
    otp = await Otps.findByIdAndUpdate(
      emailOtp,
      {
        otp: generatedOtp,
      },
      {
        new: true,
      }
    );
  } else {
    otp = await Otps.create({
      email: email,
      otp: generatedOtp,
    });
  }

  if (!otp) {
    throw new ApiError(
      400,
      "Something went wrong while generating OTP! Please try again later."
    );
  }
  const subject = `Email Verification`;
  const content = `Your OTP for email  verification : ${generatedOtp} `;
  const mailResponse = await sendMail(subject, content, email);
  if (mailResponse.success == false) {
    throw new ApiError(503, "Failed to Send Email");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP generated and sent successfully!"));
});

const verifyOtpForEmail = asyncHandler(async (req, res) => {
  const { otpNumber } = req.body;
  const { email } = req.body;
  const emailOtp = await Otps.findOne({ email: email });
  if (!emailOtp) {
    throw new ApiError(404, "Email not found!");
  }
  if (otpNumber !== emailOtp.otp) {
    console.log(otpNumber + " " +emailOtp.otp+" "+ email);
    throw new ApiError(401, "Invalid OTP!");
  }

  await Otps.findByIdAndDelete(emailOtp._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP verified Successfully!"));
});

const downloadPlacedStudentsCSV = asyncHandler(async (req, res) => {
  try {
    const usersdata = await User.find({isPlaced:true})
    .select("-password -refreshToken")
    .populate({
      path:"designation",
      select:"company salaryPackage designation",
      populate:{
        path:"company",
        select:"name"
      }
    })
    if (usersdata.length === 0) {
      throw new ApiError(404, "No students found for this job");
    }

    const csvStream = csv.format({ headers: true });

    if (!fs.existsSync("../public/files/export/")) {
      if (!fs.existsSync("../public/files")) {
        fs.mkdirSync("../public/files/");
      }
      if (!fs.existsSync("../public/files/export")) {
        fs.mkdirSync("../public/files/export/");
      }
    }

    const writablestream = fs.createWriteStream(
      "../public/files/export/placedStudents.csv"
    );

    csvStream.pipe(writablestream);

    usersdata.forEach((user) => {
      csvStream.write({
        "Full Name": user.fullName || "-",
        "Branch": user.branch || "-",
        Enrollment: user.enrollment || "-",
        Email: user.email || "-",
        "Mobile No.": user.mobile || "-",
        "10th Result": user.result_10 || "-",
        "12th Result": user.result_12 || "-",
        "UG Result": user.college_cgpa || "-",
        "Package (in LPA)": user.designation.salaryPackage || "-",
        "Designation": user.designation.designation || "-",
        "Company": user.designation.company.name || "-",
        Address: user.address || "-",
      });
    });

    csvStream.end();

    writablestream.on("finish", function () {
      console.log("Successfully converted into CSV file!");
      res
        .status(200)
        .setHeader("Content-disposition", "attachment; filename=placedStudents.csv")
        .set("Content-Type", "text/csv")
        .send(fs.readFileSync("../public/files/export/placedStudents.csv"));
    });
  } catch (error) {
    console.error(error);
    res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, {}, error.message));
  }
});

export {
  registerStudent,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateStudentAccountDetails,
  updateUserAvatar,
  updateStudentResume,
  previewResume,
  previewAvatar,
  downloadResume,
  placedStudentsListByAdmin,
  placedStudentsListByCompany,
  placedStudentsDetailsById,
  deleteStudent,
  deleteCompany,
  getAllStudents,
  getStudentDetails,
  updateStudentDetailsByAdmin,
  publishNewNotice,
  getAllNotice,
  deleteNoticeByAdmin,
  activeJobCount,
  generateOtpForVerification,
  verifyOtpForEmail,
  downloadPlacedStudentsCSV
};
