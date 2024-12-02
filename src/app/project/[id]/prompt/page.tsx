import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projects } from '@/lib/data/projects';

export function generateStaticParams() {
  return projects.map((project) => ({
    id: project.id,
  }));
}

export default function PromptPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prompt Configuration</h1>
      <Card>
        <CardHeader>
          <CardTitle>Prompt Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Configure your project prompts here.</p>
        </CardContent>
      </Card>
    </div>
  );
}