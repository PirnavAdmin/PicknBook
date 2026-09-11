/* eslint-disable */
import { useRef, useState } from 'react';
import './TaxManagement.css';

const initialForm = {
  companyName: '',
  registrationNo: '',
  gstNo: '',
  gstStateCode: '',
  pan: '',
  email: '',
  phone: '',
  hsnCode: '',
  gstPercentage: '',
  address: '',
};

const styleOptions = [
  { label: 'Paragraph', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];

const formatOptions = [
  { label: 'Normal', value: 'p' },
  { label: 'Quote', value: 'blockquote' },
  { label: 'Code', value: 'pre' },
];

const fontOptions = ['Arial', 'Times New Roman', 'Verdana', 'Georgia'];

const sizeOptions = [
  { label: '10', value: '1' },
  { label: '12', value: '2' },
  { label: '14', value: '3' },
  { label: '16', value: '4' },
  { label: '18', value: '5' },
  { label: '20', value: '6' },
  { label: '24', value: '7' },
];

function TaxManagement() {
  const editorRef = useRef(null);
  const [formData, setFormData] = useState(initialForm);
  const [termsHtml, setTermsHtml] = useState('');
  const [isSourceView, setIsSourceView] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const syncEditorContent = () => {
    if (editorRef.current) {
      setTermsHtml(editorRef.current.innerHTML);
    }
  };

  const applyCommand = (command, value) => {
    if (!editorRef.current || isSourceView) {
      return;
    }

    editorRef.current.focus();

    if (command === 'createLink') {
      const url = window.prompt('Enter URL');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else {
      document.execCommand(command, false, value);
    }

    syncEditorContent();
  };

  const handleToggleSource = () => {
    if (!isSourceView) {
      setTermsHtml(editorRef.current ? editorRef.current.innerHTML : '');
    } else if (editorRef.current) {
      editorRef.current.innerHTML = termsHtml;
      editorRef.current.focus();
    }

    setIsSourceView((prev) => !prev);
  };

  const handleSourceChange = (event) => {
    setTermsHtml(event.target.value);
  };

  const handleSelectCommand = (command) => (event) => {
    const { value } = event.target;
    if (!value) {
      return;
    }

    applyCommand(command, value);
    event.target.selectedIndex = 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatusMessage('Saved successfully.');

    window.setTimeout(() => {
      setStatusMessage('');
    }, 2400);
  };

  return (
    <section className="tax-management">
      <div className="tax-heading">
        <h2 className="tax-title">Tax Management</h2>
        <span className="tax-underline" />
      </div>

      <form className="tax-form" onSubmit={handleSubmit}>
        <div className="tax-grid">
          <div className="label-cell">Company Name</div>
          <div className="input-cell">
            <input
              type="text"
              name="companyName"
              placeholder="Enter Company Name"
              value={formData.companyName}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">Registration No.</div>
          <div className="input-cell">
            <input
              type="text"
              name="registrationNo"
              placeholder="Enter Registration No."
              value={formData.registrationNo}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">GST No.</div>
          <div className="input-cell">
            <input
              type="text"
              name="gstNo"
              placeholder="GST No."
              value={formData.gstNo}
              onChange={handleFieldChange}
            />
          </div>

          <div className="label-cell">GST State Code</div>
          <div className="input-cell">
            <input
              type="text"
              name="gstStateCode"
              placeholder="GST State Code"
              value={formData.gstStateCode}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">PAN</div>
          <div className="input-cell">
            <input
              type="text"
              name="pan"
              placeholder="Enter PAN No."
              value={formData.pan}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">Email</div>
          <div className="input-cell">
            <input
              type="email"
              name="email"
              placeholder="Enter Email ID"
              value={formData.email}
              onChange={handleFieldChange}
            />
          </div>

          <div className="label-cell">Phone</div>
          <div className="input-cell">
            <input
              type="tel"
              name="phone"
              placeholder="Enter Phone No."
              value={formData.phone}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">HSN Code</div>
          <div className="input-cell">
            <input
              type="text"
              name="hsnCode"
              placeholder="Enter HSN Code"
              value={formData.hsnCode}
              onChange={handleFieldChange}
            />
          </div>
          <div className="label-cell">GST Percentage</div>
          <div className="input-cell">
            <input
              type="number"
              name="gstPercentage"
              placeholder="Enter GST Percentage"
              value={formData.gstPercentage}
              onChange={handleFieldChange}
            />
          </div>

          <div className="label-cell">Address</div>
          <div className="input-cell span-5">
            <input
              type="text"
              name="address"
              placeholder="Enter Address"
              value={formData.address}
              onChange={handleFieldChange}
            />
          </div>
        </div>

        <div className="terms-header">
          <span className="terms-title">Terms And Condition</span>
          <span className="terms-fill" />
        </div>

        <div className="editor-shell">
          <div className="editor-toolbar">
            <button
              type="button"
              className={`tool-btn ${isSourceView ? 'active' : ''}`}
              onClick={handleToggleSource}
            >
              Source
            </button>
            <span className="tool-divider" />
            <button type="button" className="tool-btn" onClick={() => applyCommand('undo')}>
              Undo
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('redo')}>
              Redo
            </button>
            <span className="tool-divider" />
            <button type="button" className="tool-btn" onClick={() => applyCommand('cut')}>
              Cut
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('copy')}>
              Copy
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('paste')}>
              Paste
            </button>
            <span className="tool-divider" />
            <button type="button" className="tool-btn" onClick={() => applyCommand('createLink')}>
              Link
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('unlink')}>
              Unlink
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('removeFormat')}>
              Clear
            </button>
          </div>

          <div className="editor-toolbar secondary">
            <select
              className="tool-select"
              defaultValue=""
              onChange={handleSelectCommand('formatBlock')}
              disabled={isSourceView}
            >
              <option value="" disabled>Styles</option>
              {styleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="tool-select"
              defaultValue=""
              onChange={handleSelectCommand('formatBlock')}
              disabled={isSourceView}
            >
              <option value="" disabled>Format</option>
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="tool-select"
              defaultValue=""
              onChange={handleSelectCommand('fontName')}
              disabled={isSourceView}
            >
              <option value="" disabled>Font</option>
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <select
              className="tool-select"
              defaultValue=""
              onChange={handleSelectCommand('fontSize')}
              disabled={isSourceView}
            >
              <option value="" disabled>Size</option>
              {sizeOptions.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>

            <span className="tool-divider" />
            <button type="button" className="tool-btn bold" onClick={() => applyCommand('bold')}>
              B
            </button>
            <button type="button" className="tool-btn italic" onClick={() => applyCommand('italic')}>
              I
            </button>
            <button type="button" className="tool-btn underline" onClick={() => applyCommand('underline')}>
              U
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('strikeThrough')}>
              S
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('superscript')}>
              X2
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('subscript')}>
              x2
            </button>

            <span className="tool-divider" />
            <button type="button" className="tool-btn" onClick={() => applyCommand('insertUnorderedList')}>
              UL
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('insertOrderedList')}>
              OL
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('outdent')}>
              Out
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('indent')}>
              In
            </button>

            <span className="tool-divider" />
            <button type="button" className="tool-btn" onClick={() => applyCommand('justifyLeft')}>
              Left
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('justifyCenter')}>
              Center
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('justifyRight')}>
              Right
            </button>
            <button type="button" className="tool-btn" onClick={() => applyCommand('justifyFull')}>
              Justify
            </button>
          </div>

          <div className="editor-body">
            {isSourceView ? (
              <textarea
                className="editor-source"
                value={termsHtml}
                onChange={handleSourceChange}
                spellCheck={false}
              />
            ) : (
              <div
                ref={editorRef}
                className="editor-area"
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorContent}
              />
            )}
          </div>
        </div>

        <div className="tax-actions">
          <button type="submit" className="submit-btn">Submit</button>
          {statusMessage ? <span className="status-text">{statusMessage}</span> : null}
        </div>
      </form>
    </section>
  );
}

export default TaxManagement;
