'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentContext } from '@/contexts/agent-context';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/components/chat.module.css';
import JsonView from '@uiw/react-json-view';

export default function ResultsPage() {
  const agentContext = useAgentContext();
  const { t  } = useTranslation();

  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.agentResults(agentContext.current.id);
  }, [agentContext.current]);
  return (
    <div className="space-y-6">
      {agentContext.results.map((result) => (
        <Card key={result.sessionId}>
          <CardHeader>
            <CardTitle>{new Date(result.createdAt).toLocaleString()}{result.user ? result.user.name : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {result.format === 'JSON' ? (
              <JsonView value={JSON.parse(result.content ?? '{}')} />
            ) : null}
            {result.format === 'markdown' ? (
                  <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{result.content}</Markdown>
                ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}