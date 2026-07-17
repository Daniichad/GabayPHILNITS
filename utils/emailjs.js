/**
 * EmailJS Utility
 * Sends a 4-digit verification code using EmailJS v1.0 REST API.
 */

export const sendEmailJsOtp = async (toEmail, code, toName = 'Student') => {
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY; // Optional depending on template setup

  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      'EmailJS configuration is missing. Please define EXPO_PUBLIC_EMAILJS_SERVICE_ID, EXPO_PUBLIC_EMAILJS_TEMPLATE_ID, and EXPO_PUBLIC_EMAILJS_PUBLIC_KEY in your environment variables.'
    );
  }

  const requestBody = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    ...(privateKey ? { accessToken: privateKey } : {}),
    template_params: {
      to_email: toEmail,
      to_name: toName,
      verification_code: code,
      time: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS API error: ${errorText}`);
  }
};
