import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentHighlight = Mark.create({
  name: "commentHighlight",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, { class: "comment-highlight" }),
      0,
    ];
  },
});
