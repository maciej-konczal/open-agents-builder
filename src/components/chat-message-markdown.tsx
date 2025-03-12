import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from './chat.module.css';
import ZoomableImage from "./zoomable-image";
import { cn } from "@/lib/utils";

export function ChatMessageMarkdown({ children, className = '' }) {
    return (
        <Markdown className={cn(styles.markdown, className)} remarkPlugins={[remarkGfm]} components={
            {
                img(props) {
//                    if (props.alt?.startsWith('product')) {
                        return <ZoomableImage src={props.src} width={100} height={100} className="border" />
  //                  } else {
  //                      return <img {...props} />
//                 }
                }
            }
        }>
            {children}
        </Markdown>
    )
}
