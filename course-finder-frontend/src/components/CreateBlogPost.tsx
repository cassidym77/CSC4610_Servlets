import { SyntheticEvent, useState } from "react";
import { NavLink } from "react-router-dom";
import { DataService } from "../services/DataService";

type CreateBlogPostProps = {
  dataService: DataService;
};

export default function CreateBlogPost({ dataService }: CreateBlogPostProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [actionResult, setActionResult] = useState<string>("");

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (title && content) {
      try {
        const id = await dataService.createBlogPost(title, content, isPublic);
        setActionResult(`Created blog post with id ${id}`);
        setTitle('');
        setContent('');
        setIsPublic(true);
      } catch (error) {
        setActionResult('Error creating blog post. Please try again.');
      }
    } else {
      setActionResult('Please provide both a title and content!');
    }
  };

  function renderForm(){
    if (!dataService.isAuthorized()) {
      return <NavLink to={"/login"}>Please login</NavLink>;
    }
    return (
      <form onSubmit={(e) => handleSubmit(e)}>
        <label>Title:</label><br/>
        <input 
          type="text"
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", maxWidth: "500px" }}
        /><br/><br/>
        <label>Content:</label><br/>
        <textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          style={{ width: "100%", maxWidth: "500px" }}
        /><br/><br/>
        <label>
          <input 
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this post public (visible to other users)
        </label><br/><br/>
        <input type="submit" value='Create Post'/>
      </form>
    );
  }

  return (
    <div>
      <h1>Create Blog Post</h1>
      {renderForm()}
      {actionResult ? <h3>{actionResult}</h3> : undefined}
    </div>
  );
}

