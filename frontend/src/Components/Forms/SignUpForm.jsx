import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doesEmailExist } from "api";

const isEmailValid = (email) => {
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return re.test(String(email).toLowerCase());
};

const QuickSignUpForm = ({ onSignUp }) => {
  const [email, setEmail] = useState("");
  const [termsAndServicesBox, setTermsAndServicesBox] = useState(false);
  const [privacyPolicyBox, setPrivacyPolicyBox] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [emailTaken, setEmailTaken] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    return onSignUp({
      emailAddress: email,
    });
  };

  const handleTermsAndServicesBox = () => {
    setTermsAndServicesBox(!termsAndServicesBox);
  };

  const handlePrivacyPolicyBox = () => {
    setPrivacyPolicyBox(!privacyPolicyBox);
  };

  const emailErrorStateHandler = async (email) => {
    if (isEmailValid(email)) {
      setEmailValid(true);
    } else if (email.length > 5) {
      setEmailValid(false);
    }

    if (isEmailValid(email)) {
      const emailTaken = await doesEmailExist({ emailAddress: email });
      setEmailTaken(emailTaken);
    }
  };

  useEffect(() => {
    emailErrorStateHandler(email);
  }, [email]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="control">
        {!emailValid && (
          <div style={{ color: "red" }}>Invalid E-mail address!</div>
        )}
        {emailTaken && (
          <div style={{ color: "red" }}>E-mail address is already in use!</div>
        )}
        <label htmlFor="email">Your Email Address</label>
        <input
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          id="email"
          placeholder="Enter your email address here"
        />
      </div>

      <div className="control">
        <label htmlFor="email">I accept the Terms of Service:</label>
        <input
          type="checkbox"
          checked={termsAndServicesBox}
          onChange={handleTermsAndServicesBox}
          name="email"
          id="email"
        />
      </div>

      <div className="control">
        <label htmlFor="email">I accept the Privacy Policy:</label>
        <input
          type="checkbox"
          checked={privacyPolicyBox}
          onChange={handlePrivacyPolicyBox}
          name="email"
          id="email"
        />
      </div>

      {emailValid && privacyPolicyBox && termsAndServicesBox && (
        <input
          type="submit"
          className="btn btn-primary"
          disabled
          value="Sign Up Now"
        />
      )}
    </form>
  );
};

export default QuickSignUpForm;
