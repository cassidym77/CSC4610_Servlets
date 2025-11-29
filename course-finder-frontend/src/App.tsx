import './App.css'
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import NavBar from './components/NavBar';
import { useState } from 'react';
import LoginComponent from './components/LoginComponent';
import SignUpComponent from './components/SignUpComponent';
import { AuthService } from './services/AuthService';
import { DataService } from './services/DataService';
import CreateCourse from './components/courses/CreateCourse';
import Courses from './components/courses/Courses';

const authService = new AuthService();
const dataService = new DataService(authService);

function App() {
  const [userName, setUserName] = useState<string | undefined>(undefined);

  const router = createBrowserRouter([
    {
      element: (
        <>
          <NavBar userName={userName}/>
          <Outlet />
        </>
      ),
      children:[
        {
          path: "/",
          element: <div>Hello world!</div>,
        },
        {
          path: "/login",
          element: <LoginComponent authService={authService} setUserNameCb={setUserName}/>,
        },
        {
          path: "/signup",
          element: <SignUpComponent />,
        },
        {
          path: "/profile",
          element: <div>Profile page</div>,
        },
        {
          path: "/createCourse",
          element: <CreateCourse dataService={dataService}/>,
        },
        {
          path: "/courses",
          element: <Courses dataService={dataService}/>,
        },
      ]
    },
  ]);

  return (
    <div className="wrapper">
      <RouterProvider router={router} />
    </div>
  )
}

export default App
