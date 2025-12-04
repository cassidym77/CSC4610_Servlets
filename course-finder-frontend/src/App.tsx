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
import Home from './components/Home';
import Profile from './components/Profile';
import CoursesPage from './components/CoursesPage';
import CreateBlogPost from './components/CreateBlogPost';
import BlogPostDetail from './components/BlogPostDetail';
import EditPost from './components/EditPost';

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
          element: <Home />,
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
          element: <Profile dataService={dataService}/>,
        },
        {
          path: "/courses",
          element: <CoursesPage dataService={dataService}/>,
        },
        {
          path: "/blog/:id",
          element: <BlogPostDetail dataService={dataService}/>,
        },
        {
          path: "/edit/:id",
          element: <EditPost dataService={dataService}/>,
        },
        {
          path: "/createCourse",
          element: <CreateBlogPost dataService={dataService}/>,
        },
        {
          path: "/yourPosts",
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
