import { Result } from "@/data/client/models";
import JsonView from "@uiw/react-json-view";
import Markdown from "react-markdown";
import styles from './chat.module.css'
import remarkGfm from "remark-gfm";
import DataLoader from "./data-loader";
import { useTranslation } from "react-i18next";
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';
import { useTheme } from "next-themes";


export function RenderResult({ result }: { result: Result | undefined}) {

    const { t } = useTranslation();

    const { theme, systemTheme } = useTheme();
    const currentTheme = (theme === 'system' ? systemTheme : theme)


    if (!result) {
        return <DataLoader />;
    }

    if (result.format === 'JSON') {
        return <JsonView style={currentTheme === 'dark' ? githubDarkTheme : githubLightTheme } value={JSON.parse(result.content ?? '{}')} />;
    }

    if (result.format === 'markdown') {
        return <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{result.content}</Markdown>;
    }

    return result.content ? (<Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{result.content}</Markdown>) : (<div>{t('No content saved in this result.')}</div>);

}