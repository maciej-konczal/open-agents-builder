'use client'
// InitializedMDXEditor.tsx
import type { ForwardedRef } from 'react'
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  tablePlugin,
  InsertTable,
  InsertCodeBlock,
  InsertImage,
  codeBlockPlugin,
  imagePlugin,
  ListsToggle,
  SandpackConfig,
  codeMirrorPlugin,
  sandpackPlugin,
  ConditionalContents,
  InsertSandpack,
  linkPlugin,
  linkDialogPlugin,
  DiffSourceToggleWrapper,
  diffSourcePlugin,
  ChangeCodeMirrorLanguage,
  ShowSandpackInfo
} from '@mdxeditor/editor'
import { ExtendedMDXEditorProps } from './markdown-editor'
import styles from './markdown-editor.module.css'
import markdownStyles from './chat.module.css'
import { useTheme } from 'next-themes'



const simpleSandpackConfig: SandpackConfig = {
    defaultPreset: 'json',
    presets: [
      {
        label: 'JSON',
        name: 'json',
        meta: 'live json',
        sandpackTemplate: 'react',
        sandpackTheme: 'light',
        snippetFileName: '/App.js',
        snippetLanguage: 'json',
        initialSnippetContent: '{}'
      }
    ]
  }
  

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & ExtendedMDXEditorProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = (theme === 'system' ? systemTheme : theme)

  
  if (typeof props.markdown === 'undefined') {
    props.markdown = ''
  }

  return (
    <MDXEditor
      className={currentTheme === 'dark' ? styles['dark-editor'] : ''}
      contentEditableClassName={markdownStyles['markdown']} 
      plugins={[
        // Example Plugin Usage
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
        codeMirrorPlugin({ codeBlockLanguages: { js: 'JSON', xml: 'XML', yaml: 'YAML' } }),
        diffSourcePlugin(
            {
                diffMarkdown: props.diffMarkdown
            }
        ),
        imagePlugin(),
        listsPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
            toolbarClassName: 'my-classname',
            toolbarContents: () => (
              <>
                {' '}      
                <UndoRedo />
                <InsertTable />
                <ConditionalContents
              options={[
                { when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> },
                {
                  fallback: () => (
                    <>
                      <InsertCodeBlock />
                    </>
                  )
                }
              ]}
            />  
                <InsertImage />
                <ListsToggle />
                <BoldItalicUnderlineToggles />
                <DiffSourceToggleWrapper>
                 <UndoRedo />
                </DiffSourceToggleWrapper>                          
              </>
            )
          })        
      ]}
      {...props}
      ref={editorRef}
    />
  )
}