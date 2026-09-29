import React, { useState, KeyboardEvent, useId } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { DEFAULT_SUGGESTED_TAGS } from '../types/gtd';

interface TagInputProps {
  tags?: string[];
  onChange: (tags: string[]) => void;
  suggestedTags?: string[];
  placeholder?: string;
  label?: string;
  helpText?: string;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags = [],
  onChange,
  suggestedTags = DEFAULT_SUGGESTED_TAGS,
  placeholder = 'Add tag (e.g. @computer, urgent, deep-work)...',
  label = 'Tags (Optional)',
  helpText = 'Press Enter or comma to add multiple tags',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputId = useId();

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;

    // Check case-insensitive duplicate
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      handleRemoveTag(tags.length - 1);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // Filter suggested tags that are not yet selected
  const availableSuggestions = suggestedTags.filter(
    (sug) => !tags.some((t) => t.toLowerCase() === sug.toLowerCase())
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#C5A47E]" />
            <span>{label}</span>
          </label>
          {tags.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {tags.length} tag{tags.length === 1 ? '' : 's'} selected
            </span>
          )}
        </div>
      )}

      {/* Main Tag Input Container */}
      <div className="min-h-[42px] px-3 py-2 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 focus-within:border-[#C5A47E] transition-colors flex flex-wrap items-center gap-1.5">
        {/* Selected Tag Badges */}
        {tags.map((tag, index) => {
          const isContextTag = tag.startsWith('@');
          return (
            <span
              key={`${tag}-${index}`}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border animate-fadeIn transition-colors ${
                isContextTag
                  ? 'bg-[#C5A47E]/15 text-[#E0C7A8] border-[#C5A47E]/40'
                  : 'bg-[#262626] text-gray-200 border-[#383838]'
              }`}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-black/30 transition-colors cursor-pointer"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}

        {/* Input Field */}
        <div className="flex-1 min-w-[140px] flex items-center gap-1">
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                handleAddTag(inputValue);
              }
            }}
            placeholder={tags.length === 0 ? placeholder : 'Add another tag...'}
            className="w-full text-xs bg-transparent border-none text-gray-200 placeholder-gray-500 focus:outline-hidden"
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => handleAddTag(inputValue)}
              className="px-2 py-0.5 text-[11px] font-semibold bg-[#C5A47E] text-black rounded-md hover:bg-[#D4B58F] transition-colors shrink-0 cursor-pointer"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {helpText && <p className="text-[11px] text-gray-500">{helpText}</p>}

      {/* Suggested Quick-Pick Tags */}
      {availableSuggestions.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">
            Suggested Tags
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {availableSuggestions.slice(0, 12).map((sug) => {
              const isContext = sug.startsWith('@');
              return (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleAddTag(sug)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                    isContext
                      ? 'bg-[#181818] border-[#2E2822] text-[#C5A47E] hover:bg-[#25201A] hover:border-[#C5A47E]/50'
                      : 'bg-[#181818] border-[#282828] text-gray-400 hover:text-gray-200 hover:bg-[#222222]'
                  }`}
                  title={`Add ${sug}`}
                >
                  <Plus className="w-2.5 h-2.5 opacity-60" />
                  <span>{sug}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
