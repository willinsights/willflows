import React from 'react';

// Regex para detetar URLs (http, https, www)
const URL_REGEX = /((https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?"'\])>])/gi;

export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const url = match[0];
    // Add https:// if starts with www.
    const href = url.startsWith('www.') ? `https://${url}` : url;

    parts.push(
      <a
        key={`link-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = match.index + url.length;
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? parts : [<React.Fragment key="full">{text}</React.Fragment>];
}
