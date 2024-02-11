import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//  export  const handle_delete_photo_from_folder=(imageFilename,folderName)=>{
//      if (imageFilename) {
//         const imagePath = path.join(__dirname, `../uploads/${folderName}`, imageFilename);
//         if (fs.existsSync(imagePath)) {
//           fs.unlinkSync(imagePath); 
//         }
//       }
//   }
export const handle_delete_photos_from_folder = (imageFilenames, folderName) => {
  if (Array.isArray(imageFilenames)) {
    imageFilenames.forEach((imageFilename) => {
      if (imageFilename) {
        const imagePath = path.join(__dirname, `../uploads/${folderName}`, imageFilename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted image: ${imageFilename}`);
        }
      }
    });
  }
};
