/**
 * LaTeXy - AI-Powered LaTeX Editor
 * Main Application Entry Point
 */

import './style.css';
import { EditorView, basicSetup } from 'codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { autocompletion, completeFromList, snippetCompletion } from '@codemirror/autocomplete';
import { marked } from 'marked';

// Load latex.js from CDN - it has bundler compatibility issues with Vite
let latexjs = null;
async function loadLatexJs() {
  if (!latexjs) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/latex.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
    latexjs = window.latexjs;
  }
  return latexjs;
}

// ============================================
// LaTeX Autocompletion Data
// ============================================
const latexCommands = [
  // Document structure
  snippetCompletion('\\documentclass{${article}}', { label: '\\documentclass', type: 'keyword', detail: 'Document class', boost: 10 }),
  snippetCompletion('\\usepackage{${package}}', { label: '\\usepackage', type: 'keyword', detail: 'Import package', boost: 9 }),
  snippetCompletion('\\begin{${environment}}\n\t${}}\n\\end{${environment}}', { label: '\\begin', type: 'keyword', detail: 'Begin environment', boost: 8 }),

  // Sections
  snippetCompletion('\\section{${title}}', { label: '\\section', type: 'function', detail: 'Section heading' }),
  snippetCompletion('\\subsection{${title}}', { label: '\\subsection', type: 'function', detail: 'Subsection heading' }),
  snippetCompletion('\\subsubsection{${title}}', { label: '\\subsubsection', type: 'function', detail: 'Subsubsection heading' }),
  snippetCompletion('\\section*{${title}}', { label: '\\section*', type: 'function', detail: 'Unnumbered section' }),
  snippetCompletion('\\paragraph{${title}}', { label: '\\paragraph', type: 'function', detail: 'Paragraph heading' }),
  snippetCompletion('\\chapter{${title}}', { label: '\\chapter', type: 'function', detail: 'Chapter heading' }),

  // Text formatting
  snippetCompletion('\\textbf{${text}}', { label: '\\textbf', type: 'function', detail: 'Bold text' }),
  snippetCompletion('\\textit{${text}}', { label: '\\textit', type: 'function', detail: 'Italic text' }),
  snippetCompletion('\\underline{${text}}', { label: '\\underline', type: 'function', detail: 'Underlined text' }),
  snippetCompletion('\\emph{${text}}', { label: '\\emph', type: 'function', detail: 'Emphasized text' }),
  snippetCompletion('\\texttt{${text}}', { label: '\\texttt', type: 'function', detail: 'Monospace text' }),
  snippetCompletion('\\textsc{${text}}', { label: '\\textsc', type: 'function', detail: 'Small caps' }),

  // Math
  snippetCompletion('\\frac{${num}}{${denom}}', { label: '\\frac', type: 'function', detail: 'Fraction' }),
  snippetCompletion('\\sqrt{${expr}}', { label: '\\sqrt', type: 'function', detail: 'Square root' }),
  snippetCompletion('\\sqrt[${n}]{${expr}}', { label: '\\sqrt[n]', type: 'function', detail: 'Nth root' }),
  snippetCompletion('\\sum_{${i=1}}^{${n}}', { label: '\\sum', type: 'function', detail: 'Summation' }),
  snippetCompletion('\\int_{${a}}^{${b}}', { label: '\\int', type: 'function', detail: 'Integral' }),
  snippetCompletion('\\lim_{${x \\to \\infty}}', { label: '\\lim', type: 'function', detail: 'Limit' }),
  snippetCompletion('\\prod_{${i=1}}^{${n}}', { label: '\\prod', type: 'function', detail: 'Product' }),

  // Greek letters
  { label: '\\alpha', type: 'constant', detail: 'α' },
  { label: '\\beta', type: 'constant', detail: 'β' },
  { label: '\\gamma', type: 'constant', detail: 'γ' },
  { label: '\\delta', type: 'constant', detail: 'δ' },
  { label: '\\epsilon', type: 'constant', detail: 'ε' },
  { label: '\\theta', type: 'constant', detail: 'θ' },
  { label: '\\lambda', type: 'constant', detail: 'λ' },
  { label: '\\mu', type: 'constant', detail: 'μ' },
  { label: '\\pi', type: 'constant', detail: 'π' },
  { label: '\\sigma', type: 'constant', detail: 'σ' },
  { label: '\\omega', type: 'constant', detail: 'ω' },
  { label: '\\Gamma', type: 'constant', detail: 'Γ' },
  { label: '\\Delta', type: 'constant', detail: 'Δ' },
  { label: '\\Sigma', type: 'constant', detail: 'Σ' },
  { label: '\\Omega', type: 'constant', detail: 'Ω' },

  // Math symbols
  { label: '\\infty', type: 'constant', detail: '∞' },
  { label: '\\partial', type: 'constant', detail: '∂' },
  { label: '\\nabla', type: 'constant', detail: '∇' },
  { label: '\\times', type: 'constant', detail: '×' },
  { label: '\\cdot', type: 'constant', detail: '·' },
  { label: '\\leq', type: 'constant', detail: '≤' },
  { label: '\\geq', type: 'constant', detail: '≥' },
  { label: '\\neq', type: 'constant', detail: '≠' },
  { label: '\\approx', type: 'constant', detail: '≈' },
  { label: '\\equiv', type: 'constant', detail: '≡' },
  { label: '\\rightarrow', type: 'constant', detail: '→' },
  { label: '\\leftarrow', type: 'constant', detail: '←' },
  { label: '\\Rightarrow', type: 'constant', detail: '⇒' },
  { label: '\\Leftarrow', type: 'constant', detail: '⇐' },
  { label: '\\forall', type: 'constant', detail: '∀' },
  { label: '\\exists', type: 'constant', detail: '∃' },
  { label: '\\in', type: 'constant', detail: '∈' },
  { label: '\\subset', type: 'constant', detail: '⊂' },
  { label: '\\cup', type: 'constant', detail: '∪' },
  { label: '\\cap', type: 'constant', detail: '∩' },

  // References
  snippetCompletion('\\label{${key}}', { label: '\\label', type: 'function', detail: 'Create label' }),
  snippetCompletion('\\ref{${key}}', { label: '\\ref', type: 'function', detail: 'Reference' }),
  snippetCompletion('\\cite{${key}}', { label: '\\cite', type: 'function', detail: 'Citation' }),
  snippetCompletion('\\footnote{${text}}', { label: '\\footnote', type: 'function', detail: 'Footnote' }),

  // Figures
  snippetCompletion('\\includegraphics[width=${0.8}\\textwidth]{${filename}}', { label: '\\includegraphics', type: 'function', detail: 'Include image' }),
  snippetCompletion('\\caption{${text}}', { label: '\\caption', type: 'function', detail: 'Caption' }),
];

