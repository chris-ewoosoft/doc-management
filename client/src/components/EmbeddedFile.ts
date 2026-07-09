import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import EmbeddedFileView from "./EmbeddedFileView";

export const EmbeddedFile = Node.create({
  name: "embeddedFile",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-url"),
      },
      fileName: {
        default: "document",
        parseHTML: (element) => element.getAttribute("data-file-name"),
      },
      mimeType: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mime-type"),
      },
      fileType: {
        default: "pdf",
        parseHTML: (element) => element.getAttribute("data-file-type") || "pdf",
      },
      embeddedId: {
        default: () => (typeof crypto !== "undefined" ? crypto.randomUUID() : `emb-${Date.now()}`),
        parseHTML: (element) => element.getAttribute("data-embedded-id"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embedded-file]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-embedded-file": "",
        "data-url": node.attrs.url,
        "data-file-name": node.attrs.fileName,
        "data-mime-type": node.attrs.mimeType,
        "data-file-type": node.attrs.fileType,
        "data-embedded-id": node.attrs.embeddedId,
        class: "embedded-file-placeholder",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbeddedFileView);
  },
});
