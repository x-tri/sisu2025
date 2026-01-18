import styles from './CourseCard.module.css';

interface CourseProps {
    name: string;
    degree: string;
    university: string;
    university_abbr: string;
    campus: string;
    city: string;
    state: string;
    schedule: string;
    cut_score: number;
}

export default function CourseCard({
    name, degree, university, university_abbr, campus, city, state, schedule, cut_score
}: CourseProps) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.courseName}>
                        {name}
                        <span className={styles.degree}>{degree}</span>
                    </h3>
                    <div className={styles.university}>
                        <span>{university_abbr}</span> | {university}
                    </div>
                </div>
            </div>

            <div className={styles.metadata}>
                <span className={styles.tag}>{campus}</span>
                <span className={styles.tag}>{city} - {state}</span>
                <span className={styles.tag}>{schedule}</span>
                <span className={`${styles.tag} ${styles.highlight}`}>Maior peso: Redação (2)</span>
            </div>

            <div className={styles.footer}>
                <span className={styles.cutLabel}>Nota de Corte (Ampla)</span>
                <span className={styles.cutScore}>
                    {cut_score.toFixed(2)}
                </span>
            </div>
        </div>
    );
}
