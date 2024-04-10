import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
  message:{
    type:String,
    required:true
  },
  title:{
    type:String,
    required:true
  }
},{timestamps:true})

export const Notice = mongoose.model("Notice",noticeSchema) 