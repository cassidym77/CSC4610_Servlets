import { useState, useEffect, SyntheticEvent } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { DataService } from "../services/DataService";
import { PostEntry, Comment } from "./model/model";
import './BlogPostDetail.css';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  dataService: DataService;
  onVote: () => void;
}

function CommentItem({ comment, postId, dataService, onVote }: CommentItemProps) {
  const [voting, setVoting] = useState<boolean>(false);
  const [voteError, setVoteError] = useState<string>("");
  
  const username = dataService.isAuthorized() 
    ? (dataService as any).authService?.getUserName() 
    : null;

  const hasUpvoted = username && comment.upvotedBy?.includes(username);
  const hasDownvoted = username && comment.downvotedBy?.includes(username);
  const upvotes = comment.upvotes || 0;
  const downvotes = comment.downvotes || 0;
  const netScore = upvotes - downvotes;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!dataService.isAuthorized()) {
      setVoteError("Please login to vote");
      return;
    }
    
    try {
      setVoting(true);
      setVoteError("");
      await dataService.upvoteComment(postId, comment.id);
      onVote();
    } catch (err: any) {
      setVoteError(err.message || "Failed to upvote");
      console.error("Error upvoting:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!dataService.isAuthorized()) {
      setVoteError("Please login to vote");
      return;
    }
    
    try {
      setVoting(true);
      setVoteError("");
      await dataService.downvoteComment(postId, comment.id);
      onVote();
    } catch (err: any) {
      setVoteError(err.message || "Failed to downvote");
      console.error("Error downvoting:", err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="comment">
      <div className="commentHeader">
        <strong>{comment.author}</strong>
        {comment.createdAt && (
          <span className="commentDate">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="commentContent">{comment.content}</div>
      
      <div className="commentVoting">
        <div className="voteButtons">
          <button
            onClick={handleUpvote}
            disabled={voting || !dataService.isAuthorized()}
            className={`voteButton upvoteButton ${hasUpvoted ? 'active' : ''}`}
            title="Upvote"
            aria-label="Upvote comment"
          >
            ▲
          </button>
          <span className="voteScore" title={`${upvotes} upvotes, ${downvotes} downvotes`}>
            {netScore > 0 ? '+' : ''}{netScore}
          </span>
          <button
            onClick={handleDownvote}
            disabled={voting || !dataService.isAuthorized()}
            className={`voteButton downvoteButton ${hasDownvoted ? 'active' : ''}`}
            title="Downvote"
            aria-label="Downvote comment"
          >
            ▼
          </button>
        </div>
        {voteError && <span className="voteError">{voteError}</span>}
      </div>
    </div>
  );
}

interface BlogPostDetailProps {
  dataService: DataService;
}

export default function BlogPostDetail({ dataService }: BlogPostDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [commentText, setCommentText] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [voting, setVoting] = useState<boolean>(false);

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
          <div className="postTitleSection">
            <h1>{post.title}</h1>
            {/* Post Voting */}
            <div className="postVotingDetail">
              <button
                onClick={async () => {
                  if (!dataService.isAuthorized()) return;
                  try {
                    setVoting(true);
                    await dataService.upvotePost(id!);
                    const updatedPost = await dataService.getBlogPostById(id!);
                    setPost(updatedPost);
                  } catch (err: any) {
                    console.error("Error upvoting:", err);
                  } finally {
                    setVoting(false);
                  }
                }}
                disabled={voting || !dataService.isAuthorized()}
                className={`voteButton upvoteButton ${post.upvotedBy?.includes((dataService as any).authService?.getUserName() || '') ? 'active' : ''}`}
                title="Upvote"
                aria-label="Upvote post"
              >
                ▲
              </button>
              <span className="voteScore" title={`${post.upvotes ?? 0} upvotes, ${post.downvotes ?? 0} downvotes`}>
                {((post.upvotes ?? 0) - (post.downvotes ?? 0)) > 0 ? '+' : ''}{(post.upvotes ?? 0) - (post.downvotes ?? 0)}
              </span>
              <button
                onClick={async () => {
                  if (!dataService.isAuthorized()) return;
                  try {
                    setVoting(true);
                    await dataService.downvotePost(id!);
                    const updatedPost = await dataService.getBlogPostById(id!);
                    setPost(updatedPost);
                  } catch (err: any) {
                    console.error("Error downvoting:", err);
                  } finally {
                    setVoting(false);
                  }
                }}
                disabled={voting || !dataService.isAuthorized()}
                className={`voteButton downvoteButton ${post.downvotedBy?.includes((dataService as any).authService?.getUserName() || '') ? 'active' : ''}`}
                title="Downvote"
                aria-label="Downvote post"
              >
                ▼
              </button>
            </div>
          </div>
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
          <span className="postAuthor">By {post.authorId}</span>
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
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                postId={id!}
                dataService={dataService}
                onVote={() => {
                  // Refresh the post to get updated vote counts
                  dataService.getBlogPostById(id!).then(updatedPost => {
                    setPost(updatedPost);
                  }).catch(err => {
                    console.error('Error refreshing post after vote:', err);
                  });
                }}
              />
            ))
          ) : (
            <p className="noComments">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </section>
    </div>
  );
}


