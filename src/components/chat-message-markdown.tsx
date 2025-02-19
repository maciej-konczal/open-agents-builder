import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from './chat.module.css';
import ZoomableImage from "./zoomable-image";

export function ChatMessageMarkdown({ children }) {
    return (
        <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]} components={
            {
                img(props) {
                    if (props.alt?.startsWith('product')) {
                        return <ZoomableImage src={props.src} width={100} height={100} className="border" />
                    } else {
                        return <img {...props} />
                    }
                }
            }
        }>
            {children}
        </Markdown>
    )
}
