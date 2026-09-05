// Google Authentication & Identity Services (GIS) integration

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt: number;
  isExpired?: boolean;
}

export interface AuthErrorDetails extends Error {
  type?: string;
  isCancellation?: boolean;
  isExpired?: boolean;
}

const STORAGE_KEY = 'gtd_google_auth_session';

export const GOOGLE_CLIENT_ID = 
  import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  '429377356994-ojmcclt11tkrettk0a3msqjfg8tn048p.apps.googleusercontent.com';

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
          };
        };
      };
    };
  }
}

export const isTokenValid = (user: GoogleUser | null): boolean => {
  if (!user || !user.accessToken || !user.expiresAt) return false;
  // Valid if remaining time is greater than 60 seconds
  return Date.now() < (user.expiresAt - 60000);
};

export const getStoredGoogleUser = (): GoogleUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user: GoogleUser = JSON.parse(raw);
    user.isExpired = !isTokenValid(user);
    return user;
  } catch (e) {
    console.warn('Error reading stored Google User session:', e);
    return null;
  }
};

export const saveGoogleUser = (user: GoogleUser | null): void => {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
};

export const fetchGoogleUserProfile = async (accessToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.sub || data.id,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    picture: data.picture,
  };
};

let tokenClientInstance: any = null;

export const requestGoogleLogin = (
  promptConsent = false
): Promise<GoogleUser> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      const err: AuthErrorDetails = new Error('Google Identity Services is initializing. Please wait a moment and try again.');
      err.type = 'gis_not_ready';
      reject(err);
      return;
    }

    try {
      tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: OAUTH_SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            const errType = tokenResponse.error || 'auth_error';
            const isUserDismiss = errType === 'popup_closed' || errType === 'popup_closed_by_user' || errType === 'access_denied';
            const err: AuthErrorDetails = new Error(
              isUserDismiss
                ? 'Sign-in popup was closed before completing.'
                : tokenResponse.error_description || tokenResponse.error || 'Google login was not completed.'
            );
            err.type = errType;
            err.isCancellation = isUserDismiss;
            reject(err);
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresIn = (tokenResponse.expires_in || 3600) * 1000;
          const expiresAt = Date.now() + expiresIn;

          try {
            const profile = await fetchGoogleUserProfile(accessToken);
            const user: GoogleUser = {
              ...profile,
              accessToken,
              expiresAt,
            };
            saveGoogleUser(user);
            resolve(user);
          } catch (profileErr) {
            reject(profileErr);
          }
        },
        error_callback: (error) => {
          const rawType = typeof error === 'object' && error !== null ? error.type : '';
          const isUserDismiss = rawType === 'popup_closed' || rawType === 'popup_closed_by_user' || rawType === 'access_denied';
          const isBlocked = rawType === 'popup_blocked' || rawType === 'popup_blocked_by_browser';

          let message = 'Sign-in was not completed.';
          if (isUserDismiss) {
            message = 'Sign-in popup was closed before completing.';
          } else if (isBlocked) {
            message = 'Pop-up window was blocked by your browser. Please allow popups for this site.';
          } else if (typeof error === 'string') {
            message = error;
          } else if (error?.message) {
            message = error.message;
          }

          const err: AuthErrorDetails = new Error(message);
          err.type = rawType || 'auth_error';
          err.isCancellation = isUserDismiss;
          reject(err);
        },
      });

      tokenClientInstance.requestAccessToken({
        prompt: promptConsent ? 'consent' : '',
      });
    } catch (err) {
      reject(err);
    }
  });
};
