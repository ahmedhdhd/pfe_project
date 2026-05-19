// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOtp = (key: string, otp: string): void => {
  otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min
};

export const verifyOtp = (key: string, otp: string): boolean => {
  const entry = otpStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return false;
  }
  if (entry.otp !== otp) return false;
  otpStore.delete(key);
  return true;
};

export const sendOtpSms = async (
  countryCode: string,
  phoneNumber: string,
  otp: string
): Promise<void> => {
  // Replace with MSG91 / Twilio integration
  if (process.env.NODE_ENV === 'development') {
    console.log(`[OTP] ${countryCode}${phoneNumber} → ${otp}`);
    return;
  }
  // Example MSG91:
  // await axios.get(`https://api.msg91.com/api/v5/otp?template_id=...&mobile=${countryCode}${phoneNumber}&otp=${otp}&authkey=${process.env.MSG91_AUTH_KEY}`);
  throw new Error('SMS provider not configured');
};
