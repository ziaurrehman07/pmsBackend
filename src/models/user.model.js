import bcrypt,{ hash } from "bcrypt";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
  fullName:{
    type:String,
    required:true,
    trim:true
  },
  dob:{
    type:String,
  },
  enrollment:{
    type:String,
    unique: true,
    trim:true,
    lowerCase:true
  },
  email:{
    type:String,
    required:true,
    trim:true,
    unique:true
  },
  mobile:{
    type:Number
  },
  role:{
    type:String,
    enum:["admin","student","editor"],
    default:"student"
  },
  password:{
    type:String,
    required:true,
  },
  avatar:{
    type:String
  },
  refreshToken:{
    type:String
  },
  branch:{
    type:String,
    enum:["CSE","CSIT","IOT"]
  },
  result_10:{
    type:Number
  },
  result_12:{
    type:Number
  },
  college_cgpa:{
    type:Number
  },
  resume:{
    type:String
  },
  isPlaced:{
    type:Boolean
  },
  address:{
    type:String
  },
  designation:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Job"
  }

},{timestamps:true})

userSchema.pre("save",async function (next){
  if(this.isModified("password")){
    this.password = await hash(this.password,11)
  }
  next()
})

userSchema.methods.isPasswordCorrect = async function(password){
  return bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function (){
  return jwt.sign(
    {
      _id:this._id,
      fullName:this.fullName,
      email:this.email,
      role:this.role
    },
    process.env.ACCESS_TOKEN_SECRET_KEY,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken = function (){
  return jwt.sign(
    {
      _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET_KEY,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = mongoose.model( 'User', userSchema )