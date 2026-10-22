import { X_CHAR_LIMIT } from "@/lib/types";

/** Turns database rule violations into messages people can act on. */
export function friendlyDbError(message: string): string {
  if (message.includes("content_copy_x_chars")) {
    return `This post's X copy is over ${X_CHAR_LIMIT} characters. Edit the post and shorten the X copy first.`;
  }
  if (message.includes("content_images_check") || message.includes("array_length(images")) {
    return "A post can have at most 4 images.";
  }
  return message;
}
