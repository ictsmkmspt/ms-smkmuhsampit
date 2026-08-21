import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, ImagePlus, Table as TableIcon, Undo2, Redo2,
} from 'lucide-react';

// Gambar disisipkan sebagai base64 langsung di dalam HTML (bukan upload
// terpisah ke server) — paling sederhana buat implementasi awal, tanpa
// perlu endpoint/storage khusus gambar. Cukup buat 1-2 gambar per
// soal/pilihan (lihat batas max di CbtQuestionController); kalau nanti
// butuh gambar resolusi tinggi/banyak, baru layak dibuatkan upload
// terpisah seperti audio.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition ${active ? 'bg-brand-100 text-brand-700' : 'text-ink-500 hover:bg-mist-100'}`}
    >
      {children}
    </button>
  );
}

// Editor teks kaya (format/list/tabel/gambar/superscript-subscript) buat
// field Soal & Pilihan Jawaban CBT — dipakai dalam 2 ukuran: default
// (soal, toolbar lengkap + lebih tinggi) dan compact (pilihan jawaban,
// toolbar dasar saja + 1 baris supaya form tidak kepanjangan).
export default function RichTextEditor({ value, onChange, compact = false, placeholder = '' }) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3 sudah membawa Link & Underline bawaan sendiri —
      // dimatikan di sini supaya tidak dobel dengan yang diimpor terpisah
      // di bawah (yang butuh config kustom, mis. openOnClick: false untuk
      // Link). Tanpa ini TipTap warning "Duplicate extension names".
      StarterKit.configure({ link: false, underline: false }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-2 ${compact ? 'min-h-[2.5rem]' : 'min-h-[8rem]'}`,
      },
    },
  });

  if (!editor) return null;

  const sisipkanGambar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    editor.chain().focus().setImage({ src: base64 }).run();
    e.target.value = '';
  };

  const sisipkanLink = () => {
    const url = window.prompt('URL tautan:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="field-input p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line-200 bg-mist-50 px-1.5 py-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Tebal">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Miring">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Garis Bawah">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Coret">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Pangkat Atas (mis. x²)">
          <SuperscriptIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Pangkat Bawah (mis. H₂O)">
          <SubscriptIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="w-px h-4 bg-line-200 mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Daftar Poin">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Daftar Nomor">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Kutipan">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        {!compact && (
          <>
            <span className="w-px h-4 bg-line-200 mx-0.5" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Rata Kiri">
              <AlignLeft className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Rata Tengah">
              <AlignCenter className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Rata Kanan">
              <AlignRight className="w-3.5 h-3.5" />
            </ToolbarButton>
          </>
        )}
        <span className="w-px h-4 bg-line-200 mx-0.5" />
        <ToolbarButton onClick={sisipkanLink} active={editor.isActive('link')} title="Sisip Tautan">
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <label className="p-1.5 rounded-md text-ink-500 hover:bg-mist-100 transition cursor-pointer" title="Sisip Gambar">
          <ImagePlus className="w-3.5 h-3.5" />
          <input type="file" accept="image/*" onChange={sisipkanGambar} className="hidden" />
        </label>
        {!compact && (
          <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} title="Sisip Tabel">
            <TableIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
        )}
        <span className="w-px h-4 bg-line-200 mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Urungkan">
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Ulangi">
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror ul { list-style: disc; padding-left: 1.25rem; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.25rem; }
        .ProseMirror blockquote { border-left: 3px solid #E2E8F0; padding-left: 0.75rem; color: #64748b; }
        .ProseMirror img { max-width: 100%; border-radius: 6px; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
        .ProseMirror table td, .ProseMirror table th { border: 1px solid #E2E8F0; padding: 4px 8px; }
        .ProseMirror table th { background: #F8FAFC; font-weight: 600; }
        .ProseMirror a { color: #15803D; text-decoration: underline; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); color: #94a3b8; float: left; height: 0; pointer-events: none;
        }
      `}</style>
    </div>
  );
}
