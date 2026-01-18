import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CourseDetailView from '@/components/CourseDetail/CourseDetailView';
import ScoreDrawer from '@/components/ScoreDrawer';

interface PageProps {
    params: {
        id: string;
    }
}

// Revalidate every hour
export const revalidate = 3600;

export default async function CoursePage({ params }: PageProps) {
    const code = parseInt(params.id);

    if (isNaN(code)) {
        return notFound();
    }

    const { data: course, error } = await supabase.getFullCourseData(code);

    if (error || !course) {
        console.error("Error fetching course:", error);
        return notFound();
    }

    return (
        <>
            <ScoreDrawer />
            <CourseDetailView course={course} />
        </>
    );
}
