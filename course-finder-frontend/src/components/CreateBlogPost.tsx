import { SyntheticEvent, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { DataService } from "../services/DataService";
import './CreateBlogPost.css';

type CreateBlogPostProps = {
  dataService: DataService;
};

export default function CreateBlogPost({ dataService }: CreateBlogPostProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and content!');
      return;
    }

    if (!dataService.isAuthorized()) {
      setError('Please login to create posts');
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      const id = await dataService.createBlogPost(title.trim(), content.trim(), isPublic);
      setSuccess('Post created successfully!');
      setTitle('');
      setContent('');
      setIsPublic(true);
      
      // Navigate to the new post after a short delay
      setTimeout(() => {
        navigate(`/blog/${id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error creating blog post. Please try again.');
      console.error("Error creating post:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!dataService.isAuthorized()) {
    return (
      <div className="createPostContainer">
        <h1>Create Post</h1>
        <div className="loginPrompt">
          <p>Please <NavLink to={"/login"}>login</NavLink> to create a new post.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="createPostContainer">
      <h1>Create Post</h1>
      
      <form onSubmit={handleSubmit} className="createPostForm">
        <div className="formGroup">
          <label>Title</label>
          <input 
            type="text"
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="titleInput"
            placeholder="Enter post title..."
            required
          />
        </div>

        <div className="formGroup">
          <label>Content</label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="contentInput"
            placeholder="Write your post content here..."
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

        <button 
          type="submit" 
          disabled={submitting || !title.trim() || !content.trim()}
          className="submitButton"
        >
          {submitting ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}




