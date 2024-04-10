import { Feedback } from "../models/feedback.model.js";
import { asyncHandler } from "../utils/asnycHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";

const newFeedback = asyncHandler(async(req,res)=>{
  const {content} = req.body
  if(!content){
    throw new ApiError(400, 'Content field is required')
  }
  const feedback = await Feedback.create({
    content,
    owner:req.user?._id,
    companyOwner:req.company?._id
  })
  if(!feedback){
    throw new ApiError(400,"Something went wrong while submitting feedback")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,{},"Feedback sent successfully")
  )
})

const getAllFeedbacks = asyncHandler(async(req,res)=>{
  const feedbacks = await Feedback.find({})
  .sort({createdAt: -1})
  .populate({
    path: 'owner',
    select:"fullName enrollment avatar"
  })
  .populate({
    path:"companyOwner",
    select:"name avatar"
  })

  if(!feedbacks.length){
    return res 
    .status(404)
    .json(
      new ApiResponse(404,{},"No Feedback found!")
    )
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,feedbacks,"Feedbacks fetched successfully")
  )
})

const deleteAllFeedbacks = asyncHandler(async(req,res)=>{
  await Feedback.deleteMany({})

  return res
  .status(200)
  .json(
    new ApiResponse(200,{},"All feedbacks deleted successfully")
  )
})

export {
  newFeedback,
  getAllFeedbacks,
  deleteAllFeedbacks,
}