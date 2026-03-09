const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or any other email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send OTP Email
const sendOTPEmail = async (email, name, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Sport Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🏆 Verify Your Sport Account - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
              margin: 0;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
              background: linear-gradient(135deg, #00e676 0%, #00aeef 100%);
              padding: 40px 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 800;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 20px;
              color: #263238;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .message {
              color: #546e7a;
              line-height: 1.6;
              margin-bottom: 30px;
              font-size: 16px;
            }
            .otp-box {
              background: linear-gradient(135deg, rgba(0, 230, 118, 0.1) 0%, rgba(0, 174, 239, 0.1) 100%);
              border: 2px solid #00e676;
              border-radius: 12px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              font-size: 14px;
              color: #546e7a;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 800;
              background: linear-gradient(135deg, #00e676 0%, #00aeef 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .expiry {
              font-size: 13px;
              color: #ff5252;
              font-weight: 600;
              margin-top: 10px;
            }
            .warning {
              background: #fff3e0;
              border-left: 4px solid #ffc107;
              padding: 15px;
              border-radius: 8px;
              color: #e65100;
              font-size: 14px;
              margin-top: 30px;
            }
            .footer {
              background: #f5f5f5;
              padding: 30px;
              text-align: center;
              color: #78909c;
              font-size: 14px;
            }
            .footer-icon {
              font-size: 40px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Sport Platform</h1>
            </div>
            <div class="content">
              <div class="greeting">Hello ${name}! 👋</div>
              <div class="message">
                Welcome to Sport Platform! We're excited to have you join our athletic community.
                To complete your registration and verify your account, please use the OTP code below:
              </div>
              
              <div class="otp-box">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="expiry">⏱️ Valid for 10 minutes</div>
              </div>
              
              <div class="message">
                Enter this code on the verification page to activate your account and start your journey with us.
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Our team will never ask for your OTP.
              </div>
            </div>
            <div class="footer">
              <div class="footer-icon">💪</div>
              <div>Sport Platform - Your Athletic Partner</div>
              <div style="margin-top: 10px; font-size: 12px;">
                This is an automated email. Please do not reply to this message.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent: ', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Send Welcome Email after verification
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Sport Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Welcome to Sport Platform!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
              margin: 0;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
              background: linear-gradient(135deg, #00e676 0%, #00aeef 100%);
              padding: 50px 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 800;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 24px;
              color: #263238;
              margin-bottom: 20px;
              font-weight: 700;
            }
            .message {
              color: #546e7a;
              line-height: 1.8;
              margin-bottom: 20px;
              font-size: 16px;
            }
            .footer {
              background: #f5f5f5;
              padding: 30px;
              text-align: center;
              color: #78909c;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Verified!</h1>
            </div>
            <div class="content">
              <div class="greeting">Congratulations ${name}! 🏆</div>
              <div class="message">
                Your account has been successfully verified and you're now part of the Sport Platform family!
              </div>
              <div class="message">
                Start exploring your dashboard, track your progress, and achieve your athletic goals with us.
              </div>
              <div class="message" style="margin-top: 30px;">
                <strong>Let's get started! 💪</strong>
              </div>
            </div>
            <div class="footer">
              <div>Sport Platform - Your Athletic Partner</div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// ── New Order Notification → Kitchen ──────────────────────────────────────────
const sendNewOrderToKitchen = async (kitchenEmail, kitchenName, order) => {
  try {
    const transporter = createTransporter();

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">×${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${(i.price * i.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join('');

    const seatInfo = order.deliveryLocation?.seatNumber
      ? `<p style="margin:0;color:#546e7a;">🪑 Seat <strong>${order.deliveryLocation.seatNumber}</strong>${order.deliveryLocation.section ? ` — ${order.deliveryLocation.section}` : ''}</p>`
      : '';

    const specialNote = order.specialInstructions
      ? `<div style="background:#fff3e0;border-left:4px solid #ffc107;padding:12px 16px;border-radius:6px;margin-top:12px;">
           <strong>📝 Special Instructions:</strong> ${order.specialInstructions}
         </div>`
      : '';

    const mailOptions = {
      from: `"5 Rings Kitchen" <${process.env.EMAIL_USER}>`,
      to: kitchenEmail,
      subject: `🍽️ New Order #${String(order._id).slice(-6).toUpperCase()} — Action Required`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:'Segoe UI',sans-serif;background:#f4f6f8;margin:0;padding:30px 20px;}
          .container{max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);}
          .header{background:linear-gradient(135deg,#ff6f00 0%,#ffa726 100%);padding:30px;text-align:center;color:#fff;}
          .header h1{margin:0;font-size:24px;font-weight:800;}
          .badge{display:inline-block;background:rgba(255,255,255,.25);border-radius:20px;padding:4px 14px;font-size:13px;margin-top:8px;}
          .content{padding:28px 30px;}
          table{width:100%;border-collapse:collapse;margin:16px 0;}
          th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:12px;color:#78909c;text-transform:uppercase;}
          .total-row td{padding:10px 12px;font-weight:800;font-size:16px;color:#263238;border-top:2px solid #eee;}
          .action-btn{display:block;margin:20px auto 0;background:linear-gradient(135deg,#ff6f00,#ffa726);color:#fff;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;text-align:center;}
          .footer{background:#f5f5f5;padding:20px;text-align:center;color:#90a4ae;font-size:12px;}
        </style></head><body>
          <div class="container">
            <div class="header">
              <h1>🍳 New Order Received!</h1>
              <div class="badge">Order #${String(order._id).slice(-6).toUpperCase()}</div>
            </div>
            <div class="content">
              <p style="color:#263238;font-size:16px;">Hello <strong>${kitchenName}</strong>,</p>
              <p style="color:#546e7a;">A new food order has been placed and is waiting for your confirmation.</p>
              ${seatInfo}
              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot><tr class="total-row"><td colspan="2">Total</td><td style="text-align:right;">₹${order.totalAmount.toFixed(2)}</td></tr></tfoot>
              </table>
              ${specialNote}
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="action-btn">
                Open Kitchen Dashboard →
              </a>
            </div>
            <div class="footer">5 Rings Platform · This is an automated notification</div>
          </div>
        </body></html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`New order email sent to kitchen: ${kitchenEmail}`);
  } catch (error) {
    console.error('Error sending new order email to kitchen:', error);
  }
};

// ── Order Confirmed Notification → User ───────────────────────────────────────
const sendOrderConfirmedToUser = async (userEmail, userName, order) => {
  try {
    const transporter = createTransporter();

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">×${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${(i.price * i.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join('');

    const seatInfo = order.deliveryLocation?.seatNumber
      ? `<p style="margin:8px 0 0;color:#546e7a;">🪑 Delivery to Seat <strong>${order.deliveryLocation.seatNumber}</strong></p>`
      : '';

    const mailOptions = {
      from: `"5 Rings Kitchen" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `✅ Your Order #${String(order._id).slice(-6).toUpperCase()} is Confirmed!`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:'Segoe UI',sans-serif;background:#f4f6f8;margin:0;padding:30px 20px;}
          .container{max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);}
          .header{background:linear-gradient(135deg,#00c853 0%,#00e676 100%);padding:30px;text-align:center;color:#fff;}
          .header h1{margin:0;font-size:24px;font-weight:800;}
          .badge{display:inline-block;background:rgba(255,255,255,.25);border-radius:20px;padding:4px 14px;font-size:13px;margin-top:8px;}
          .content{padding:28px 30px;}
          .status-timeline{display:flex;justify-content:space-between;margin:20px 0;text-align:center;}
          .step{flex:1;position:relative;}
          .step-dot{width:28px;height:28px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:14px;}
          .step-dot.done{background:#00c853;color:#fff;}
          .step-dot.pending{background:#e0e0e0;color:#9e9e9e;}
          .step-label{font-size:11px;color:#78909c;font-weight:600;}
          .step-label.done{color:#00c853;}
          table{width:100%;border-collapse:collapse;margin:16px 0;}
          th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:12px;color:#78909c;text-transform:uppercase;}
          .total-row td{padding:10px 12px;font-weight:800;font-size:16px;color:#263238;border-top:2px solid #eee;}
          .footer{background:#f5f5f5;padding:20px;text-align:center;color:#90a4ae;font-size:12px;}
        </style></head><body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <div class="badge">Order #${String(order._id).slice(-6).toUpperCase()}</div>
            </div>
            <div class="content">
              <p style="color:#263238;font-size:16px;">Hi <strong>${userName}</strong>! 🎉</p>
              <p style="color:#546e7a;">Great news — the kitchen has confirmed your order and is getting ready to prepare it.</p>

              <!-- Status Timeline -->
              <div class="status-timeline">
                <div class="step">
                  <div class="step-dot done">✓</div>
                  <div class="step-label done">Placed</div>
                </div>
                <div class="step">
                  <div class="step-dot done">✓</div>
                  <div class="step-label done">Confirmed</div>
                </div>
                <div class="step">
                  <div class="step-dot pending">🔥</div>
                  <div class="step-label">Preparing</div>
                </div>
                <div class="step">
                  <div class="step-dot pending">🍽️</div>
                  <div class="step-label">Ready</div>
                </div>
                <div class="step">
                  <div class="step-dot pending">🚀</div>
                  <div class="step-label">Delivered</div>
                </div>
              </div>

              ${seatInfo}

              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot><tr class="total-row"><td colspan="2">Total</td><td style="text-align:right;">₹${order.totalAmount.toFixed(2)}</td></tr></tfoot>
              </table>

              <p style="color:#546e7a;font-size:14px;">
                🕐 Sit tight! Your food will be ready soon. You'll receive updates as your order progresses.
              </p>
            </div>
            <div class="footer">5 Rings Platform · Thank you for your order!</div>
          </div>
        </body></html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmed email sent to user: ${userEmail}`);
  } catch (error) {
    console.error('Error sending order confirmed email to user:', error);
  }
};

// ── Password Reset OTP Email ─────────────────────────────────────────────────
const sendPasswordResetEmail = async (email, name, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Sport Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Reset Your Password - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); margin: 0; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
            .header { background: linear-gradient(135deg, #ef5350 0%, #b71c1c 100%); padding: 40px 30px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 20px; color: #263238; margin-bottom: 20px; font-weight: 600; }
            .message { color: #546e7a; line-height: 1.6; margin-bottom: 30px; font-size: 16px; }
            .otp-box { background: linear-gradient(135deg, rgba(239,83,80,0.08) 0%, rgba(183,28,28,0.08) 100%); border: 2px solid #ef5350; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp-label { font-size: 13px; color: #546e7a; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
            .otp-code { font-size: 42px; font-weight: 800; color: #ef5350; letter-spacing: 8px; margin: 10px 0; }
            .expiry { font-size: 13px; color: #ff5252; font-weight: 600; margin-top: 10px; }
            .warning { background: #fff3e0; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; color: #e65100; font-size: 14px; margin-top: 30px; }
            .footer { background: #f5f5f5; padding: 30px; text-align: center; color: #78909c; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>🔐 Password Reset</h1></div>
            <div class="content">
              <div class="greeting">Hello ${name}! 👋</div>
              <div class="message">
                We received a request to reset your password. Use the code below to create a new password.
                If you did not make this request, you can safely ignore this email — your password will not change.
              </div>
              <div class="otp-box">
                <div class="otp-label">Your Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div class="expiry">⏱️ Valid for 10 minutes only</div>
              </div>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Our team will never ask for your reset code.
              </div>
            </div>
            <div class="footer">
              <div>Sport Platform - Your Athletic Partner</div>
              <div style="margin-top:10px;font-size:12px;">This is an automated email. Please do not reply.</div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendNewOrderToKitchen,
  sendOrderConfirmedToUser,
  sendPasswordResetEmail,
};
