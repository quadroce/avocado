function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;

  formatText(inputText).then(formattedText => {
    const correctedText = correctText(formattedText);
    document.getElementById("outputText").textContent = correctedText;
  });
}

// Formatta il testo
async function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTimestamp(line)) {
      formattedText += line + '\n';
    } else {
      const formattedLine = formatLine(line);
      formattedText += formattedLine + '\n';
    }
  }

  return formattedText;
}

// Formatta una singola riga
function formatLine(line) {
  const sentences = line.split(/([.!?]\s*)/);
  let formattedLine = "";

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].trim().length > 0) {
      formattedLine += sentences[i].charAt(0).toUpperCase() + sentences[i].slice(1).toLowerCase();
    } else {
      formattedLine += sentences[i];
    }
  }

  return formattedLine;
}

// Controlla se la linea è un timestamp
function isTimestamp(line) {
  return /^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}$/.test(line);
}

// Corrects the text by adding line breaks before timestamps and fixing line length
function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  let result = [];
  let currentLine = '';
  let inParentheses = false;

  lines.forEach(line => {
    const isTimestamp = line.includes('-->');

    if (isTimestamp) {
      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }
      result.push('\n' + line);
      inParentheses = false;
    } else {
      if (line.trim().startsWith('(')) {
        inParentheses = true;
      }
      if (line.trim().endsWith(')')) {
        inParentheses = false;
      }

      const words = line.split(' ');
      words.forEach(word => {
        if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (lines.indexOf(line) === lines.length - 1 || isTimestamp) {
        if (currentLine) {
          result.push(currentLine);
          currentLine = '';
        }
      }
    }
  });

  return result.join('\n');
}

// Gestisce il clic del pulsante "Formatta"
document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);

// Copies the output to the clipboard
function copyOutput() {
  const outputText = document.getElementById('outputText').textContent;
  navigator.clipboard.writeText(outputText).then(() => {
    alert('Text copied to clipboard!');
  });
}

// Downloads the output as a .vtt file
function downloadOutput() {
  const outputText = document.getElementById('outputText').textContent;
  const blob = new Blob([outputText], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.vtt';
  a.click();
  URL.revokeObjectURL(url);
}
