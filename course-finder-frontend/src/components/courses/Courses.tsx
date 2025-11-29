import { useState, useEffect } from "react";
import CourseComponent from "./CourseComponent";
import { DataService } from "../../services/DataService";
import { NavLink } from "react-router-dom";
import { CourseEntry } from "../model/model";

interface CoursesProps {
    dataService: DataService
}

export default function Courses(props: CoursesProps){

    const [courses, setCourses] = useState<CourseEntry[]>();
    const [reservationText, setReservationText] = useState<string>();

    useEffect(()=>{
        const getCourses = async ()=>{
            console.log('getting courses....')
            const courses = await props.dataService.getCourses();
            setCourses(courses);
        }
        getCourses();
    }, [])

    async function enrollCourse(courseId: string, course_code: string){
        const enrollmentResult = await props.dataService.enrollCourse(courseId);
        setReservationText(`You enrolled in ${course_code}, enrollment id: ${enrollmentResult}`);
    }

    function renderCourses(){
        if(!props.dataService.isAuthorized()) {
            return<NavLink to={"/login"}>Please login</NavLink>
        }
        const rows: any[] = [];
        if(courses) {
            for(const courseEntry of courses) {
                rows.push(
                    <CourseComponent 
                        key={courseEntry.id}
                        id={courseEntry.id}
                        course_code={courseEntry.course_code}
                        course_name={courseEntry.course_name}
                        photoUrl={courseEntry.photoUrl}
                        enrollCourse={enrollCourse}
                    />
                )
            }
        }

        return rows;
    }

    return (
        <div>
            <h2>Welcome to the Courses page!</h2>
            {reservationText? <h2>{reservationText}</h2>: undefined}
            {renderCourses()}
        </div>
    )        
    

}