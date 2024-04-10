import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  owner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  companyOwner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Company"
  },
  content:{
    type:String,
    required:true
  }
},{timestamps:true})

export const Feedback = mongoose.model("Feedback",feedbackSchema)