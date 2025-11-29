import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../services/AuthService";
import "../App.css";

const SignUpComponent: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();
  const authService = new AuthService();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await authService.signup(username, password, email);
      setShowVerification(true);
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await authService.confirmSignUp(username, code);
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    }
  };

  return (
    <div className="login-container">
      {!showVerification ? (
        <>
          <h2>Sign Up</h2>
          <form onSubmit={handleSignUp}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="submit">Sign Up</button>
            {error && <div className="error-message">{error}</div>}
          </form>
        </>
      ) : (
        <>
          <h2>Verify Your Account</h2>
          <form onSubmit={handleVerify}>
            <input
              type="text"
              placeholder="Verification Code"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
            />
            <button type="submit">Verify</button>
            {error && <div className="error-message">{error}</div>}
          </form>
        </>
      )}
    </div>
  );
};

export default SignUpComponent;
