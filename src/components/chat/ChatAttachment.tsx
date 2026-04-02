import { X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatAttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}

export const ChatAttachmentPreview = ({ file, previewUrl, onRemove }: ChatAttachmentPreviewProps) => {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative inline-flex items-center gap-2 p-2 bg-muted rounded-lg border max-w-[200px]">
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-16 w-16 object-cover rounded" />
      ) : (
        <div className="h-16 w-16 bg-muted-foreground/10 rounded flex items-center justify-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

interface ChatMessageAttachmentProps {
  url: string;
  fileName: string;
  fileType: string;
}

export const ChatMessageAttachment = ({ url, fileName, fileType }: ChatMessageAttachmentProps) => {
  const isImage = fileType.startsWith("image/");

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt={fileName} className="max-w-[300px] max-h-[200px] rounded-lg object-cover border" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded border hover:bg-background/80 transition-colors"
    >
      <FileText className="h-5 w-5 text-primary" />
      <span className="text-sm underline truncate">{fileName}</span>
    </a>
  );
};
