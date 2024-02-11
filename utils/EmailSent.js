import nodemailer from "nodemailer";
export const emailSent = (email, output,subject) => {
    return new Promise((resolve, reject) => {
      var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // use SSL
        service: "gmail",
        auth: {
          user: "rafaymuhammad245@gmail.com",
          pass: "aaoyncwfwgxueayr",
        },
      });
      var mailOptions = {
        from: "rafaymuhammad245@gmail.com",
        to: email,
        subject: subject,
        html: output,
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          console.log("Email sent: " + info.response);
          resolve(true);
        }
      });
    });
  };