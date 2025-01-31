import { Result } from "@/data/client/models";
import JsonView from "@uiw/react-json-view";
import Markdown from "react-markdown";
import styles from './chat.module.css'
import remarkGfm from "remark-gfm";
import DataLoader from "./data-loader";
import { useTranslation } from "react-i18next";

export function RenderResult({ result }: { result: Result | undefined}) {

    const { t } = useTranslation();

    if (!result) {
        return <DataLoader />;
    }

    if (result.format === 'JSON') {
        return <JsonView value={JSON.parse(result.content ?? '{}')} />;
    }

    if (result.format === 'markdown') {
        return <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{result.content}</Markdown>;
    }

    return result.content ? (<div>{result.content}</div>) : (<div>{t('No content saved in this result.')}</div>);

}