// Table snippets
const tableSnippets = [
  snippetCompletion(
    `\\begin{tabular}{|c|c|c|}
\\hline
\${Header 1} & \${Header 2} & \${Header 3} \\\\
\\hline
\${Cell 1} & \${Cell 2} & \${Cell 3} \\\\
\\hline
\\end{tabular}`,
    { label: 'table3', type: 'snippet', detail: '3-column table', boost: 5 }
  ),
  snippetCompletion(
    `\\begin{tabular}{|l|r|}
\\hline
\${Left} & \${Right} \\\\
\\hline
\${Data 1} & \${Data 2} \\\\
\\hline
\\end{tabular}`,
    { label: 'table2', type: 'snippet', detail: '2-column table', boost: 5 }
  ),
  snippetCompletion(
    `\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|c|}
\\hline
\${Header 1} & \${Header 2} & \${Header 3} \\\\
\\hline
\${Row 1} & \${} & \${} \\\\
\${Row 2} & \${} & \${} \\\\
\\hline
\\end{tabular}
\\caption{\${Table caption}}
\\label{tab:\${label}}
\\end{table}`,
    { label: 'tablefloat', type: 'snippet', detail: 'Floating table with caption', boost: 6 }
  ),
  snippetCompletion(
    `\\begin{tabular}{@{}lll@{}}
\\toprule
\${Header 1} & \${Header 2} & \${Header 3} \\\\
\\midrule
\${} & \${} & \${} \\\\
\${} & \${} & \${} \\\\
\\bottomrule
\\end{tabular}`,
    { label: 'tablebooktabs', type: 'snippet', detail: 'Professional booktabs table', boost: 5 }
  ),
];

