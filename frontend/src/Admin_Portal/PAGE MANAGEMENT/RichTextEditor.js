/* eslint-disable */
import React, { useEffect, useRef, useState, useCallback } from "react";
import "./RichTextEditor.css";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  RemoveFormatting,
  Undo,
  Redo,
  Code,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type
} from "lucide-react";

/**
 * Checks if a string contains HTML elements.
 */
function isHtmlContent(str) {
  if (!str || typeof str !== "string") return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Formats plain text or existing database content into clean HTML structure
 * preserving paragraphs, line breaks, bullet dots, numbers, and exact letter casing.
 */
function formatInitialValue(val) {
  if (!val) return "";
  const str = String(val).trim();
  if (!str) return "";

  // If already HTML, return directly
  if (isHtmlContent(str)) {
    return str;
  }

  // Otherwise convert plain text lines into paragraphs / lists
  return parseTextToHtml(str);
}

/**
 * Converts plain text containing points (•, -, *), numbered items (1., 2.),
 * and multi-line paragraphs into rich HTML without changing letter casing.
 */
function parseTextToHtml(text) {
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  const result = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      result.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      result.push("</ol>");
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    // Check for bullet points: •, ●, ▪, ◆, -, *
    const bulletMatch = trimmed.match(/^(?:[•●▪◆*\-–—]|\d+\))\s+(.*)$/);
    if (bulletMatch) {
      if (inOl) {
        result.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        result.push("<ul>");
        inUl = true;
      }
      result.push(`<li>${escapeHtml(bulletMatch[1])}</li>`);
      continue;
    }

    // Check for numbered lists: 1., 2., 1.1, etc.
    const numberMatch = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s+(.*)$/);
    if (numberMatch && !/^\d{4}/.test(trimmed)) {
      if (inUl) {
        result.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        result.push("<ol>");
        inOl = true;
      }
      result.push(`<li>${escapeHtml(numberMatch[2])}</li>`);
      continue;
    }

    // Regular line / heading
    closeLists();

    // Preserve double spaces inside line
    const formattedLine = escapeHtml(trimmed).replace(/  /g, " &nbsp;");
    result.push(`<p>${formattedLine}</p>`);
  }

  closeLists();
  return result.join("");
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitizes pasted HTML keeping bold, italic, font sizes, weights,
 * headings, lists, and spacing intact while preserving original casing.
 */
function cleanPastedHtml(rawHtml) {
  if (!rawHtml) return "";

  // Remove XML comments, mso styles and dangerous tags
  let html = rawHtml
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const allowedTags = new Set([
    "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "P", "DIV", "SPAN", "BR", "HR",
    "UL", "OL", "LI",
    "BLOCKQUOTE", "PRE", "CODE",
    "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "A"
  ]);

  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toUpperCase();

      // Skip non-allowed tags by passing children
      if (!allowedTags.has(tagName)) {
        const fragment = document.createDocumentFragment();
        node.childNodes.forEach((child) => {
          const sanitizedChild = sanitizeNode(child);
          if (sanitizedChild) fragment.appendChild(sanitizedChild);
        });
        return fragment;
      }

      const newElem = document.createElement(tagName.toLowerCase());

      // Safe href for links
      if (tagName === "A" && node.hasAttribute("href")) {
        const href = node.getAttribute("href");
        if (href && !href.trim().toLowerCase().startsWith("javascript:")) {
          newElem.setAttribute("href", href);
          newElem.setAttribute("target", "_blank");
          newElem.setAttribute("rel", "noopener noreferrer");
        }
      }

      // Preserve font styles
      if (node.style?.fontSize) {
        newElem.style.fontSize = node.style.fontSize;
      }
      if (node.style?.fontWeight) {
        newElem.style.fontWeight = node.style.fontWeight;
      }
      if (node.style?.color) {
        newElem.style.color = node.style.color;
      }
      if (node.style?.textAlign) {
        newElem.style.textAlign = node.style.textAlign;
      }

      // Check for inline bold styling
      const fontWeight = node.style?.fontWeight;
      const isBoldStyle = fontWeight === "bold" || parseInt(fontWeight, 10) >= 600;

      node.childNodes.forEach((child) => {
        const sanitizedChild = sanitizeNode(child);
        if (sanitizedChild) newElem.appendChild(sanitizedChild);
      });

      if (isBoldStyle && tagName !== "B" && tagName !== "STRONG") {
        const strongWrapper = document.createElement("strong");
        strongWrapper.appendChild(newElem);
        return strongWrapper;
      }

      return newElem;
    }
    return null;
  }

  const cleanFragment = document.createDocumentFragment();
  doc.body.childNodes.forEach((child) => {
    const sanitized = sanitizeNode(child);
    if (sanitized) cleanFragment.appendChild(sanitized);
  });

  const tempDiv = document.createElement("div");
  tempDiv.appendChild(cleanFragment);
  return tempDiv.innerHTML;
}

