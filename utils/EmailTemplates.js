export const forgetPasswordTemplate = (otpCode) => {
  return`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Green Masterclass - OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            color: #fff;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h2 {
            color: #FF9800;
            margin-bottom: 20px;
        }

        p {
            margin-bottom: 10px;
        }

        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color:  #FF9800;
        }


        .footer {
            margin-top: 30px;
            text-align: center;
            color: #333;
        }
    </style>
</head>
<body>
<div class="container">
    <h2>CRM Inventory - OTP Verification</h2>
    <p>Hello,</p>
    <p>We have sent you a one-time password (OTP) for verification. Please use the OTP code below:</p>
    <p class="otp-code">${otpCode}</p>
    <p>If you did not request this OTP, please ignore this email.</p>
    <p class="footer">Thank you for choosing CRM Inventory!</p>
</div>
</body>
</html>

      `;
};
