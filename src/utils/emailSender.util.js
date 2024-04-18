import nodemailer from "nodemailer";
import { Job } from "../models/job.model.js";
import { getAllStudentEmails } from "./studentsEmail.util.js";
import { ApiError } from "./ApiError.util.js";
import { getFormattedDate, manipulateDate } from "./getCurrentDate.util.js";

const sendMail = async (subject, content, email) => {
  const authEmail = process.env.EMAIL_ADDRESS;
  const authPass = process.env.EMAIL_PASS;
  const emails = email;

  const formattedSubject = subject.replace(/\\n/g, " ").trim();

  const formattedContent = `
    <html>
      <head>
        <title>${formattedSubject}</title>
      </head>
      <body>
        <p>${content}</p>
      </body>
    </html>
  `;

  const options = {
    from: authEmail,
    to: emails,
    subject: formattedSubject,
    html: formattedContent,
  };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: authEmail,
      pass: authPass,
    },
  });
  const info = await transporter.sendMail(options);

  return info;
};

const task = async () => {
  const currentDate = getFormattedDate().manipulateDate(currentDate, 1);
  try {
    const jobs = await Job.find({
      lastDate: currentDate     
    }).populate("company");
    const emails = await getAllStudentEmails();
    console.log(emails);
    const subject = `Job Application Remainder`;
    if (jobs.length) {
      jobs.forEach(async (job) => {
        const content = `Reminder: The last date to apply for ${job.designation} in ${job.company.name} is ${job.lastDate}.<br>Hurry up and apply Now.`;
        const mailResponse = await sendMail(subject, content, emails);
        if (mailResponse.success ===false) {
          throw new ApiError(400, "Email not sent ");
        }
      });
    } else {
      throw new ApiError(404, "No job available");
    }
  } catch (error) {
    console.error(
      "Error occurred while scheduling email notifications:",
      error
    );
  }
};

export { sendMail, task };
