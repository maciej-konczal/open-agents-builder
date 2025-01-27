'use client'

import { MDXEditor } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

import { forwardRef } from "react"
import { type MDXEditorMethods, type MDXEditorProps} from '@mdxeditor/editor'
import dynamic from 'next/dynamic'

// This is the only place InitializedMDXEditor is imported directly.
const Editor = dynamic(() => import('./initialize-mdxeditor'), {
  // Make sure we turn SSR off
  ssr: false
})


// This is what is imported by other components. Pre-initialized with plugins, and ready
// to accept other props, including a ref.
export const MarkdownEditor = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => <Editor {...props} editorRef={ref} />)

// TS complains without the following line
MarkdownEditor.displayName = 'MarkdownEditor'