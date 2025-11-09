import { connectDB } from '@/lib/db';
import { getAuthTokenFromCookies, verifyAuthToken } from '@/lib/auth';
import { User } from '@/models/User';

export async function getCurrentUser() {
  const token = getAuthTokenFromCookies();

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);
    await connectDB();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return null;
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  } catch (error) {
    return null;
  }
}

