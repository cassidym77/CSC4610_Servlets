import { Link } from "react-router-dom";
import { CourseEntry } from "./model/model";
import './BlogPostComponent.css';

interface BlogPostComponentProps {
  post: CourseEntry;
}

export default function BlogPostComponent({ post }: BlogPostComponentProps) {
  // Get preview of content (first 150 characters)
  const contentPreview = post.content 
    ? (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content)
    : '';

  return (
    <div className="blogPostComponent">
      <Link to={`/blog/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h3 className="blogPostTitle">{post.title || post.course_name}</h3>
        <p className="blogPostPreview">{contentPreview}</p>
        <div className="blogPostMeta">
          <span className="blogPostCode">{post.course_code}</span>
        </div>
      </Link>
    </div>
  );
}


