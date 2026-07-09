import { Node, mergeAttributes } from "@tiptap/core";

export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => {
          if (!attributes.noteId) return {};
          return { "data-note-id": attributes.noteId };
        },
      },
      number: {
        default: 1,
        parseHTML: (element) => Number(element.getAttribute("data-note-number") || 1),
        renderHTML: (attributes) => ({
          "data-note-number": attributes.number,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-footnote-ref]" }, { tag: "sup[data-footnote-ref]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const number = HTMLAttributes.number ?? "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-ref": "",
        class: "footnote-ref",
        title: number ? `Footnote ${number}` : "Footnote",
        contenteditable: "false",
      }),
      number
        ? ["span", { class: "footnote-ref-number" }, String(number)]
        : ["span", { class: "footnote-ref-number" }, "?"],
      ["span", { class: "footnote-notebook-icon", "aria-hidden": "true" }],
    ];
  },
});
