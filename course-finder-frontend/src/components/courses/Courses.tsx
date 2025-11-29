import { useState, useEffect } from "react";
import CourseComponent from "./CourseComponent";
import { DataService } from "../../services/DataService";
import { NavLink } from "react-router-dom";
import { CourseEntry } from "../model/model";

interface CoursesProps {
    dataService: DataService
}

import BlogPostComponent from "../BlogPostComponent";

export default function Courses(props: CoursesProps){

    const [posts, setPosts] = useState<CourseEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(()=>{
        const getPrivatePosts = async ()=>{
            if (!props.dataService.isAuthorized()) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const privatePosts = await props.dataService.getUserPrivatePosts();
                setPosts(privatePosts);
                setError("");
            } catch (err) {
                setError("Failed to load your private posts. Please try again later.");
                console.error("Error fetching private posts:", err);
            } finally {
                setLoading(false);
            }
        }
        getPrivatePosts();
    }, [props.dataService])

    function renderPosts(){
        if(!props.dataService.isAuthorized()) {
            return <NavLink to={"/login"}>Please login to view your posts</NavLink>
        }
        
        if (loading) {
            return <p>Loading your posts...</p>;
        }
        
        if (error) {
            return <p style={{ color: 'red' }}>{error}</p>;
        }
        
        if (posts.length === 0) {
            return <p>You don't have any private posts yet. <NavLink to="/createCourse">Create one</NavLink>!</p>;
        }
        
        return (
            <div>
                {posts.map((post) => (
                    <BlogPostComponent key={post.id} post={post} />
                ))}
            </div>
        );
    }

    return (
        <div>
            <h2>Your Private Posts</h2>
            {renderPosts()}
        </div>
    )        
    

}