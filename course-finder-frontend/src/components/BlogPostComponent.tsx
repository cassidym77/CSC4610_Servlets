import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { CourseEntry } from "./model/model";
import { DataService } from "../services/DataService";
import './BlogPostComponent.css';

interface BlogPostComponentProps {
  post: CourseEntry;
  dataService?: DataService;
  onDelete?: (postId: string) => void;
  showActions?: boolean;
}

export default function BlogPostComponent({ post, dataService, onDelete, showActions = false }: BlogPostComponentProps) {
  const navigate = useNavigate();
  
  // Get preview of content (first 150 characters)
  const contentPreview = post.content 
    ? (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content)
    : '';

  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [voting, setVoting] = useState<boolean>(false);
  const [currentPost, setCurrentPost] = useState<CourseEntry>(post);
  
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);
  
  useEffect(() => {
    const checkOwnership = async () => {
      if (dataService && showActions) {
        const owner = await dataService.isPostOwner(post);
        setIsOwner(owner);
      }
    };
    checkOwnership();
  }, [dataService, post, showActions]);
  const canShowActions = showActions && isOwner && dataService;

  const username = dataService?.isAuthorized() 
    ? (dataService as any).authService?.getUserName() 
    : null;

  const hasUpvoted = username && currentPost.upvotedBy?.includes(username);
  const hasDownvoted = username && currentPost.downvotedBy?.includes(username);
  const upvotes = currentPost.upvotes ?? 0;
  const downvotes = currentPost.downvotes ?? 0;
  const netScore = upvotes - downvotes;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dataService || !dataService.isAuthorized()) {
      return;
    }
    
    try {
      setVoting(true);
      await dataService.upvotePost(post.id);
      // Refresh post data
      const updatedPost = await dataService.getBlogPostById(post.id);
      setCurrentPost(updatedPost);
    } catch (err: any) {
      console.error("Error upvoting:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dataService || !dataService.isAuthorized()) {
      return;
    }
    
    try {
      setVoting(true);
      await dataService.downvotePost(post.id);
      // Refresh post data
      const updatedPost = await dataService.getBlogPostById(post.id);
      setCurrentPost(updatedPost);
    } catch (err: any) {
      console.error("Error downvoting:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    if (onDelete) {
      onDelete(post.id);
    } else if (dataService) {
      try {
        await dataService.deleteBlogPost(post.id);
        window.location.reload(); // Reload to refresh the list
      } catch (err: any) {
        alert(err.message || 'Failed to delete post');
      }
    }
  };

  return (
    <div className="blogPostComponent">
      <div className="blogPostContent">
        <Link to={`/blog/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="blogPostTitle">{post.title || post.course_name}</h3>
          <p className="blogPostPreview">{contentPreview}</p>
          <div className="blogPostMeta">
            <span className="blogPostCode">{post.course_code}</span>
          </div>
        </Link>
        {canShowActions && (
          <div className="postComponentActions">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/edit/${post.id}`);
              }}
              className="editButtonSmall"
            >
              Edit
            </button>
            <button 
              onClick={handleDelete}
              className="deleteButtonSmall"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="postVoting">
        <button
          onClick={handleUpvote}
          disabled={voting || !dataService?.isAuthorized()}
          className={`voteButton upvoteButton ${hasUpvoted ? 'active' : ''}`}
          title="Upvote"
          aria-label="Upvote post"
        >
          ▲
        </button>
        <span className="voteScore" title={`${upvotes} upvotes, ${downvotes} downvotes`}>
          {netScore > 0 ? '+' : ''}{netScore}
        </span>
        <button
          onClick={handleDownvote}
          disabled={voting || !dataService?.isAuthorized()}
          className={`voteButton downvoteButton ${hasDownvoted ? 'active' : ''}`}
          title="Downvote"
          aria-label="Downvote post"
        >
          ▼
        </button>
      </div>
    </div>
  );
}


