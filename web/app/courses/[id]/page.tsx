import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default function CoursePage({ params }: PageProps) {
  if (!/^\d+$/.test(params.id) || Number(params.id) <= 0) notFound();
  redirect('/?courseCode=' + encodeURIComponent(params.id));
}
