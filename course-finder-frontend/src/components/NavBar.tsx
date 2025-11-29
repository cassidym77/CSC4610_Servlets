import { NavLink } from "react-router-dom";

type NavBarProps = {
  userName: string | undefined;
};
export default function NavBar({ userName }: NavBarProps) {

  function renderLoginLogout() {
    if (userName) {
      return (
        <NavLink to="/logout" style={{ float: "right" }}>
          {userName}
        </NavLink>
      );
    } else {
      return (
        <>
        <NavLink to="/login" style={{ float: "right" }}>
          Login
        </NavLink>
        <NavLink to="/signup" style={{ float: "right", marginRight: "10px" }}>
            Sign Up
          </NavLink>
        </>
      );
    }
  }

  return (
    <div className="navbar">
      <NavLink to={"/"}>Home</NavLink>
      <NavLink to={"/profile"}>Profile</NavLink>
      <NavLink to={"/courses"}>Courses</NavLink>
      <NavLink to={"/createCourse"}>Create Post</NavLink>
      {renderLoginLogout()}
    </div>
  );
}
