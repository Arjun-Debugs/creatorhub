import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

interface OrderEmailData {
  to: string;
  userName: string;
  courseName: string;
  orderAmount: number;
  orderId: string;
}

interface EnrollmentEmailData {
  to: string;
  userName: string;
  courseName: string;
  courseUrl: string;
}

export const sendOrderConfirmationEmail = async (data: OrderEmailData) => {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'CreatorHub <onboarding@resend.dev>',
      to: data.to,
      subject: `Order Confirmation - ${data.courseName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Order Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.userName},</p>
                <p>Thank you for your purchase! Your order has been confirmed and you now have access to:</p>
                
                <div class="order-details">
                  <h2 style="margin-top: 0;">${data.courseName}</h2>
                  <p><strong>Order ID:</strong> ${data.orderId}</p>
                  <p><strong>Amount Paid:</strong> ₹${data.orderAmount.toFixed(2)}</p>
                </div>

                <p>You can start learning right away!</p>
                
                <a href="${window.location.origin}/dashboard" class="button">Go to My Courses</a>

                <p>If you have any questions, feel free to reach out to our support team.</p>
                
                <p>Happy Learning!<br>The CreatorHub Team</p>
              </div>
              <div class="footer">
                <p>© 2026 CreatorHub. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};

export const sendEnrollmentEmail = async (data: EnrollmentEmailData) => {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'CreatorHub <onboarding@resend.dev>',
      to: data.to,
      subject: `Welcome to ${data.courseName}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 You're Enrolled!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.userName},</p>
                <p>Welcome to <strong>${data.courseName}</strong>!</p>
                
                <p>You're all set to start your learning journey. Access your course anytime from your dashboard.</p>
                
                <a href="${data.courseUrl}" class="button">Start Learning Now</a>

                <p>Tips for success:</p>
                <ul>
                  <li>Set aside dedicated time for learning</li>
                  <li>Complete lessons in order</li>
                  <li>Engage with the community in discussions</li>
                  <li>Practice what you learn</li>
                </ul>
                
                <p>We're excited to be part of your learning journey!</p>
                
                <p>Best regards,<br>The CreatorHub Team</p>
              </div>
              <div class="footer">
                <p>© 2026 CreatorHub. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};
