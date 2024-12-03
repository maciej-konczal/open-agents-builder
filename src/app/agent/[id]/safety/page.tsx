import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projects } from '@/lib/data/projects';

export function generateStaticParams() {
  return projects.map((project) => ({
    id: project.id,
  }));
}

export default function SafetyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Safety Rules</h1>
      <Card>
        <CardHeader>
          <CardTitle>Safety Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Configure your project safety rules here.</p>
        </CardContent>
      </Card>
    </div>
  );
}