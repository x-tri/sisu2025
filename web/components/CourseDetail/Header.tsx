import styles from './CourseDetail.module.css';

interface HeaderProps {
    course: {
        name: string;
        degree: string;
        university: string;
        campus: string;
        city: string;
        state: string;
        schedule: string;
        code: number;
    }
}

export default function CourseHeader({ course }: HeaderProps) {
    return (
        <div className={styles.header}>
            <div className="container">
                <div className={styles.university}>
                    {course.university} - {course.campus}
                </div>
                <h1 className={styles.title}>
                    {course.name} <span style={{ fontWeight: 400, color: '#6b7280' }}>({course.degree})</span>
                </h1>
                <div className={styles.badges}>
                    <span className={styles.badge}>{course.city} - {course.state}</span>
                    <span className={styles.badge}>{course.schedule}</span>
                    <span className={styles.badge}>Código: {course.code}</span>
                </div>
            </div>
        </div>
    );
}
