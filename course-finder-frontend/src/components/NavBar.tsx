import { NavLink } from "react-router-dom";
import './NavBar.css';

type NavBarProps = {
  userName: string | undefined;
};
export default function NavBar({ userName }: NavBarProps) {

  function renderLoginLogout() {
    if (userName) {
      return (
        <NavLink to="/profile" className="user-link">
          {userName}
        </NavLink>
      );
    } else {
      return (
        <>
        <NavLink to="/login" className="login-link">
          Login
        </NavLink>
        <NavLink to="/signup" className="signup-link">
          Sign Up
        </NavLink>
        </>
      );
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <NavLink to={"/"} className="logo">PocketPost</NavLink>
        <NavLink to={"/"}>Home</NavLink>
        <NavLink to={"/courses"}>Explore</NavLink>
        <NavLink to={"/createCourse"}>Create</NavLink>
      </div>
      <div className="nav-right">
        {userName && <NavLink to={"/profile"}>Profile</NavLink>}
        {renderLoginLogout()}
      </div>
    </nav>
  );
}
