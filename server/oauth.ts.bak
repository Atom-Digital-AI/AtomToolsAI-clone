import { OAuth2Client } from 'google-auth-library';

// Initialize Google OAuth client
export const googleOAuthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/auth/google/callback`
);

// Generate Google OAuth URL
export function getGoogleAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}

// Verify Google OAuth token and get user info
export async function verifyGoogleToken(code: string) {
  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      profileImageUrl: payload.picture || '',
      isEmailVerified: payload.email_verified || false,
    };
  } catch (error) {
    console.error('Google OAuth verification error:', error);
    throw new Error('Failed to verify Google token');
  }
}