// modules/storefront/studio-richtext.js
// Quill WYSIWYG initialization for richtext fields in Studio (CMS)

/** Map of active Quill instances keyed by field key */
const _quillInstances = {};

/**
 * Initialize all Quill editors inside a container (called after modal opens).
 * Finds every .studio-richtext-wrap, creates a Quill instance, loads existing content.
 */
function initRichtextEditors(container) {
  if (typeof Quill === 'undefined') {
    console.warn('Quill not loaded — richtext editors disabled');
    return;
  }

  const wraps = (container || document).querySelectorAll('.studio-richtext-wrap');
  wraps.forEach(wrap => {
    const hiddenInput = wrap.querySelector('input[data-type="richtext"]');
    const editorEl = wrap.querySelector('.studio-richtext-editor');
    const key = hiddenInput?.dataset.key;
    if (!editorEl || !hiddenInput) return;

    // Avoid double-init
    if (_quillInstances[key]) return;

    const quill = new Quill(editorEl, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            [{ header: [2, 3, 4, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: ['', 'center', 'left'] }],
            ['link'],
            ['clean']
          ]
        },
        history: { delay: 500, maxStack: 50 }
      },
      placeholder: 'הקלד תוכן כאן...'
    });

    // Set RTL direction on the editor content area
    quill.root.setAttribute('dir', 'rtl');

    // Load existing content
    const existingContent = hiddenInput.value;
    if (existingContent) {
      // If content looks like HTML (contains tags), paste as HTML
      if (/<[a-z][\s\S]*>/i.test(existingContent)) {
        quill.clipboard.dangerouslyPasteHTML(existingContent);
      } else {
        // Plain text / Markdown — insert as-is
        quill.setText(existingContent);
      }
    }

    // Sync content to hidden input on every change
    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      // Quill uses <p><br></p> for empty — normalize to empty string
      hiddenInput.value = html === '<p><br></p>' ? '' : html;
    });

    _quillInstances[key] = quill;
  });
}

/**
 * Destroy all Quill instances (call when modal closes to prevent leaks)
 */
function destroyRichtextEditors() {
  for (const key of Object.keys(_quillInstances)) {
    delete _quillInstances[key];
  }
}
