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
  );
}


