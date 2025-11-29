import { useState, useEffect } from "react";
import { DataService } from "../services/DataService";
import { CourseEntry } from "./model/model";
import BlogPostComponent from "./BlogPostComponent";

interface CoursesPageProps {
  dataService: DataService;
}

export default function CoursesPage({ dataService }: CoursesPageProps) {
  const [posts, setPosts] = useState<CourseEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const publicPosts = await dataService.getPublicBlogPosts();
        setPosts(publicPosts);
        setError("");
      } catch (err) {
        setError("Failed to load blog posts. Please try again later.");
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [dataService]);

  if (loading) {
    return (
      <div>
        <h1>Blog Explorer</h1>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Blog Explorer</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Blog Explorer</h1>
      <p>See what others have been posting about.</p>
      {posts.length === 0 ? (
        <div>
          <p>No public blog posts available yet.</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <BlogPostComponent key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

