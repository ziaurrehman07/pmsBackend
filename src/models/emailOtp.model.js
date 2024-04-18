import mongoose from "mongoose"

const emailVerifyOtpSchema = mongoose.Schema({
  email:{
    type:String,
    required:true,
    unique:true
  },
  otp:{
    type:Number,
    required:true,
  }
},{
  timestamps:true
})

export const Otps = mongoose.model( 'Otps', emailVerifyOtpSchema );