// Environment snippets
const environmentSnippets = [
  snippetCompletion(
    `\\begin{itemize}
  \\item \${}
  \\item \${}
\\end{itemize}`,
    { label: 'itemize', type: 'snippet', detail: 'Bullet list' }
  ),
  snippetCompletion(
    `\\begin{enumerate}
  \\item \${}
  \\item \${}
\\end{enumerate}`,
    { label: 'enumerate', type: 'snippet', detail: 'Numbered list' }
  ),
  snippetCompletion(
    `\\begin{equation}
  \${}
\\end{equation}`,
    { label: 'equation', type: 'snippet', detail: 'Numbered equation' }
  ),
  snippetCompletion(
    `\\begin{align}
  \${} &= \${} \\\\
  &= \${}
\\end{align}`,
    { label: 'align', type: 'snippet', detail: 'Aligned equations' }
  ),
  snippetCompletion(
    `\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{\${filename}}
  \\caption{\${caption}}
  \\label{fig:\${label}}
\\end{figure}`,
    { label: 'figure', type: 'snippet', detail: 'Figure environment' }
  ),
  snippetCompletion(
    `\\begin{abstract}
  \${}
\\end{abstract}`,
    { label: 'abstract', type: 'snippet', detail: 'Abstract' }
  ),
  snippetCompletion(
    `\\begin{center}
  \${}
\\end{center}`,
    { label: 'center', type: 'snippet', detail: 'Centered content' }
  ),
  snippetCompletion(
    `\\begin{verbatim}
\${}
\\end{verbatim}`,
    { label: 'verbatim', type: 'snippet', detail: 'Verbatim text' }
  ),
  snippetCompletion(
    `\\begin{quote}
  \${}
\\end{quote}`,
    { label: 'quote', type: 'snippet', detail: 'Block quote' }
  ),
  snippetCompletion(
    `\\begin{matrix}
  \${a} & \${b} \\\\
  \${c} & \${d}
\\end{matrix}`,
    { label: 'matrix', type: 'snippet', detail: 'Matrix' }
  ),
  snippetCompletion(
    `\\begin{bmatrix}
  \${a} & \${b} \\\\
  \${c} & \${d}
\\end{bmatrix}`,
    { label: 'bmatrix', type: 'snippet', detail: 'Bracketed matrix' }
  ),
  snippetCompletion(
    `\\begin{cases}
  \${expr1} & \\text{if } \${cond1} \\\\
  \${expr2} & \\text{otherwise}
\\end{cases}`,
    { label: 'cases', type: 'snippet', detail: 'Piecewise function' }
  ),
];

// Package suggestions
const packageCompletions = [
  { label: 'amsmath', type: 'module', detail: 'Advanced math' },
  { label: 'amssymb', type: 'module', detail: 'Math symbols' },
  { label: 'graphicx', type: 'module', detail: 'Graphics support' },
  { label: 'hyperref', type: 'module', detail: 'Hyperlinks' },
  { label: 'geometry', type: 'module', detail: 'Page layout' },
  { label: 'booktabs', type: 'module', detail: 'Professional tables' },
  { label: 'tikz', type: 'module', detail: 'Diagrams' },
  { label: 'xcolor', type: 'module', detail: 'Colors' },
  { label: 'listings', type: 'module', detail: 'Code listings' },
  { label: 'algorithm2e', type: 'module', detail: 'Algorithms' },
  { label: 'biblatex', type: 'module', detail: 'Bibliography' },
  { label: 'fontspec', type: 'module', detail: 'Font selection' },
  { label: 'microtype', type: 'module', detail: 'Typography' },
  { label: 'siunitx', type: 'module', detail: 'SI units' },
  { label: 'cleveref', type: 'module', detail: 'Smart references' },
];

