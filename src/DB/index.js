import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      "mongodb+srv://ziaurrehman939:oT5Lx0AWHmX0RO2u@cluster0.u8nw0he.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log(
      `MongoDB connected successfully! DB Host :${connectionInstance.connection.host} `
    );
  } catch (error) {
    console.log("MongoDb connection failed :", error);
    process.exit(1);
  }
};

export default connectDB;
