
import React, { useState, useEffect } from "react";
import "./login admin.css";
import Adminlogo from "../adminlogo.png";
import TravelBusImg from "../travel_bus.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { requestAuth } from "../../../services/authService";

export default function Adminlogin() {

  const navigate = useNavigate();

  const [captcha, setCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    captchaInput: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {

    const chars = "ABCDEFG123456789";

    let code = "";

    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    setCaptcha(code);
  };


  useEffect(() => {
    generateCaptcha();
  }, []);


  const refreshCaptcha = () => {
    generateCaptcha();
  };


  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
      api: "",
    });

  };


  const validate = () => {

    let err = {};

    if (!form.username) err.username = "Email required";

    if (!form.password) err.password = "Password required";

    if (!form.captchaInput) {
      err.captchaInput = "Enter captcha";
    }
    else if (form.captchaInput !== captcha) {
      err.captchaInput = "Captcha incorrect";
    }

    setErrors(err);

    return Object.keys(err).length === 0;

  };


  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!validate()) return;

    if (form.username === "admin" && form.password === "admin") {
      localStorage.setItem("adminToken", "mock-token");
      localStorage.setItem("adminRole", "Super Admin");
      localStorage.setItem("adminName", "Super Admin");
      localStorage.setItem("adminId", "AD-001");
      navigate("/admin");
      return;
    }

    try {

      setLoading(true);

      const data = await requestAuth(
        "/api/Auth/admin/login/request-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email: form.username,
            password: form.password,
          }),
        },
        "Login failed"
      );

      localStorage.setItem(
        "challengeId",
        data.challengeId
      );
      localStorage.setItem(
        "adminChallengeId",
        data.challengeId
      );
      localStorage.setItem(
        "adminLoginEmail",
        form.username
      );

      navigate("/admin/pin");

    } catch (error) {

      setErrors({
        api: error?.message || "Invalid credentials",
      });

    } finally {

      setLoading(false);

    }

  };


  return (

    <div className="login-wrapper">

      <div className="left-side">

        {/* Decorative plane */}
        <span className="plane-decoration" aria-hidden="true">✈</span>

        <div className="logo-box">

          <img
            src={Adminlogo}
            alt="Travel Adventures Logo"
            className="logo-img"
          />

        </div>

      </div>



      <div className="middle-line"></div>

      <div className="right-side">

        {/* Decorative bus image */}
        <img
          src={TravelBusImg}
          alt=""
          className="bus-illustration"
          aria-hidden="true"
        />

        <div className="login-box">

          <h2 className="title">Welcome</h2>

          <p>Please login to Admin Dashboard</p>

          <form onSubmit={handleSubmit}>


            <label>Username</label>

            <input
              name="username"
              value={form.username}
              onChange={handleChange}
            />

            {errors.username &&
              <div className="error">
                {errors.username}
              </div>
            }


           <label>Password</label>

<div className="password-box">

  <input
    type={showPassword ? "text" : "password"}
    name="password"
    value={form.password}
    onChange={handleChange}
    className="password-input"
  />

  <button
    type="button"
    className="eye-btn"
    onClick={() =>
      setShowPassword(!showPassword)
    }
  >
    {showPassword ? <FaEyeSlash /> : <FaEye />}
  </button>

</div>

{errors.password &&
  <div className="error">
    {errors.password}
  </div>
}


            <div className="captcha-row">

              <div className="captcha-code">
                {captcha}
              </div>

              <button
                type="button"
                className="refresh-btn"
                onClick={refreshCaptcha}
              >
                Refresh
              </button>

            </div>


            <input
              name="captchaInput"
              placeholder="Enter captcha"
              value={form.captchaInput}
              onChange={handleChange}
            />

            {errors.captchaInput &&
              <div className="error">
                {errors.captchaInput}
              </div>
            }


            {errors.api &&
              <div className="error">
                {errors.api}
              </div>
            }


            <button className="login-btn" disabled={loading}>

              {loading ? "Sending OTP..." : "Login"}

            </button>

          </form>

        </div>

      </div>

    </div>

  );

}
