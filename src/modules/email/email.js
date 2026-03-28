const nodemailer = require("nodemailer");
const { config } = require("../../config/config.js");


// ENV CONFIG 
const EMAILUSERNAME = config.EMAIL_USERNAME;
const EMAILPASSWORD = config.EMAIL_PASSWORD;
console.log("Email Values: ", EMAILUSERNAME, /*EMAILPASSWORD*/)

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAILUSERNAME,
        pass: EMAILPASSWORD,
    },
});

// Verify transporter config
transporter.verify((error) => {
    if (error) {
        console.error('Transporter error:', error);
    } else {
        console.log('Transporter is ready to send emails');
    }
});


// Email templates
const EMAIL_TEMPLATES = {
    VERIFICATION: {
        subject: "Verify Your Account",
        title: "Welcome aboard!",
        body: "Use the OTP below to verify your account:"
    },
    PASSWORD_RESET: {
        subject: "Reset Your Password",
        title: "Password Reset Request",
        body: "We received a request to reset your password. Use the code below:"
    },
    RESEND_OTP: {
        subject: "Your New OTP Code",
        title: "New OTP Requested",
        body: "Here is your new verification code:"
    }
};


// Function to send an email
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        await transporter.sendMail({
            from: EMAILUSERNAME,
            to,
            subject,
            text,
            html,
        });
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        return false;
    }
};


// Function to generate HTML OTP email template
const generateOTPTemplate = (otp, username, type) => {
    const template = EMAIL_TEMPLATES[type] || EMAIL_TEMPLATES.VERIFICATION;
    return `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #333;">${template.title}${username ? ', ' + username : ''}!</h2>
                <p>${template.body}</p>
                <h1 style="background: #f2f2f2; padding: 10px 20px; width: fit-content; border-radius: 5px;">${otp}</h1>
                <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                <br/>
                <p>Thanks,<br/>Your Team</p>
        </div>
    `;
};


/**
 * Universal OTP Email Sender
 * @param {string} email - Recipient
 * @param {string} username - Name
 * @param {string} type - 'VERIFICATION', 'PASSWORD_RESET', or 'RESEND_OTP'
 */


// Main function to send OTP email
const sendOTPEmail = async (email, username, type, otp) => {
    if (!otp){
        throw new Error("OTP is required to send email")
    }
    const template = EMAIL_TEMPLATES[type] || EMAIL_TEMPLATES.VERIFICATION;
    const html = generateOTPTemplate(otp, username, type);

    const success = await sendEmail({
        to: email,
        subject: template.subject,
        html,
    });

    return { success};
};

module.exports = { sendOTPEmail };