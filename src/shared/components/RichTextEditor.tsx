import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import "@/styles/ckeditor-custom.css";

type Props = Readonly<{
  initialContent: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  outputMode?: "html" | "text";
}>;

type ToolbarButtonProps = Readonly<{
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>;

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, active = false, disabled = false, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={["rte-toolbar-button", active ? "is-active" : ""].filter(Boolean).join(" ")}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

const textToTiptapContent = (content: string) => ({
  type: "doc",
  content: content
    .split(/\r?\n/)
    .map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
});

const RichTextEditor: React.FC<Props> = ({
  initialContent = "",
  onChange,
  placeholder = "Start typing...",
  className,
  disabled = false,
  minHeight = "400px",
  outputMode = "html",
}) => {
  const lastEmittedRef = React.useRef(initialContent);
  // Guards onUpdate against transient events fired while we programmatically
  // replace the document (Tiptap 3 can emit an "empty" update mid-transaction
  // even with emitUpdate:false), which would clobber the parent's value.
  const settingContentRef = React.useRef(false);
  // Tiptap emits one "empty" onUpdate on editor creation; ignore updates until
  // the first render tick has passed so that mount-time event can't reset the
  // parent's value before hydration.
  const readyRef = React.useRef(false);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content:
      outputMode === "text" ? textToTiptapContent(initialContent) : initialContent,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rte-image",
        },
      }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: {
      attributes: {
        class: "rte-content",
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (settingContentRef.current || !readyRef.current) return;
      const content = activeEditor.isEmpty
        ? ""
        : outputMode === "text"
          ? activeEditor.getText({ blockSeparator: "\n" })
          : activeEditor.getHTML();
      lastEmittedRef.current = content;
      onChange(content);
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  React.useEffect(() => {
    if (!editor) return;
    const id = window.setTimeout(() => {
      readyRef.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, [editor]);

  React.useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty
      ? ""
      : outputMode === "text"
        ? editor.getText({ blockSeparator: "\n" })
        : editor.getHTML();
    if (initialContent !== current) {
      settingContentRef.current = true;
      editor.commands.setContent(
        outputMode === "text"
          ? textToTiptapContent(initialContent)
          : initialContent,
        { emitUpdate: false },
      );
      lastEmittedRef.current = initialContent;
      queueMicrotask(() => {
        settingContentRef.current = false;
      });
    }
  }, [editor, initialContent, outputMode]);

  const setLink = React.useCallback(() => {
    if (!editor) return;
    const currentUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", currentUrl ?? "");

    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const insertImage = React.useCallback(() => {
    if (!editor) return;
    const src = window.prompt("Enter image URL");
    if (!src?.trim()) return;
    editor.chain().focus().setImage({ src: src.trim() }).run();
  }, [editor]);

  const toolbarDisabled = disabled || !editor;

  return (
    <div className={["ckeditor-wrapper", "rte-wrapper", className].filter(Boolean).join(" ")}>
      <div className="rte-toolbar" aria-label="Rich text formatting toolbar">
        <ToolbarButton
          label="Undo"
          disabled={toolbarDisabled || !editor?.can().chain().focus().undo().run()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={toolbarDisabled || !editor?.can().chain().focus().redo().run()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>
        <span className="rte-toolbar-divider" />
        <ToolbarButton
          label="Heading 1"
          active={editor?.isActive("heading", { level: 1 })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor?.isActive("heading", { level: 2 })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor?.isActive("heading", { level: 3 })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <span className="rte-toolbar-divider" />
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive("underline")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor?.isActive("strike")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor?.isActive("code")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code size={16} />
        </ToolbarButton>
        <span className="rte-toolbar-divider" />
        <ToolbarButton
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Block quote"
          active={editor?.isActive("blockquote")}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolbarButton>
        <span className="rte-toolbar-divider" />
        <ToolbarButton
          label="Align left"
          active={editor?.isActive({ textAlign: "left" })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor?.isActive({ textAlign: "center" })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor?.isActive({ textAlign: "right" })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <span className="rte-toolbar-divider" />
        <ToolbarButton
          label="Link"
          active={editor?.isActive("link")}
          disabled={toolbarDisabled}
          onClick={setLink}
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Image" disabled={toolbarDisabled} onClick={insertImage}>
          <ImageIcon size={16} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
