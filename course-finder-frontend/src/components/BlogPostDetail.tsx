import { useState, useEffect, SyntheticEvent } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { DataService } from "../services/DataService";
import { CourseEntry, Comment } from "./model/model";
import './BlogPostDetail.css';

interface BlogPostDetailProps {
  dataService: DataService;
}

export default function BlogPostDetail({ dataService }: BlogPostDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<CourseEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [commentText, setCommentText] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) {
        setError("Post ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedPost = await dataService.getBlogPostById(id);
        
        // Check if current user is the owner
        let owner = false;
        try {
          owner = await dataService.isPostOwner(fetchedPost);
          setIsOwner(owner);
        } catch (ownerErr) {
          console.error('Error checking ownership:', ownerErr);
          setIsOwner(false);
        }
        
        // Parse isPublic if it's a string
        let isPublic = fetchedPost.isPublic;
        if (typeof isPublic === 'string') {
          isPublic = isPublic === 'true' || isPublic === 'True';
        }
        
        // Private posts: only the author can view them
        if (isPublic !== true && !owner) {
          setError("This post is private and can only be viewed by the author.");
          setLoading(false);
          return;
        }
        
        // Public posts: everyone can view them
        // Private posts: only owner can view them (checked above)
        setPost(fetchedPost);
        setError("");
      } catch (err: any) {
        setError(err.message || "Failed to load blog post. Please try again later.");
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, dataService]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await dataService.deleteBlogPost(id);
      navigate('/courses');
    } catch (err: any) {
      setError(err.message || "Failed to delete post. Please try again.");
      console.error("Error deleting post:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleCommentSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!id || !commentText.trim()) {
      setCommentError("Please enter a comment.");
      return;
    }

    if (!dataService.isAuthorized()) {
      setCommentError("Please login to post a comment.");
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentError("");
      await dataService.addComment(id, commentText.trim());
      
      // Refresh the post to get updated comments
      const updatedPost = await dataService.getBlogPostById(id);
      setPost(updatedPost);
      setCommentText("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment. Please try again.");
      console.error("Error posting comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Loading post...</h1>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <h1>Blog Post</h1>
        <p style={{ color: 'red' }}>{error || "Post not found"}</p>
        <button onClick={() => navigate('/courses')}>Back to Blog Explorer</button>
      </div>
    );
  }

  return (
    <div className="blogPostDetail">
      <button onClick={() => navigate('/courses')} className="backButton">
        ← Back to Blog Explorer
      </button>
      
      <article className="blogPostContent">
        <div className="postHeader">
          <h1>{post.title || post.course_name}</h1>
          {isOwner && (
            <div className="postActions">
              <button 
                onClick={() => navigate(`/edit/${id}`)}
                className="editButton"
              >
                Edit
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="deleteButton"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
        <div className="blogPostMeta">
          <span className="postCode">{post.course_code}</span>
        </div>
        <div className="blogPostBody">
          {post.content?.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      <section className="commentsSection">
        <h2>Comments ({post.comments?.length || 0})</h2>
        
        {/* Comments are only allowed on public posts by logged-in users */}
        {(() => {
          // Parse isPublic if it's a string
          let isPublic = post.isPublic;
          if (typeof isPublic === 'string') {
            isPublic = isPublic === 'true' || isPublic === 'True';
          }
          
          // Only show comment form for public posts
          if (isPublic === true) {
            if (dataService.isAuthorized()) {
              return (
                <form onSubmit={handleCommentSubmit} className="commentForm">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    rows={4}
                    className="commentInput"
                  />
                  {commentError && <p className="errorMessage">{commentError}</p>}
                  <button 
                    type="submit" 
                    disabled={submittingComment || !commentText.trim()}
                    className="submitCommentButton"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              );
            } else {
              return (
                <p>
                  <NavLink to="/login">Login</NavLink> to post a comment.
                </p>
              );
            }
          } else {
            // Private posts don't allow comments
            return (
              <p className="noComments">Comments are not available for private posts.</p>
            );
          }
        })()}

        <div className="commentsList">
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment: Comment) => (
              <div key={comment.id} className="comment">
                <div className="commentHeader">
                  <strong>{comment.author}</strong>
                  {comment.createdAt && (
                    <span className="commentDate">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="commentContent">{comment.content}</div>
              </div>
            ))
          ) : (
            <p className="noComments">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </section>
    </div>
  );
}


