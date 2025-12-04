import { useState, useEffect, SyntheticEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DataService } from "../services/DataService";
import { CourseEntry } from "./model/model";
import './EditPost.css';

interface EditPostProps {
  dataService: DataService;
}

export default function EditPost({ dataService }: EditPostProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<CourseEntry | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setError("Post ID is required");
        setLoading(false);
        return;
      }

      if (!dataService.isAuthorized()) {
        setError("Please login to edit posts");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedPost = await dataService.getBlogPostById(id);
        setPost(fetchedPost);
        setTitle(fetchedPost.title || fetchedPost.course_name || "");
        setContent(fetchedPost.content || "");
        setIsPublic(fetchedPost.isPublic !== false); // Default to true if undefined
        setError("");
      } catch (err: any) {
        setError(err.message || "Failed to load post. Please try again later.");
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [id, dataService]);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!id || !title.trim() || !content.trim()) {
      setError("Please provide both a title and content!");
      return;
    }

    if (!dataService.isAuthorized()) {
      setError("Please login to edit posts");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await dataService.updateBlogPost(id, title.trim(), content.trim(), isPublic);
      
      setSuccess("Post updated successfully!");
      
      // Navigate to the post detail page after a short delay
      setTimeout(() => {
        navigate(`/blog/${id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update post. Please try again.");
      console.error("Error updating post:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!dataService.isAuthorized()) {
    return (
      <div className="editPostContainer">
        <h1>Edit Post</h1>
        <p>Please login to edit posts.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editPostContainer">
        <h1>Edit Post</h1>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="editPostContainer">
        <h1>Edit Post</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="editPostContainer">
      <h1>Edit Post</h1>
      
      <form onSubmit={handleSubmit} className="editPostForm">
        <div className="formGroup">
          <label>Title:</label>
          <input 
            type="text"
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="titleInput"
            required
          />
        </div>

        <div className="formGroup">
          <label>Content:</label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="contentInput"
            required
          />
        </div>

        <div className="formGroup">
          <div className="checkboxGroup">
            <input 
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              id="isPublic"
            />
            <label htmlFor="isPublic">
              Make this post public (visible to other users)
            </label>
          </div>
        </div>

        {error && <div className="errorMessage">{error}</div>}
        {success && <div className="successMessage">{success}</div>}

        <div className="buttonGroup">
          <button 
            type="submit" 
            disabled={saving || !title.trim() || !content.trim()}
            className="saveButton"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="cancelButton"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