/**
 * Inserts HTML safely at current cursor position or appends to editor
 */
function insertHtmlAtCursor(editorElement, htmlToInsert) {
  if (!editorElement || !htmlToInsert) return;

  editorElement.focus();
  const sel = window.getSelection();

  if (sel && sel.rangeCount > 0) {
    let range = sel.getRangeAt(0);

    // Ensure the range is actually inside the editor
    if (editorElement.contains(range.commonAncestorContainer)) {
      range.deleteContents();

      const el = document.createElement("div");
      el.innerHTML = htmlToInsert;
      const frag = document.createDocumentFragment();
      let node, lastNode;

      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }

      range.insertNode(frag);

      if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }
  }

  // Fallback: If no range inside editor, append to end
  const temp = document.createElement("div");
  temp.innerHTML = htmlToInsert;
  while (temp.firstChild) {
    editorElement.appendChild(temp.firstChild);
  }
}

/**
 * Wraps selected text with an inline styled span or converts case
 */
function applyInlineStyleToSelection(editorElement, styleProperty, styleValue) {
  if (!editorElement) return;
  editorElement.focus();
  const sel = window.getSelection();

  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (!editorElement.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) return; // No text selected

    const span = document.createElement("span");
    span.style[styleProperty] = styleValue;
    span.appendChild(range.extractContents());
    range.insertNode(span);

    // Move selection after span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

function applyTextCaseToSelection(editorElement, caseType) {
  if (!editorElement) return;
  editorElement.focus();
  const sel = window.getSelection();

  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (!editorElement.contains(range.commonAncestorContainer)) return;

    const selectedText = range.toString();
    if (!selectedText) return;

    let convertedText = selectedText;
    if (caseType === "upper") {
      convertedText = selectedText.toUpperCase();
    } else if (caseType === "lower") {
      convertedText = selectedText.toLowerCase();
    } else if (caseType === "title") {
      convertedText = selectedText.replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (caseType === "sentence") {
      convertedText = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(convertedText));
  }
}

const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Write or paste formatted description here (supports bold, points, numbers, casing, and spaces)...",
  disabled = false,
  minHeight = "180px"
}) => {
  const editorRef = useRef(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Sync value into contentEditable when value prop changes externally
  useEffect(() => {
    if (editorRef.current && !isCodeMode) {
      const formatted = formatInitialValue(value);
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [value, isCodeMode]);

  const updateActiveFormats = useCallback(() => {
    if (isCodeMode || !editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikethrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // Ignore
    }
  }, [isCodeMode]);

  const triggerChange = () => {
    if (editorRef.current && onChange) {
      const html = editorRef.current.innerHTML;
      const clean = html === "<br>" || html === "<p><br></p>" || html === "<p></p>" ? "" : html;
      onChange(clean);
    }
    updateActiveFormats();
  };

  const executeCommand = (command, val = null) => {
    if (disabled || isCodeMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    triggerChange();
  };

  const handleFormatBlock = (e) => {
    const tag = e.target.value;
    if (tag) {
      executeCommand("formatBlock", `<${tag}>`);
      e.target.value = "";
    }
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    if (size && editorRef.current) {
      applyInlineStyleToSelection(editorRef.current, "fontSize", size);
      triggerChange();
      e.target.value = "";
    }
  };

  const handleFontWeightChange = (e) => {
    const weight = e.target.value;
    if (weight && editorRef.current) {
      applyInlineStyleToSelection(editorRef.current, "fontWeight", weight);
      triggerChange();
      e.target.value = "";
    }
  };

  const handleColorChange = (e) => {
    const color = e.target.value;
    if (color && editorRef.current) {
      applyInlineStyleToSelection(editorRef.current, "color", color);
      triggerChange();
      e.target.value = "";
    }
  };

  const handleCaseChange = (e) => {
    const caseType = e.target.value;
    if (caseType && editorRef.current) {
      applyTextCaseToSelection(editorRef.current, caseType);
      triggerChange();
      e.target.value = "";
    }
  };

  const handlePaste = (e) => {
    if (disabled || isCodeMode) return;
    e.preventDefault();

    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    const pastedHtml = clipboardData.getData("text/html");
    const pastedText = clipboardData.getData("text/plain");

    let finalHtml = "";

    if (pastedHtml && pastedHtml.trim() && !pastedText.includes("•") && !pastedText.includes("1.")) {
      finalHtml = cleanPastedHtml(pastedHtml);
    } else if (pastedText && pastedText.trim()) {
      finalHtml = parseTextToHtml(pastedText);
    } else if (pastedHtml) {
      finalHtml = cleanPastedHtml(pastedHtml);
    }

    if (finalHtml && editorRef.current) {
      insertHtmlAtCursor(editorRef.current, finalHtml);
      triggerChange();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Keyboard Shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        executeCommand("bold");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        executeCommand("italic");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        executeCommand("underline");
      }
    }
  };

  return (
    <div className={`pm-rich-editor-wrapper ${disabled ? "disabled" : ""}`}>
      {/* Top Toolbar */}
      <div className="pm-editor-toolbar">
        {/* Style / Heading */}
        <div className="pm-toolbar-group">
          <select
            className="pm-format-select"
            onChange={handleFormatBlock}
            value=""
            disabled={disabled || isCodeMode}
            title="Paragraph / Headings"
          >
            <option value="" disabled>Style ▾</option>
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="pm-toolbar-group">
          <select
            className="pm-format-select"
            onChange={handleFontSizeChange}
            value=""
            disabled={disabled || isCodeMode}
            title="Font Size"
          >
            <option value="" disabled>Size ▾</option>
            <option value="12px">Small (12px)</option>
            <option value="14px">Normal (14px)</option>
            <option value="16px">Medium (16px)</option>
            <option value="18px">Large (18px)</option>
            <option value="22px">X-Large (22px)</option>
            <option value="28px">Huge (28px)</option>
          </select>
        </div>

        {/* Font Weight */}
        <div className="pm-toolbar-group">
          <select
            className="pm-format-select"
            onChange={handleFontWeightChange}
            value=""
            disabled={disabled || isCodeMode}
            title="Font Weight"
          >
            <option value="" disabled>Weight ▾</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi-Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
          </select>
        </div>

        {/* Text Case Control */}
        <div className="pm-toolbar-group">
          <select
            className="pm-format-select"
            onChange={handleCaseChange}
            value=""
            disabled={disabled || isCodeMode}
            title="Change Text Case"
          >
            <option value="" disabled>Case ▾</option>
            <option value="upper">UPPERCASE</option>
            <option value="lower">lowercase</option>
            <option value="title">Title Case</option>
            <option value="sentence">Sentence case</option>
          </select>
        </div>

        {/* Color Control */}
        <div className="pm-toolbar-group">
          <select
            className="pm-format-select"
            onChange={handleColorChange}
            value=""
            disabled={disabled || isCodeMode}
            title="Text Color"
          >
            <option value="" disabled>Color ▾</option>
            <option value="#ff0000" style={{ color: "#ff0000", fontWeight: "bold" }}>Red (#ff0000)</option>
            <option value="#A51C49" style={{ color: "#A51C49", fontWeight: "bold" }}>Maroon (#A51C49)</option>
            <option value="#0f172a" style={{ color: "#0f172a" }}>Dark Slate (#0f172a)</option>
            <option value="#2563eb" style={{ color: "#2563eb" }}>Blue (#2563eb)</option>
            <option value="#16a34a" style={{ color: "#16a34a" }}>Green (#16a34a)</option>
            <option value="#64748b" style={{ color: "#64748b" }}>Gray (#64748b)</option>
          </select>
        </div>

        <div className="pm-toolbar-divider" />

        {/* Formatting Buttons */}
        <div className="pm-toolbar-group">
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.bold ? "active" : ""}`}
            onClick={() => executeCommand("bold")}
            disabled={disabled || isCodeMode}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.italic ? "active" : ""}`}
            onClick={() => executeCommand("italic")}
            disabled={disabled || isCodeMode}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.underline ? "active" : ""}`}
            onClick={() => executeCommand("underline")}
            disabled={disabled || isCodeMode}
            title="Underline (Ctrl+U)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.strikethrough ? "active" : ""}`}
            onClick={() => executeCommand("strikethrough")}
            disabled={disabled || isCodeMode}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
        </div>

        <div className="pm-toolbar-divider" />

        {/* Lists */}
        <div className="pm-toolbar-group">
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.insertUnorderedList ? "active" : ""}`}
            onClick={() => executeCommand("insertUnorderedList")}
            disabled={disabled || isCodeMode}
            title="Bullet Point List (Dots)"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className={`pm-toolbar-btn ${activeFormats.insertOrderedList ? "active" : ""}`}
            onClick={() => executeCommand("insertOrderedList")}
            disabled={disabled || isCodeMode}
            title="Numbered List (1, 2, 3)"
          >
            <ListOrdered size={15} />
          </button>
        </div>

        <div className="pm-toolbar-divider" />

        {/* Alignment */}
        <div className="pm-toolbar-group">
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("justifyLeft")}
            disabled={disabled || isCodeMode}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("justifyCenter")}
            disabled={disabled || isCodeMode}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("justifyRight")}
            disabled={disabled || isCodeMode}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>
        </div>

        <div className="pm-toolbar-divider" />

        {/* Undo / Redo / Clear */}
        <div className="pm-toolbar-group">
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("removeFormat")}
            disabled={disabled || isCodeMode}
            title="Clear Formatting"
          >
            <RemoveFormatting size={15} />
          </button>
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("undo")}
            disabled={disabled || isCodeMode}
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            className="pm-toolbar-btn"
            onClick={() => executeCommand("redo")}
            disabled={disabled || isCodeMode}
            title="Redo"
          >
            <Redo size={14} />
          </button>
        </div>

        {/* Switch between Visual and HTML Mode */}
        <button
          type="button"
          className={`pm-view-mode-btn ${isCodeMode ? "active" : ""}`}
          onClick={() => setIsCodeMode(!isCodeMode)}
          title={isCodeMode ? "Switch to Visual Editor" : "View / Edit Raw HTML Code"}
        >
          {isCodeMode ? (
            <>
              <Eye size={13} /> Visual View
            </>
          ) : (
            <>
              <Code size={13} /> HTML View
            </>
          )}
        </button>
      </div>

      {/* Editor Content Area */}
      {isCodeMode ? (
        <textarea
          className="pm-editor-code"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="Enter raw HTML code..."
          disabled={disabled}
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          className="pm-editor-content"
          contentEditable={!disabled}
          data-placeholder={placeholder}
          onInput={triggerChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          style={{ minHeight }}
        />
      )}

      {/* Editor Footer Help */}
      <div className="pm-editor-footer">
        <span className="pm-editor-footer-hint">
          💡 <strong>Tip:</strong> Text casing (Capital/Small), font sizes, font weights, points (•), and numbers are preserved exactly.
        </span>
        <span>{isCodeMode ? "Source Code Mode" : "Rich Text Mode"}</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
