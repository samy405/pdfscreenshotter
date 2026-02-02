import { useCallback, useEffect, useRef } from 'react';
import type { TextNoteAnnotation } from '../types';
import styles from './TextEditOverlay.module.css';

type Props = {
  annotation: TextNoteAnnotation;
  scaleX: number;
  scaleY: number;
  onFinish: (text: string) => void;
  onCancel: () => void;
};

export function TextEditOverlay({
  annotation,
  scaleX,
  scaleY,
  onFinish,
  onCancel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleBlur = useCallback(() => {
    const text = textareaRef.current?.value ?? '';
    onFinish(text);
  }, [onFinish]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textareaRef.current?.value ?? '';
        onFinish(text);
      }
    },
    [onFinish, onCancel]
  );

  const left = annotation.x * scaleX;
  const top = annotation.y * scaleY;
  const width = annotation.width * scaleX;
  const height = annotation.height * scaleY;

  // Use the annotation's color for the editor to match final render
  const textColor = annotation.color || '#000';

  return (
    <textarea
      ref={textareaRef}
      className={styles.textEditOverlay}
      style={{
        left,
        top,
        width,
        height,
        color: textColor,
        caretColor: textColor,
      }}
      placeholder="Type here…"
      defaultValue={annotation.text}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
