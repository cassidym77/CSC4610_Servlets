import genericImage from "../../assets/generic-photo.jpg";
import { CourseEntry } from "../model/model";
import './CourseComponent.css';

interface CourseComponentProps extends CourseEntry {
  enrollCourse: (courseId: string, course_code: string) => void;
}

export default function CourseComponent(props: CourseComponentProps) {
  function renderImage() {
    if (props.photoUrl) {
      return <img src={props.photoUrl}/>;
    } else {
      return <img src={genericImage}/>;
    }
  }

  return (
    <div className="courseComponent">
      {renderImage()}
      <label className="code">{props.course_code}</label>
      <br />
      <label className="name">{props.course_name}</label>
      <br />
      <button onClick={() => props.enrollCourse(props.id, props.course_code)}>Enroll</button>
    </div>
  );
}
