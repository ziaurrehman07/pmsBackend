import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asnycHandler.util.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.util.js"
import { Company } from "../models/company.model.js"

 const verifyJWT = asyncHandler(async(req,_,next)=>{
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
  
    if(!token){
      throw new ApiError(400,"Unauthorized request")
    }
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET_KEY)
  
    const user = await User.findById(decodedToken?._id)
    .populate({
      path: "designation",
      select: "company salaryPackage designation",
      populate: {
        path: "company",
        select: "name",
      },
    })
    .select("-password -refreshToken")
  
    if(!user){
      throw new ApiError(400, 'Invalid access token')
    }
  
    req.user=user
    next()
    
  } catch (error) {
    throw new ApiError(400,error?.message || "Something went wrong!")
  }
})

 const verifyJwtForCompany = asyncHandler(async(req,_,next)=>{
 try {
   const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
   if(!token){
    throw new ApiError(400,"Unauthorized request")
  }
   const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET_KEY)
 
   const company = await Company.findById(decodedToken?._id).select("-password -refreshToken")
   if(!company){
     throw new ApiError(400,"Invalid access token")
   }
 
   req.company = company
   next()
 } catch (error) {
    throw new ApiError(400,error?.message || "Something went wrong!")
 }
})

 const verifyAdmin = asyncHandler(async(req,_,next)=>{
  try {
    const token = req.cookies?.accessToken || req.header('authorization')?.replace('Bearer ', '')
    if(!token){
      throw new ApiError(400,"Unautherized request")
    }
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET_KEY)
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    if(!user){
      throw new ApiError(400,"Invalid access token")
    }
    if(user.role !=="admin"){
      throw new ApiError(403,"You are not an admin")
    }
    req.user = user;
    next()
    
  } catch (error) {
    throw new ApiError(400,error?.message || "Something went wrong!")
  }

})

export{
  verifyAdmin,
  verifyJWT,
  verifyJwtForCompany
}