'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const VARIABLES = ['{{nome}}', '{{empresa}}', '{{cargo}}']

export function TemplateEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva o corpo do email...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  function insertVariable(v: string) {
    editor?.chain().focus().insertContent(v).run()
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b">
        <span className="text-xs text-zinc-500">Variáveis:</span>
        {VARIABLES.map(v => (
          <button key={v} type="button" onClick={() => insertVariable(v)}
            className="text-xs bg-zinc-200 hover:bg-zinc-300 px-2 py-0.5 rounded font-mono">
            {v}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[200px]" />
    </div>
  )
}
