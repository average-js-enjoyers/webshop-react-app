//src/hooks/useAuth.js

import { useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "context/AuthContext";
import {
  generateRandomStateValue,
  generateCodeChallenge,
  generateCodeVerifier,
  getAuthUrl,
} from "utils/oauthHelpers";

import {
  fetchUserInfoAndGetNewToken,
  apiOnboardUser,
  fetchUserData,
} from "api";
import {
  createUser,
  fetchAccessToken,
  requestBackendToSendPasswordResetEmail,
  requestConfRegEmail,
  apiUpdatePassword,
  apiFetchUserAddresses,
  apiUpdateUserInfo,
  apiUpdateUserPassword,
  apiAddAddress,
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
        const userInfo = response.data.user;

        authContext.setAuthInfo({ user: userInfo });

        if (!userInfo.emailConfirmed) {
          navigate(`/onboard/${response.token}`, { replace: true });
        } else {
          authContext.setResponseData({
            status: "success",
            message: "You have signed in successfully. Welcome!",
          });
          navigate("/");
        }
      } catch (error) {
        console.error(`Error during sign-in with ${provider} token:`, error);
        authContext.setResponseData({
          status: "error",
          message: `Error during sign-in with ${provider} token. Hang tight while we fix this!`,
        });
        navigate("/signin", { replace: true });
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
          authContext.setResponseData({
            status: "error",
            message:
              "Error sending confirmation email. 😟 Please request a resend a bit later.",
          });
          navigate("/confirm-registration", {});
          throw new Error(response.error);
        }
        authContext.setConfregEmailSent(true);
        authContext.setResponseData({
          status: "success",
          message:
            "You have signed up successfully. Check your inbox for a confirmation email.",
        });
        navigate("/confirm-registration", { replace: true });
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
    sessionStorage.removeItem("accessToken");
    authContext.clearAuthInfo();
    authContext.setResponseData({
      status: "success",
      message: "You have signed out successfully. See you soon!",
    });
    navigate("/", { replace: true });
  }, [navigate, authContext /* authContext.setAuthInfo */]);

  const sendPasswordResetEmail = useCallback(async (email) => {
    try {
      const data = await requestBackendToSendPasswordResetEmail(email);

      if (data.error) {
        authContext.setResponseData({
          status: "error",
          message: "Something went wrong. Please try again!",
        });
        throw new Error(data.error);
      }
      authContext.setResponseData({
        status: "success",
        message: "Sent password reset link to your email!",
      });
      authContext.setPasswordResetLinkSent(true);
      return data.exists;
    } catch (error) {
      console.error(error);
    }
  }, []);

  const onboardUser = useCallback(
    async (userData, externalAuth) => {
      try {
        const response = await apiOnboardUser(userData);
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.status === "success" && !externalAuth) {
          setTimeout(async () => {
            const response = await fetchAccessToken(
              userData.email,
              userData.password
            );
            authContext.setAuthInfo({
              user: response.data.user,
            });
            sessionStorage.removeItem("accessToken");
            sessionStorage.setItem("accessToken", response.token);
            authContext.setResponseData({
              status: "success",
              message: "You have successfully onboarded. Welcome to the Shop!",
            });
          }, 2000);
        }
        if (response.status === "success" && externalAuth) {
          setTimeout(async () => {
            const user = await fetchUserData(
              sessionStorage.getItem("accessToken")
            );
            if (!user.emailConfirmed) {
              throw new Error("Operation failed.");
            } else {
              authContext.setAuthInfo({
                user: user,
              });
              sessionStorage.setItem("onboardSuccess", true);
              navigate("/");
            }
          }, 2000);
        }
      } catch (error) {
        // handle error
        console.error("ERROR ERROR", error);
      }
    },
    [authContext]
  );

  const resetPassword = useCallback(
    async (payload) => {
      try {
        console.log("resetPassword request", payload);
        const response = await apiUpdatePassword(payload);
        authContext.setResponseData(response);
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.status === "success") {
          authContext.setAuthInfo({
            user: response.data.user,
          });
          sessionStorage.removeItem("resetPwdToken");
          sessionStorage.removeItem("accessToken");
          sessionStorage.setItem("accessToken", response.token);
        }
        // navigate("/signin", { state: { resetPasswordSuccess: true } });
      } catch (error) {
        // handle error
        console.error(error);
      }
    },
    [navigate]
  );

  const fetchUserAddresses = useCallback(async () => {
    try {
      const data = await apiFetchUserAddresses();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    } catch (error) {
      // handle error
      console.error(error);
    }
  }, []);

  const updateUserInfo = useCallback(async (userData) => {
    try {
      const response = await apiUpdateUserInfo(userData);
      authContext.setResponseData({
        ...response,
        message: "User info updated successfully.",
      });
      if (response.error) {
        authContext.setResponseData({
          status: "error",
          message: "Something went wrong. Please try again!",
        });
        throw new Error(response.error);
      }
      return response;
    } catch (error) {
      // handle error
      console.error("ERROR ERROR", error);
    }
  }, []);

  const updateUserPassword = useCallback(async (passwords) => {
    try {
      const response = await apiUpdateUserPassword(passwords);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      // handle error
      console.error("ERROR ERROR", error);
    }
  }, []);

  const addAddress = useCallback(async (address) => {
    try {
      const response = await apiAddAddress(address);
      authContext.setResponseData(response);
      if (response.error) {
        throw new Error(response.error);
      }
      console.log("response", response);
      return response;
    } catch (error) {
      // handle error
      console.error("ERROR ERROR", error);
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
    onboardUser,
    resetPassword,
    fetchUserAddresses,
    updateUserInfo,
    updateUserPassword,
    addAddress,
  };
};