// LaTeX completion source
function latexCompletions(context) {
  const word = context.matchBefore(/\\?[\w@]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const text = word.text;

  // If typing after \usepackage{, suggest packages
  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.slice(0, context.pos - line.from);
  if (beforeCursor.match(/\\usepackage\{[\w,]*$/)) {
    return {
      from: word.from,
      options: packageCompletions,
      validFor: /^[\w]*$/
    };
  }

  // Otherwise show all completions
  return {
    from: word.from,
    options: [...latexCommands, ...tableSnippets, ...environmentSnippets],
    validFor: /^\\?[\w@]*$/
  };
}

// ============================================
// State Management
// ============================================
const state = {
  files: {
    'main.tex': {
      content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\begin{document}

\\section*{What is LaTeXy?}

\\textbf{LaTeXy} is an AI-powered \\LaTeX{} editor for writing scientific documents. It supports real-time collaboration with coauthors and includes AI-powered intelligence to help you draft and edit text, reason through ideas, and handle formatting.

\\section*{Features}

LaTeXy includes AI directly in the editor and can access your project, so you can ask it to do things like:

\\begin{itemize}
  \\item Write an abstract based on the rest of the paper
  \\item Add a bibliography to my paper
  \\item Add equations to the introduction
\\end{itemize}

\\subsection*{Mathematical Equations}

The Laplace transform of $\\cos(\\alpha t)$ is:

$$
\\mathcal{L}\\{\\cos(\\alpha t)\\} = \\frac{s}{s^2 + \\alpha^2}
$$

And the quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

\\section*{Collaboration}

Invite collaborators by clicking the \\textbf{Share} menu. As you edit, they will see your updates in real time.

\\end{document}`,
      history: []
    }
  },
  activeFile: 'main.tex',
  originalContent: '',
  settings: {
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
    ollamaUrl: 'http://localhost:11434',
    autoCompile: true,
    syncScroll: false
  },
  chatHistory: [],
  llmProvider: 'openai'
};

// ============================================
// Editor Setup
// ============================================
let editor;

function initEditor() {
  const editorContainer = document.getElementById('editor');

  const startState = EditorState.create({
    doc: state.files[state.activeFile].content,
    extensions: [
      basicSetup,
      StreamLanguage.define(stex),
      oneDark,
      autocompletion({
        override: [latexCompletions],
        activateOnTyping: true,
        maxRenderedOptions: 30,
        icons: true
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          state.files[state.activeFile].content = content;
          saveToStorage();

          if (state.settings.autoCompile) {
            debounce(compileLatex, 500)();
          }
        }
      }),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-tooltip.cm-tooltip-autocomplete': {
          backgroundColor: '#242220',
          border: '1px solid #3d3835',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
        },
        '.cm-tooltip-autocomplete ul li': {
          padding: '4px 8px'
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          backgroundColor: 'rgba(232, 200, 122, 0.15)',
          color: '#e8c87a'
        },
        '.cm-completionLabel': {
          fontFamily: "'JetBrains Mono', monospace"
        },
        '.cm-completionDetail': {
          color: '#7d7770',
          fontStyle: 'normal',
          marginLeft: '8px'
        }
      })
    ]
  });

  editor = new EditorView({
    state: startState,
    parent: editorContainer
  });

  // Save original for diff
  state.originalContent = state.files[state.activeFile].content;

  // Initial compile
  compileLatex();
}

// ============================================
// LaTeX Compilation
// ============================================
async function compileLatex() {
  const content = state.files[state.activeFile].content;
  const outputEl = document.getElementById('latexOutput');

  // Show loading state
  outputEl.innerHTML = '<div style="color: #bdb5a8; padding: 20px;">Compiling...</div>';

  try {
    const latex = await loadLatexJs();
    const generator = latex.parse(content, { generator: new latex.HtmlGenerator({ hyphenate: false }) });
    const dom = generator.domFragment();

    outputEl.innerHTML = '';
    outputEl.appendChild(dom);

    // Add styles from latex.js
    const styleEl = document.createElement('style');
    styleEl.textContent = generator.stylesAndScripts();
    outputEl.appendChild(styleEl);

    // Use KaTeX to render math formulas properly
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(outputEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      });
    }
  } catch (error) {
    outputEl.innerHTML = `
      <div style="color: #e87a7a; padding: 20px; font-family: monospace;">
        <strong>LaTeX Error:</strong><br>
        <pre>${escapeHtml(error.message)}</pre>
      </div>
    `;
  }
}

// ============================================
// LLM Integration
// ============================================
const LLM_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  ollama: '/api/chat'
};

const SYSTEM_PROMPT = `You are a helpful LaTeX assistant integrated into LaTeXy, an AI-powered LaTeX editor. 

Your capabilities:
1. Help users write and edit LaTeX documents
2. Explain LaTeX concepts and syntax
3. Suggest appropriate packages for specific needs
4. Fix LaTeX errors and improve formatting
5. Generate mathematical equations, tables, figures, and diagrams

When providing LaTeX code, wrap it in \`\`\`latex code blocks so the user can easily apply it to their document.

Current document context will be provided. Be concise but thorough.`;

async function sendMessage(message) {
  const provider = state.llmProvider;
  const apiKey = getApiKey(provider);

  if (!apiKey && provider !== 'ollama') {
    return { error: `Please configure your ${provider.toUpperCase()} API key in Settings.` };
  }

  const currentContent = state.files[state.activeFile].content;
  const contextMessage = `Current LaTeX document:\n\`\`\`latex\n${currentContent}\n\`\`\`\n\nUser request: ${message}`;

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(contextMessage, apiKey);
      case 'anthropic':
        return await callAnthropic(contextMessage, apiKey);
      case 'gemini':
        return await callGemini(contextMessage, apiKey);
      case 'ollama':
        return await callOllama(contextMessage);
      default:
        return { error: 'Unknown provider' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function callOpenAI(message, apiKey) {
  const response = await fetch(LLM_ENDPOINTS.openai, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...state.chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ],
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return { content: data.choices[0].message.content };
}

async function callAnthropic(message, apiKey) {
  const response = await fetch(LLM_ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        ...state.chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return { content: data.content[0].text };
}

async function callGemini(message, apiKey) {
  const url = `${LLM_ENDPOINTS.gemini}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${message}` }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  return { content: data.candidates[0].content.parts[0].text };
}

async function callOllama(message) {
  const url = `${state.settings.ollamaUrl}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...state.chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error('Ollama connection failed. Is it running?');
  }

  const data = await response.json();
  return { content: data.message.content };
}

function getApiKey(provider) {
  switch (provider) {
    case 'openai': return state.settings.openaiKey;
    case 'anthropic': return state.settings.anthropicKey;
    case 'gemini': return state.settings.geminiKey;
    default: return '';
  }
}

// ============================================
// Chat UI
// ============================================
function initChat() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const providerSelect = document.getElementById('llmProvider');

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', handleSend);

  providerSelect.addEventListener('change', (e) => {
    state.llmProvider = e.target.value;
  });

  // Sidebar toggle functionality
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarExpandTab = document.getElementById('sidebarExpandTab');
  const sidebar = document.getElementById('sidebar');

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
  });

  sidebarExpandTab.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
  });
}

async function handleSend() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();

  if (!message) return;

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Hide welcome message
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  // Add user message
  addChatMessage('user', message);
  state.chatHistory.push({ role: 'user', content: message });

  // Show loading
  const loadingEl = addChatMessage('assistant', '<div class="loading"><span></span><span></span><span></span></div>', true);

  // Send to LLM
  const response = await sendMessage(message);

  // Remove loading
  loadingEl.remove();

  if (response.error) {
    addChatMessage('assistant', `⚠️ ${response.error}`);
  } else {
    addChatMessage('assistant', response.content);
    state.chatHistory.push({ role: 'assistant', content: response.content });
  }
}

function addChatMessage(role, content, isHtml = false) {
  const messagesEl = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role}`;

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  if (isHtml) {
    contentEl.innerHTML = content;
  } else {
    // Parse markdown and add apply buttons for code blocks
    let html = marked.parse(content);
    contentEl.innerHTML = html;

    // Add apply buttons to LaTeX code blocks
    contentEl.querySelectorAll('pre code').forEach((codeBlock) => {
      const code = codeBlock.textContent;
      if (code.includes('\\') || code.includes('begin{')) {
        const btn = document.createElement('button');
        btn.className = 'apply-code-btn';
        btn.innerHTML = '+ Apply to Editor';
        btn.addEventListener('click', () => applyCodeToEditor(code));
        codeBlock.parentNode.appendChild(btn);
      }
    });
  }

  messageEl.appendChild(contentEl);
  messagesEl.appendChild(messageEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return messageEl;
}

function applyCodeToEditor(code) {
  const currentDoc = editor.state.doc.toString();

  // Try to intelligently insert the code
  // If it's a complete document, replace everything
  if (code.includes('\\documentclass')) {
    editor.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: code }
    });
  }
  // If it's a snippet, insert before \end{document}
  else {
    const endDocPos = currentDoc.lastIndexOf('\\end{document}');
    if (endDocPos !== -1) {
      editor.dispatch({
        changes: { from: endDocPos, to: endDocPos, insert: code + '\n\n' }
      });
    } else {
      // Append to end
      editor.dispatch({
        changes: { from: currentDoc.length, to: currentDoc.length, insert: '\n\n' + code }
      });
    }
  }

  compileLatex();
}

// ============================================
// Diff View
// ============================================
function initDiff() {
  const previewModeBtn = document.getElementById('previewModeBtn');
  const diffModeBtn = document.getElementById('diffModeBtn');
  const previewContent = document.getElementById('previewContent');
  const diffContent = document.getElementById('diffContent');

  previewModeBtn.addEventListener('click', () => {
    previewModeBtn.classList.add('active');
    diffModeBtn.classList.remove('active');
    previewContent.classList.remove('hidden');
    diffContent.classList.add('hidden');
  });

  diffModeBtn.addEventListener('click', () => {
    diffModeBtn.classList.add('active');
    previewModeBtn.classList.remove('active');
    diffContent.classList.remove('hidden');
    previewContent.classList.add('hidden');
    renderDiff();
  });
}

function renderDiff() {
  const diffView = document.getElementById('diffView');
  const original = state.originalContent;
  const modified = state.files[state.activeFile].content;

  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  // Simple line-by-line diff
  let originalHtml = '';
  let modifiedHtml = '';

  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] ?? '';
    const modLine = modifiedLines[i] ?? '';

    if (origLine === modLine) {
      originalHtml += `<div class="diff-line">${escapeHtml(origLine) || '&nbsp;'}</div>`;
      modifiedHtml += `<div class="diff-line">${escapeHtml(modLine) || '&nbsp;'}</div>`;
    } else {
      originalHtml += `<div class="diff-line removed">${escapeHtml(origLine) || '&nbsp;'}</div>`;
      modifiedHtml += `<div class="diff-line added">${escapeHtml(modLine) || '&nbsp;'}</div>`;
    }
  }

  diffView.innerHTML = `
    <div class="diff-pane original">${originalHtml}</div>
    <div class="diff-pane modified">${modifiedHtml}</div>
  `;
}

// ============================================
// Settings
// ============================================
function initSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const backdrop = settingsModal.querySelector('.modal-backdrop');

  settingsBtn.addEventListener('click', () => {
    loadSettingsToForm();
    settingsModal.classList.remove('hidden');
  });

  closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  backdrop.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  saveSettingsBtn.addEventListener('click', () => {
    saveSettingsFromForm();
    settingsModal.classList.add('hidden');
  });
}

function loadSettingsToForm() {
  document.getElementById('openaiKey').value = state.settings.openaiKey;
  document.getElementById('anthropicKey').value = state.settings.anthropicKey;
  document.getElementById('geminiKey').value = state.settings.geminiKey;
  document.getElementById('ollamaUrl').value = state.settings.ollamaUrl;
  document.getElementById('autoCompile').checked = state.settings.autoCompile;
  document.getElementById('syncScroll').checked = state.settings.syncScroll;
}

function saveSettingsFromForm() {
  state.settings.openaiKey = document.getElementById('openaiKey').value;
  state.settings.anthropicKey = document.getElementById('anthropicKey').value;
  state.settings.geminiKey = document.getElementById('geminiKey').value;
  state.settings.ollamaUrl = document.getElementById('ollamaUrl').value;
  state.settings.autoCompile = document.getElementById('autoCompile').checked;
  state.settings.syncScroll = document.getElementById('syncScroll').checked;

  localStorage.setItem('texflow-settings', JSON.stringify(state.settings));
}

// ============================================
// File Management
// ============================================
function initFileManagement() {
  const newFileBtn = document.getElementById('newFileBtn');
  const fileTree = document.getElementById('fileTree');

  newFileBtn.addEventListener('click', () => {
    // Check if input already exists
    if (document.querySelector('.new-file-input')) return;

    // Create inline input
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'file-item new-file-input';
    inputWrapper.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <input type="text" placeholder="filename.tex" autofocus>
    `;
    fileTree.appendChild(inputWrapper);

    const input = inputWrapper.querySelector('input');
    input.focus();

    const createFile = () => {
      const filename = input.value.trim();
      if (filename && !state.files[filename]) {
        state.files[filename] = { content: '% ' + filename + '\n\n', history: [] };
        inputWrapper.remove();
        addFileToTree(filename);
        switchToFile(filename);
      } else if (!filename) {
        inputWrapper.remove();
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createFile();
      if (e.key === 'Escape') inputWrapper.remove();
    });

    input.addEventListener('blur', createFile);
  });

  // Setup existing file click handlers
  document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      const filename = item.dataset.file;
      switchToFile(filename);
    });
  });
}

function addFileToTree(filename) {
  const fileTree = document.getElementById('fileTree');
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.dataset.file = filename;
  fileItem.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    <span>${filename}</span>
  `;
  fileItem.addEventListener('click', () => switchToFile(filename));
  fileTree.appendChild(fileItem);

  // Add tab
  const tabsContainer = document.getElementById('fileTabs');
  const tab = document.createElement('button');
  tab.className = 'file-tab';
  tab.dataset.file = filename;
  tab.innerHTML = `<span>${filename}</span>`;
  tab.addEventListener('click', () => switchToFile(filename));
  tabsContainer.appendChild(tab);
}

function switchToFile(filename) {
  if (!state.files[filename]) return;

  state.activeFile = filename;

  // Update editor content
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: state.files[filename].content }
  });

  // Update UI
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.toggle('active', item.dataset.file === filename);
  });
  document.querySelectorAll('.file-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.file === filename);
  });

  // Update original for diff
  state.originalContent = state.files[filename].content;

  compileLatex();
}

