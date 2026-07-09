import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";

interface Comment {
  id: number;
  content: string;
  authorId: number;
  author?: { name?: string; email?: string };
  position?: number | null;
  selectionEnd?: number | null;
  resolved: number;
  createdAt: Date;
  updatedAt: Date;
}

interface InlineCommentsProps {
  comments: Comment[];
  currentUserId?: number;
  onAddComment?: (content: string) => Promise<any>;
  onResolveComment?: (commentId: number) => Promise<any>;
  onDeleteComment?: (commentId: number) => Promise<any>;
}

export default function InlineComments({
  comments,
  currentUserId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: InlineCommentsProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newCommentText.trim() || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText);
      setNewCommentText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unresolvedComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  return (
    <div className="space-y-6">
      {/* Add new comment */}
      {onAddComment && (
        <div className="editorial-card">
          <h4 className="text-sm font-semibold mb-3">Add a comment</h4>
          <Textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Share your thoughts or suggestions..."
            className="mb-3 min-h-24"
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!newCommentText.trim() || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      )}

      {/* Unresolved comments */}
      {unresolvedComments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">
            Comments ({unresolvedComments.length})
          </h4>
          {unresolvedComments.map((comment) => (
            <div key={comment.id} className="editorial-card border-l-4 border-accent">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {comment.author?.name || comment.author?.email || "Anonymous"}
                  </p>
                  <p className="text-xs editorial-meta">
                    {comment.position != null
                      ? "Inline comment · "
                      : ""}
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      locale: vi,
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {currentUserId === comment.authorId && (
                  <div className="flex gap-1">
                    {onResolveComment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResolveComment(comment.id)}
                        title="Mark as resolved"
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {onDeleteComment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this comment?")) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        title="Delete comment"
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resolved comments */}
      {resolvedComments.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
            Resolved ({resolvedComments.length})
          </summary>
          <div className="mt-3 space-y-3">
            {resolvedComments.map((comment) => (
              <div
                key={comment.id}
                className="editorial-card opacity-60 border-l-4 border-muted"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-sm line-through">
                      {comment.author?.name || comment.author?.email || "Anonymous"}
                    </p>
                    <p className="text-xs editorial-meta">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        locale: vi,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed line-through">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty state */}
      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}
