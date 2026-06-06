"use client";

import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { FiBold, FiItalic, FiList, FiUnderline } from "react-icons/fi";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  normalizeRichTextForStorage,
  normalizeRichTextInput,
} from "@/lib/rich-text";

type RichTextEditorSize = "short" | "medium" | "long";

type RichTextEditorProps = {
  allowLists?: boolean;
  ariaInvalid?: boolean;
  className?: string;
  id: string;
  onChange: (value: string) => void;
  placeholder: string;
  size?: RichTextEditorSize;
  toolbarLabel: string;
  value: string;
};

type EditorToolbarState = {
  bold: boolean;
  bulletList: boolean;
  italic: boolean;
  orderedList: boolean;
  underline: boolean;
};

const emptyToolbarState: EditorToolbarState = {
  bold: false,
  bulletList: false,
  italic: false,
  orderedList: false,
  underline: false,
};

function runEditorCommand(
  editor: Editor | null,
  command: (editor: Editor) => boolean,
) {
  if (!editor) {
    return;
  }

  command(editor);
}

function getWholeDocumentListState(
  editor: Editor,
  listType: "bulletList" | "orderedList",
): { hasTargetList: boolean; hasTextOutsideTargetList: boolean } {
  let hasTargetList = false;
  let hasTextOutsideTargetList = false;

  editor.state.doc.descendants((node, position) => {
    if (node.type.name === listType) {
      hasTargetList = true;
    }

    if (!node.isText || !node.text?.trim()) {
      return true;
    }

    const resolvedPosition = editor.state.doc.resolve(position);
    let insideTargetList = false;

    for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
      if (resolvedPosition.node(depth).type.name === listType) {
        insideTargetList = true;
        break;
      }
    }

    if (!insideTargetList) {
      hasTextOutsideTargetList = true;
    }

    return true;
  });

  return { hasTargetList, hasTextOutsideTargetList };
}

function isListButtonActive(
  editor: Editor,
  listType: "bulletList" | "orderedList",
): boolean {
  if (editor.isActive(listType)) {
    return true;
  }

  const { hasTargetList, hasTextOutsideTargetList } =
    getWholeDocumentListState(editor, listType);

  return hasTargetList && !hasTextOutsideTargetList;
}

function toggleListStyle(
  editor: Editor,
  listType: "bulletList" | "orderedList",
): boolean {
  const toggleCommand = () =>
    listType === "orderedList"
      ? editor.chain().focus().toggleOrderedList().run()
      : editor.chain().focus().toggleBulletList().run();

  if (editor.isActive(listType)) {
    return toggleCommand();
  }

  const { hasTargetList, hasTextOutsideTargetList } =
    getWholeDocumentListState(editor, listType);

  if (hasTargetList && !hasTextOutsideTargetList) {
    return listType === "orderedList"
      ? editor.chain().focus().selectAll().toggleOrderedList().run()
      : editor.chain().focus().selectAll().toggleBulletList().run();
  }

  return toggleCommand();
}

