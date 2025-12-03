import { useState, useEffect, useMemo } from "react";
import { DataService } from "../services/DataService";
import { CourseEntry } from "./model/model";
import BlogPostComponent from "./BlogPostComponent";
import './CoursesPage.css';

interface CoursesPageProps {
  dataService: DataService;
}

export default function CoursesPage({ dataService }: CoursesPageProps) {
  const [posts, setPosts] = useState<CourseEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return posts.filter(post => {
      const title = (post.title || post.course_name || '').toLowerCase();
      const content = (post.content || '').toLowerCase();
      const authorId = (post.authorId || '').toLowerCase();
      
      return title.includes(query) || 
             content.includes(query) || 
             authorId.includes(query);
    });
  }, [posts, searchQuery]);

  if (loading) {
    return (
      <div className="coursesPageContainer">
        <h1>Blog Explorer</h1>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coursesPageContainer">
        <h1>Blog Explorer</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="coursesPageContainer">
      <h1>Blog Explorer</h1>
      <p>See what others have been posting about.</p>
      
      {/* Search Bar */}
      <div className="searchContainer">
        <input
          type="text"
          placeholder="Search posts by title, content, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="searchInput"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="clearSearchButton"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="searchResultsInfo">
          {filteredPosts.length === 0 ? (
            <p>No posts found matching "{searchQuery}"</p>
          ) : (
            <p>Found {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} matching "{searchQuery}"</p>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <div>
          <p>No public blog posts available yet.</p>
        </div>
      ) : filteredPosts.length === 0 && !searchQuery ? (
        <div>
          <p>No public blog posts available yet.</p>
        </div>
      ) : (
        <div className="postsList">
          {filteredPosts.map((post) => (
            <BlogPostComponent key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