// ============================================
// Storage
// ============================================
function loadFromStorage() {
  const savedSettings = localStorage.getItem('texflow-settings');
  if (savedSettings) {
    state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
  }

  const savedFiles = localStorage.getItem('texflow-files');
  if (savedFiles) {
    state.files = JSON.parse(savedFiles);
  }
}

function saveToStorage() {
  localStorage.setItem('texflow-files', JSON.stringify(state.files));
}

// ============================================
// Utilities
// ============================================
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// PDF Export & Zoom
// ============================================
function initToolbar() {
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');

  let zoom = 1;

  downloadPdfBtn.addEventListener('click', async () => {
    const latexOutput = document.getElementById('latexOutput');
    const filename = state.activeFile.replace('.tex', '') || 'document';

    downloadPdfBtn.disabled = true;
    downloadPdfBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Exporting...
    `;

    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(latexOutput).save();
    } catch (error) {
      console.error('PDF export failed:', error);
    }

    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      PDF
    `;
  });

  zoomInBtn.addEventListener('click', () => {
    zoom = Math.min(zoom + 0.1, 2);
    document.getElementById('latexOutput').style.transform = `scale(${zoom})`;
    document.getElementById('latexOutput').style.transformOrigin = 'top left';
  });

  zoomOutBtn.addEventListener('click', () => {
    zoom = Math.max(zoom - 0.1, 0.5);
    document.getElementById('latexOutput').style.transform = `scale(${zoom})`;
    document.getElementById('latexOutput').style.transformOrigin = 'top left';
  });
}

