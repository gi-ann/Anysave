import React, { useRef, useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';

interface SmartNoteInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // We inherit all standard textarea props
}

export const SmartNoteInput: React.FC<SmartNoteInputProps> = ({
  value = "",
  onChange,
  onKeyDown,
  onSelect,
  onMouseUp,
  onKeyUp,
  className = "",
  style,
  ...props
}) => {
  const { bookmarks } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  // Extract all unique hashtags from bookmarks
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bookmarks.forEach(b => {
      if (b.note) {
        const matches = b.note.match(/#[\w]+/g);
        if (matches) {
          matches.forEach(m => tags.add(m));
        }
      }
    });
    return Array.from(tags);
  }, [bookmarks]);

  // Update cursor position safely
  const updateCursor = (e?: any) => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
    if (e) {
      if (e.type === 'select' && onSelect) onSelect(e);
      if (e.type === 'mouseup' && onMouseUp) onMouseUp(e);
      if (e.type === 'keyup' && onKeyUp) onKeyUp(e);
    }
  };

  const stringValue = String(value);

  // Determine if we have an active autocomplete suggestion
  const activeSuggestion = useMemo(() => {
    if (cursorPos === null || cursorPos === undefined) return null;
    
    const textBeforeCursor = stringValue.slice(0, cursorPos);
    // Find if the cursor is immediately after a hashtag
    const match = textBeforeCursor.match(/(?:^|\s)(#[\w]+)$/);
    
    if (match) {
      const currentWord = match[1];
      // Find the first matching tag that is longer than what's typed
      const suggestion = allTags.find(t => 
        t.toLowerCase().startsWith(currentWord.toLowerCase()) && 
        t.length > currentWord.length
      );
      
      if (suggestion) {
        return {
          currentWord,
          remaining: suggestion.slice(currentWord.length)
        };
      }
    }
    return null;
  }, [stringValue, cursorPos, allTags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete on Tab or ArrowRight if suggestion exists
    if ((e.key === "Tab" || e.key === "ArrowRight") && activeSuggestion) {
      e.preventDefault();
      const textBeforeCursor = stringValue.slice(0, cursorPos!);
      const textAfterCursor = stringValue.slice(cursorPos!);
      const newText = textBeforeCursor + activeSuggestion.remaining + textAfterCursor;
      
      // Programmatically trigger native change event so React picks it up
      if (textareaRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(textareaRef.current, newText);
        const ev = new Event('input', { bubbles: true });
        textareaRef.current.dispatchEvent(ev);
        
        // Move cursor to the end of the newly completed tag
        setTimeout(() => {
          const newPos = cursorPos! + activeSuggestion.remaining.length;
          textareaRef.current?.setSelectionRange(newPos, newPos);
          setCursorPos(newPos);
        }, 0);
      }
      return;
    }
    
    // Pass original event if present
    if (onKeyDown) onKeyDown(e);
  };

  const inputClassNames = "w-full h-full bg-transparent text-white focus:outline-none resize-none m-0 border-none font-[inherit] text-[inherit] leading-[inherit] tracking-[inherit] " + className;

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      {/* 
        Background Mirror Div 
      */}
      <div 
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-transparent ${inputClassNames}`}
      >
        {activeSuggestion ? (
          <>
            <span>{stringValue.slice(0, cursorPos!)}</span>
            <AnimatedGradientText 
              speed={1.5} 
              colorFrom="#ffaa40" 
              colorTo="#9c40ff" 
              className="inline-block relative !bg-clip-text text-transparent"
            >
              <span className="absolute left-0 top-0 whitespace-pre pointer-events-none text-[inherit] font-[inherit]">
                {activeSuggestion.remaining}
              </span>
            </AnimatedGradientText>
            <span>{stringValue.slice(cursorPos!)}</span>
          </>
        ) : (
          <span>{stringValue}</span>
        )}
      </div>
      
      {/* Foreground Real Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onSelect={updateCursor}
        onMouseUp={updateCursor}
        onKeyUp={updateCursor}
        onClick={updateCursor}
        className={`absolute inset-0 ${inputClassNames}`}
        {...props}
      />
    </div>
  );
};

export default SmartNoteInput;
