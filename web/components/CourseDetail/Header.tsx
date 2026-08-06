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
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <span className={styles.headerEyebrow}>Detalhes da oferta</span>
                <div className={styles.university}>
                    {[course.university, course.campus].filter(Boolean).join(' · ')}
                </div>
                <h2 className={styles.title}>
                    {course.name}
                    {course.degree && <span className={styles.degree}> {course.degree}</span>}
                </h2>
                <div className={styles.badges} aria-label="Dados da oferta">
                    {(course.city || course.state) && (
                        <span className={styles.badge}>
                            {[course.city, course.state].filter(Boolean).join(' — ')}
                        </span>
                    )}
                    {course.schedule && <span className={styles.badge}>{course.schedule}</span>}
                    <span className={styles.badge}>Código {course.code}</span>
                </div>
            </div>
        </header>
    );
}
