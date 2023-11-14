//src/hooks/useAuth.js

import { useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "context/AuthContext";
// import { signInWithApi, signOutFromApi } from "api"; // You'll define these
import {
  generateRandomStateValue,
  generateCodeChallenge,
  generateCodeVerifier,
  getAuthUrl,
} from "utils/oauthHelpers";

import { fetchUserInfoAndGetNewToken } from "api";
import {
  createUser,
  fetchAccessToken,
  requestBackendToSendPasswordResetEmail,
  requestConfRegEmail,
} from "api";

export const useAuth = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const signInWithOwnBackend = useCallback(
    async (email, password) => {
      try {
        const response = await fetchAccessToken(email, password);
        authContext.setResponseData(response);

        if (response.error) {
          throw new Error(response.error.statusCode);
        }

        authContext.setAuthInfo({
          user: response.data.user,
        });
        sessionStorage.setItem("accessToken", response.token);
        navigate("/auth/internal");
      } catch (error) {
        console.error("Error in signInWithOwnBackend.", error);
      }
    },
    [authContext, navigate]
  );

  const signInWithProvider = useCallback((provider) => {
    const state = generateRandomStateValue();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Save the state and codeVerifier in sessionStorage or other secure place to use later
    sessionStorage.setItem(`${provider}State`, state);
    sessionStorage.setItem(`${provider}CodeVerifier`, codeVerifier);

    const authUrl = getAuthUrl(provider, state, codeChallenge);
    window.location.href = authUrl;
  }, []);

  const signInWithProviderToken = useCallback(
    async (provider, accessToken, refreshToken) => {
      try {
        const response = await fetchUserInfoAndGetNewToken(
          provider,
          accessToken
        );
        console.log(response);
        const userInfo = response.data.user;

        authContext.setAuthInfo({ user: userInfo });

        if (!userInfo.emailConfirmed) {
          navigate(`/onboard/${response.token}`, { replace: true });
        } else {
          navigate("/", { state: { signInSuccess: true } });
        }
      } catch (error) {
        console.error(`Error during sign-in with ${provider} token:`, error);
        navigate("/signin", {
          state: {
            oauthError: `Error during sign-in with ${provider} token. Hang tight while we fix this!`,
          },
        });
      }
    },
    [navigate, authContext]
  );

  const sendConfRegEmail = useCallback(
    async (email) => {
      try {
        const response = await requestConfRegEmail(email);
        if (response.error) {
          authContext.setConfregEmailSent("COULD_NOT_SEND");
          navigate("/confirm-registration", {});
          throw new Error(response.error);
        }
        authContext.setConfregEmailSent(true);
        navigate("/confirm-registration", { state: { signUpSuccess: true } });
      } catch (error) {
        // handle error
        console.error(error);
      }
    },
    [navigate, authContext]
  );

  const signUp = useCallback(
    async (user) => {
      try {
        const data = await createUser(user);
        // Maybe sign in the user directly or set some state to confirm registration
        // TODO - Implement sign in after sign up
        if (data.error) {
          throw new Error(data.error);
        }
        sessionStorage.setItem("signUpEmail", user.emailAddress);
        sendConfRegEmail(user.emailAddress);
      } catch (error) {
        // handle error
        console.error(error);
      }
    },
    [sendConfRegEmail]
  );

  const signOut = useCallback(() => {
    // Clear the application session
    sessionStorage.removeItem("accessToken");
    authContext.clearAuthInfo();
    // Redirect to the sign-in page or home page
    navigate("/", { replace: true, state: { signOutSuccess: true } });

    // Optionally, sign out from Google too. Uncomment the following line if needed.
    // window.location.href = 'https://accounts.google.com/Logout';
  }, [navigate, authContext /* authContext.setAuthInfo */]);

  const sendPasswordResetEmail = useCallback(async (email) => {
    try {
      const data = await requestBackendToSendPasswordResetEmail(email);

      if (data.error) {
        authContext.setResponseData(data);
        throw new Error(data.error);
      }

      authContext.setPasswordResetLinkSent(true);
      return data.exists;
    } catch (error) {
      console.error(error);
    }
  }, []);

  return {
    ...authContext,
    signUp,
    signInWithOwnBackend,
    signInWithProvider,
    signInWithProviderToken,
    signOut,
    sendPasswordResetEmail,
    sendConfRegEmail,
  };
};
