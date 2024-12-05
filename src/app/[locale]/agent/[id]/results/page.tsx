import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projects } from '@/lib/data/projects';

export function generateStaticParams() {
  return projects.map((project) => ({
    id: project.id,
  }));
}

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Results</h1>
      <Card>
        <CardHeader>
          <CardTitle>Agent Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p>View your project results here.</p>
        </CardContent>
      </Card>
    </div>
  );
}