// ============================================
// Package Manager
// ============================================
const availablePackages = [
  { name: 'amsmath', desc: 'Advanced math typesetting', supported: true },
  { name: 'amssymb', desc: 'Extended math symbols', supported: true },
  { name: 'graphicx', desc: 'Include graphics and images', supported: true },
  { name: 'hyperref', desc: 'Hyperlinks and cross-references', supported: false },
  { name: 'geometry', desc: 'Page layout customization', supported: false },
  { name: 'booktabs', desc: 'Professional table formatting', supported: false },
  { name: 'xcolor', desc: 'Color support', supported: true },
  { name: 'listings', desc: 'Code listings with syntax highlighting', supported: false },
  { name: 'tikz', desc: 'Programmable vector graphics', supported: false },
  { name: 'algorithm2e', desc: 'Algorithm typesetting', supported: false },
  { name: 'biblatex', desc: 'Advanced bibliography support', supported: false },
  { name: 'fontspec', desc: 'Font selection (XeLaTeX)', supported: false },
  { name: 'microtype', desc: 'Micro-typography improvements', supported: false },
  { name: 'siunitx', desc: 'SI units formatting', supported: false },
  { name: 'cleveref', desc: 'Smart cross-references', supported: false },
  { name: 'enumitem', desc: 'List customization', supported: true },
  { name: 'fancyhdr', desc: 'Custom headers and footers', supported: false },
  { name: 'caption', desc: 'Caption customization', supported: false },
  { name: 'subcaption', desc: 'Subfigures and subtables', supported: false },
  { name: 'float', desc: 'Improved float placement', supported: false },
  { name: 'array', desc: 'Extended array/tabular', supported: true },
  { name: 'tabularx', desc: 'Auto-width tables', supported: false },
  { name: 'multirow', desc: 'Multi-row table cells', supported: false },
  { name: 'url', desc: 'URL typesetting', supported: true },
  { name: 'inputenc', desc: 'Input encoding (utf8)', supported: true },
  { name: 'babel', desc: 'Multilingual support', supported: false },
  { name: 'natbib', desc: 'Bibliography citations', supported: false },
  { name: 'setspace', desc: 'Line spacing control', supported: false },
  { name: 'parskip', desc: 'Paragraph spacing', supported: false },
  { name: 'lipsum', desc: 'Lorem ipsum text', supported: true },
];

