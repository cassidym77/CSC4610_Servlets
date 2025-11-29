import { SyntheticEvent, useState } from "react";
import { NavLink } from "react-router-dom";
import { DataService } from "../../services/DataService";

type CreateCourseProps = {
  dataService: DataService;
};

type CustomEvent = {
    target: HTMLInputElement
}

export default function CreateCourse({ dataService }: CreateCourseProps) {
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [photo, setPhoto] = useState<File | undefined>();
  const [actionResult, setActionResult] = useState<string>("");

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (code && name) {
      const id = await dataService.createCourse(code, name, photo)
      setActionResult(`Created course with id ${id}`);
      setCode('');
      setName('');
    } else {
      setActionResult('Please provide a course code and a course name!')
    }

    
  };

  function setPhotoUrl(event: CustomEvent){
    if (event.target.files && event.target.files[0]) {
        setPhoto(event.target.files[0]);
    }
  }

  function renderPhoto() {
    if (photo) {
        const localPhotoURL = URL.createObjectURL(photo)
        return <img alt='' src={localPhotoURL} style={{ maxWidth: "200px" }}/>
    }
  }

  function renderForm(){
    if (!dataService.isAuthorized()) {
      return<NavLink to={"/login"}>Please login</NavLink>
    }
    return (
      <form onSubmit={(e) => handleSubmit(e)}>
        <label>Course Code:</label><br/>
        <input value={code} onChange={(e) => setCode(e.target.value)} /><br/>
        <label>Course Name:</label><br/>
        <input value={name} onChange={(e) => setName(e.target.value)} /><br/>
        <label>Photo:</label><br/>
        <input type="file" onChange={(e) => setPhotoUrl(e)} /><br/>
        {renderPhoto()}<br/>
        <input type="submit" value='Create course'/>
      </form>
    );
  }

  return <div>
    {renderForm()}
    {actionResult? <h3>{actionResult}</h3>: undefined}
  </div>

  
}
