import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.util.js";
import { URL } from "url";

// // cloudinary.config({
// //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// //   api_key: process.env.CLOUDINARY_API_KEY,
// //   api_secret: process.env.CLOUDINARY_API_SECRET,
// // });

cloudinary.config({
  cloud_name: "di4334qw4",
  api_key: "255264663687758",
  api_secret: "RQNxuGEtMoH94bkE6L9wytdnHaA",
});

const uploadOnCloudinary = async (localPath, id, folder) => {
  try {
    if (!localPath) {
      return null;
    }
    const currentDateTime = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/[TZ.]/g, "")
      .slice(0, -3);
    const response = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
      folder: `${folder}`,
      public_id: `${id}_${folder}_${currentDateTime}`,
    });
    fs.unlinkSync(localPath);
    return response;
  } catch (error) {
    fs.unlinkSync(localPath);
    throw new ApiError(
      400,
      error.message || `something went wrong while uploading ${folder}`
    );
  }
};

const deleteFromCloudinary = async (url, folder) => {
  try {
    const parsedUrl = new URL(url);
    const pathnameParts = parsedUrl.pathname.split("/");
    const publicId = pathnameParts[pathnameParts.length - 1].split(".")[0];
    const response = await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    return response;
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || `Failed to delete ${folder} file from cloudinary `
    );
  }
};

export { uploadOnCloudinary, deleteFromCloudinary};

// import { google } from 'googleapis';
// import fs from 'fs';
// import credentials from "D:/pms/backend/google_drive_credential.json"

// const drive = google.drive({
//   version: 'v3',
//   auth: credentials // You need to replace this with your actual authentication credentials
// });

// const uploadOnGoogleDrive = async (localPath, username, folder) => {
//   try {
//     if (!localPath) {
//       return null;
//     }

//     const fileMetadata = {
//       name: `${username}_${folder}_${new Date().toISOString().replace(/[-:]/g, '').replace(/[TZ.]/g, '').slice(0, -3)}`,
//       parents: [folder] // Specify the folder ID where you want to upload the file
//     };

//     const media = {
//       mimeType: 'image/jpeg', // Update this with the appropriate MIME type of the file you are uploading
//       body: fs.createReadStream(localPath)
//     };

//     const response = await drive.files.create({
//       resource: fileMetadata,
//       media: media,
//       fields: 'id'
//     });

//     fs.unlinkSync(localPath);

//     return response.data;
//   } catch (error) {
//     fs.unlinkSync(localPath);
//     throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
//   }
// };

// const deleteFromGoogleDrive = async (url) => {
//   try {
//       const url = new URL(url);
//       const params = new URLSearchParams(url.search);
//       const response = await drive.files.delete({
//       fileId: params.get('id')
//     });
//     return response.data;
//   } catch (error) {
//     throw new Error(`Failed to delete file from Google Drive: ${error.message}`);
//   }
// };

// export { uploadOnGoogleDrive, deleteFromGoogleDrive };