function getInstalledPackages() {
  const content = state.files[state.activeFile]?.content || '';
  const matches = content.match(/\\usepackage(?:\[.*?\])?\{([^}]+)\}/g) || [];
  const packages = [];
  matches.forEach(match => {
    const pkgMatch = match.match(/\\usepackage(?:\[.*?\])?\{([^}]+)\}/);
    if (pkgMatch) {
      // Handle comma-separated packages
      pkgMatch[1].split(',').forEach(p => packages.push(p.trim()));
    }
  });
  return packages;
}

function addPackage(pkgName) {
  const content = state.files[state.activeFile].content;

  // Find where to insert (after last \usepackage or after \documentclass)
  const lines = content.split('\n');
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/\\usepackage/)) {
      insertIndex = i + 1;
    } else if (lines[i].match(/\\documentclass/) && insertIndex === 0) {
      insertIndex = i + 1;
    }
  }

  // Insert the package
  lines.splice(insertIndex, 0, `\\usepackage{${pkgName}}`);
  const newContent = lines.join('\n');

  // Update editor
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: newContent }
  });

  state.files[state.activeFile].content = newContent;
  saveToStorage();
  compileLatex();

  // Refresh package list
  renderPackageList();
}

function removePackage(pkgName) {
  const content = state.files[state.activeFile].content;

  // Remove the usepackage line for this package
  const regex = new RegExp(`\\\\usepackage(?:\\[.*?\\])?\\{${pkgName}\\}\\n?`, 'g');
  const newContent = content.replace(regex, '');

  // Update editor
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: newContent }
  });

  state.files[state.activeFile].content = newContent;
  saveToStorage();
  compileLatex();

  // Refresh package list
  renderPackageList();
}

