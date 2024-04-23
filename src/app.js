import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(
  cors({
    origin: "https://pmsfrontend-563q.onrender.com",
    Credential: true,
    methods: "GET,POST,PUT,DELETE", // Allowed HTTP methods
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes import
import userRouter from "../src/routes/user.route.js";
import companyRouter from "./routes/company.route.js";
import jobRouter from "./routes/job.route.js";
import feedbackRouter from "./routes/feedback.route.js";

// Secured routes
app.use("/api/v1/users", userRouter);
app.use("/api/v2/companies", companyRouter);
app.use("/api/v3/companies/job", jobRouter);
app.use("/api/v4/feedback", feedbackRouter);
export { app };
