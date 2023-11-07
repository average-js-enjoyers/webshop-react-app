//src/api/authApi.js
export async function createUser(user) {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    const data = response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create user");
  }
}

export function modifyUser(user) {
  return "I am modifying the user 🪄";
}

export async function fetchUserInfoAndGetNewToken(authServer, accessToken) {
  // Here would be an HTTP call to your backend with the accessToken

  //  This is how the call should include the Authorization header
  // TODO - Remove accessToken from the query after backend implementation
  const response = await fetch(`/api/auth/login/${authServer}/${accessToken}`, {
    method: "POST", // Specify the method
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });
  const res = await response.json();

  sessionStorage.setItem("accessToken", res.token);

  return res.data.user;
}

export function handleSignUp(user) {
  console.log(user);
  createUser(user).then(() => {
    console.log("this works");
  });
}

export async function checkEmailExists(email) {
  try {
    const response = await fetch("/api/auth/email/exists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });
    const data = await response.json();
    return data.data.exists;
  } catch (error) {
    console.error(error);
  }
}