function renderPackageList(filter = '') {
  const container = document.getElementById('packageList');
  const installed = getInstalledPackages();

  const filtered = availablePackages.filter(pkg =>
    pkg.name.toLowerCase().includes(filter.toLowerCase()) ||
    pkg.desc.toLowerCase().includes(filter.toLowerCase())
  );

  container.innerHTML = filtered.map(pkg => {
    const isInstalled = installed.includes(pkg.name);
    return `
      <div class="package-item ${isInstalled ? 'installed' : ''}">
        <div class="package-item-info">
          <div class="package-item-name">${pkg.name} ${pkg.supported ? '✓' : ''}</div>
          <div class="package-item-desc">${pkg.desc}${!pkg.supported ? ' (PDF only)' : ''}</div>
        </div>
        ${isInstalled
        ? `<button class="package-item-btn remove" onclick="window.removePackage('${pkg.name}')">Remove</button>`
        : `<button class="package-item-btn" onclick="window.addPackage('${pkg.name}')">Add</button>`
      }
      </div>
    `;
  }).join('');
}

function initPackageManager() {
  const packagesBtn = document.getElementById('packagesBtn');
  const packagesModal = document.getElementById('packagesModal');
  const closePackages = document.getElementById('closePackages');
  const packageSearch = document.getElementById('packageSearch');
  const backdrop = packagesModal.querySelector('.modal-backdrop');

  // Expose functions to window for onclick handlers
  window.addPackage = addPackage;
  window.removePackage = removePackage;

  packagesBtn.addEventListener('click', () => {
    packagesModal.classList.remove('hidden');
    renderPackageList();
    packageSearch.value = '';
    packageSearch.focus();
  });

  closePackages.addEventListener('click', () => {
    packagesModal.classList.add('hidden');
  });

  backdrop.addEventListener('click', () => {
    packagesModal.classList.add('hidden');
  });

  packageSearch.addEventListener('input', (e) => {
    renderPackageList(e.target.value);
  });
}

// ============================================
// Initialize App
// ============================================
function init() {
  loadFromStorage();
  initEditor();
  initChat();
  initDiff();
  initSettings();
  initFileManagement();
  initToolbar();
  initPackageManager();

  console.log('LaTeXy initialized ✨');
}

// Start the app
init();