export function RichTextEditor({
  allowLists = false,
  ariaInvalid = false,
  className,
  id,
  onChange,
  placeholder,
  size = "medium",
  toolbarLabel,
  value,
}: RichTextEditorProps) {
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
        bulletList: allowLists ? {} : false,
        orderedList: allowLists ? {} : false,
        listItem: allowLists ? {} : false,
        listKeymap: allowLists ? {} : false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    [allowLists, placeholder],
  );
  const editor = useEditor({
    content: normalizeRichTextInput(value),
    editorProps: {
      attributes: {
        "aria-invalid": ariaInvalid ? "true" : "false",
        "aria-label": placeholder,
        class: "rich-text-prosemirror",
        id,
      },
    },
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(normalizeRichTextForStorage(currentEditor.getHTML()));
    },
    shouldRerenderOnTransaction: false,
  });
  const toolbarState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) =>
        currentEditor
          ? {
              bold: currentEditor.isActive("bold"),
              bulletList: isListButtonActive(currentEditor, "bulletList"),
              italic: currentEditor.isActive("italic"),
              orderedList: isListButtonActive(currentEditor, "orderedList"),
              underline: currentEditor.isActive("underline"),
            }
          : emptyToolbarState,
    }) ?? emptyToolbarState;

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = normalizeRichTextInput(value);
    const currentStorageValue = normalizeRichTextForStorage(editor.getHTML());
    const nextStorageValue = normalizeRichTextForStorage(nextContent);

    if (currentStorageValue !== nextStorageValue) {
      editor.commands.setContent(nextContent || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setOptions({
      editorProps: {
        attributes: {
          "aria-invalid": ariaInvalid ? "true" : "false",
          "aria-label": placeholder,
          class: "rich-text-prosemirror",
          id,
        },
      },
    });
  }, [ariaInvalid, editor, id, placeholder]);

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (
      !(nextFocusedElement instanceof Node) ||
      !event.currentTarget.contains(nextFocusedElement)
    ) {
      setToolbarOpen(false);
    }
  };

  return (
    <div
      className={cn("rich-text-editor", ariaInvalid && "is-invalid", className)}
      data-size={size}
      onBlurCapture={handleBlurCapture}
      onFocusCapture={() => setToolbarOpen(true)}
    >
      {toolbarOpen ? (
        <div
          aria-label={toolbarLabel}
          className="admin-description-toolbar rich-text-toolbar"
          role="toolbar"
        >
          <Button
            aria-label="Bold text"
            aria-pressed={toolbarState.bold}
            className={cn(
              "admin-description-tool rich-text-toolbar-button",
              toolbarState.bold && "is-active",
            )}
            disabled={!editor}
            onClick={() =>
              runEditorCommand(editor, (currentEditor) =>
                currentEditor.chain().focus().toggleBold().run(),
              )
            }
            title="Bold"
            variant="ghost"
          >
            <FiBold aria-hidden="true" />
          </Button>
          <Button
            aria-label="Italicize text"
            aria-pressed={toolbarState.italic}
            className={cn(
              "admin-description-tool rich-text-toolbar-button",
              toolbarState.italic && "is-active",
            )}
            disabled={!editor}
            onClick={() =>
              runEditorCommand(editor, (currentEditor) =>
                currentEditor.chain().focus().toggleItalic().run(),
              )
            }
            title="Italic"
            variant="ghost"
          >
            <FiItalic aria-hidden="true" />
          </Button>
          <Button
            aria-label="Underline text"
            aria-pressed={toolbarState.underline}
            className={cn(
              "admin-description-tool rich-text-toolbar-button",
              toolbarState.underline && "is-active",
            )}
            disabled={!editor}
            onClick={() =>
              runEditorCommand(editor, (currentEditor) =>
                currentEditor.chain().focus().toggleUnderline().run(),
              )
            }
            title="Underline"
            variant="ghost"
          >
            <FiUnderline aria-hidden="true" />
          </Button>
          {allowLists ? (
            <>
              <Button
                aria-label="Toggle numbered list"
                aria-pressed={toolbarState.orderedList}
                className={cn(
                  "admin-description-tool rich-text-toolbar-button",
                  toolbarState.orderedList && "is-active",
                )}
                disabled={!editor}
                onClick={() =>
                  runEditorCommand(editor, (currentEditor) =>
                    toggleListStyle(currentEditor, "orderedList"),
                  )
                }
                title="Toggle numbered list"
                variant="ghost"
              >
                <span aria-hidden="true" className="admin-description-number-icon">
                  1.
                </span>
              </Button>
              <Button
                aria-label="Toggle bulleted list"
                aria-pressed={toolbarState.bulletList}
                className={cn(
                  "admin-description-tool rich-text-toolbar-button",
                  toolbarState.bulletList && "is-active",
                )}
                disabled={!editor}
                onClick={() =>
                  runEditorCommand(editor, (currentEditor) =>
                    toggleListStyle(currentEditor, "bulletList"),
                  )
                }
                title="Toggle bulleted list"
                variant="ghost"
              >
                <FiList aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      <EditorContent
        className="rich-text-content"
        editor={editor}
      />
    </div>
  );
}
