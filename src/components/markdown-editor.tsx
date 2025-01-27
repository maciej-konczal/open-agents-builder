'use client'

import { MDXEditor } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

import { forwardRef } from "react"
import { type MDXEditorMethods, type MDXEditorProps } from '@mdxeditor/editor'

export interface ExtendedMDXEditorProps extends MDXEditorProps {
  diffMarkdown: string;
}
import dynamic from 'next/dynamic'

// This is the only place InitializedMDXEditor is imported directly.
const Editor = dynamic(() => import('./initialize-mdxeditor'), {
  // Make sure we turn SSR off
  ssr: false
})
export const MarkdownEditor = forwardRef<MDXEditorMethods, ExtendedMDXEditorProps>((props, ref) => <Editor {...props} editorRef={ref} />)

// TS complains without the following line
MarkdownEditor.displayName = 'MarkdownEditor'