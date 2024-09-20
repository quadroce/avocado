let version = "200920241041";
let uploadedFileName = '';
let logMessages = [];

const MAX_LINES_PER_CAPTION = 3;
const MAX_CHARS_PER_LINE = 32;
const MAX_CAPTION_DURATION_MS = 7000;
const MIN_CAPTION_DURATION_MS = 1200;

function processQuestionsAndSpeakers(captions) {
  let speakerDashType = '>>';  // Default speaker dash type
  let questionCount = 0;
  let editedCaptionsCount = 0;

  // Determine the speaker dash type used in the file
  for (let caption of captions) {
    if (caption.type !== 'header') {
      if (caption.text.includes('>>')) {
        speakerDashType = '>>';
        break;
      } else if (caption.text.includes('--')) {
        speakerDashType = '-';
        break;
      } else if (caption.text.includes('-')) {
        speakerDashType = '-';
        break;
      }
    }
  }

  const processedCaptions = captions.map(caption => {
    if (caption.type === 'header') return caption;

    let lines = caption.text.split('\n');
    let newLines = [];
    let addDashToNext = false;
    let captionEdited = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (addDashToNext) {
        if (!line.startsWith('>>') && !line.startsWith('-')) {
          line = `${speakerDashType} ${line.charAt(0).toUpperCase() + line.slice(1)}`;
          captionEdited = true;
        }
        addDashToNext = false;
      }

      if (line.includes('?')) {
        questionCount += (line.match(/\?/g) || []).length;
        newLines.push(line);
        addDashToNext = true;
      } else {
        newLines.push(line);
      }
    }

    if (captionEdited) {
      editedCaptionsCount++;
    }

    return {
      ...caption,
      text: newLines.join('\n')
    };
  });

  return {
    processedCaptions,
    questionCount,
    editedCaptionsCount
  };
}

function formatAndDisplayText() {
  logMessages = []; // Reset log messages
  const inputText = document.getElementById("inputText").value;
  addLog(`Version: ${version}`);
  
  const processedCaptions = formatText(inputText);
  addLog(`Processed ${processedCaptions.length} captions`);

  const mergedCaptions = mergeCaptions(processedCaptions);
  addLog(`Merged captions. New total: ${mergedCaptions.length}`);

  const { processedCaptions: captionsWithSpeakers, questionCount, editedCaptionsCount } = processQuestionsAndSpeakers(mergedCaptions);
  addLog(`Processed questions and added speaker dashes where needed`);
  addLog(`Total question marks found: ${questionCount}`);
  addLog(`Number of captions edited: ${editedCaptionsCount}`);

  let formattedText = captionsWithSpeakers.map(caption => {
    if (caption.type === 'header') {
      return caption.content;
    }
    return `${caption.timestamp}\n${caption.text}`;
  }).join('\n\n');

  document.getElementById("outputText").textContent = formattedText;
  displayLogs();
}

function addLog(message) {
  logMessages.push(message);
}

function displayLogs() {
  const logHtml = logMessages.map(msg => `<p>${msg}</p>`).join('');
  document.getElementById("logOutput").innerHTML = logHtml;
}

function formatText(text) {
  const lines = text.split('\n');
  let formattedCaptions = [];
  let currentCaption = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) {
      formattedCaptions.push({ type: 'header', content: line });
      continue;
    }

    if (isTimestamp(line)) {
      if (currentCaption) {
        formattedCaptions.push(currentCaption);
      }
      currentCaption = { timestamp: line, text: '' };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? '\n' : '') + line;
    }
  }

  if (currentCaption) {
    formattedCaptions.push(currentCaption);
  }

  return formattedCaptions;
}

function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;

  function pushCurrentMerge() {
    if (currentMerge) {
      const splitCaptions = splitCaptionIfNeeded(currentMerge);
      mergedCaptions.push(...splitCaptions);
      currentMerge = null;
    }
  }

  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    if (caption.type === 'header') {
      pushCurrentMerge();
      mergedCaptions.push(caption);
      continue;
    }

    const [start, end] = caption.timestamp.split(' --> ');
    const duration = getTimestampDifference(start, end);

    if (!currentMerge) {
      currentMerge = { ...caption, duration };
    } else {
      const [currentStart, currentEnd] = currentMerge.timestamp.split(' --> ');
      const currentDuration = getTimestampDifference(currentStart, currentEnd);

      if (currentDuration + duration <= MAX_CAPTION_DURATION_MS) {
        currentMerge.timestamp = `${currentStart} --> ${end}`;
        currentMerge.text += '\n' + caption.text;
        currentMerge.duration = currentDuration + duration;
      } else {
        pushCurrentMerge();
        currentMerge = { ...caption, duration };
      }
    }

    if (currentMerge.duration >= MAX_CAPTION_DURATION_MS) {
      pushCurrentMerge();
    }
  }

  pushCurrentMerge();

  return mergedCaptions;
}

function splitCaptionIfNeeded(caption) {
  const formattedLines = formatLines(caption.text);
  if (formattedLines.length <= MAX_LINES_PER_CAPTION) {
    return [{
      ...caption,
      text: formattedLines.join('\n')
    }];
  }

  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);
  const parts = Math.ceil(formattedLines.length / MAX_LINES_PER_CAPTION);
  const partDuration = Math.round(totalDuration / parts);

  return Array.from({ length: parts }, (_, i) => {
    const partStart = addMillisecondsToTimestamp(start, i * partDuration);
    const partEnd = i === parts - 1 ? end : addMillisecondsToTimestamp(start, (i + 1) * partDuration);
    const partLines = formattedLines.slice(i * MAX_LINES_PER_CAPTION, (i + 1) * MAX_LINES_PER_CAPTION);
    return {
      timestamp: `${partStart} --> ${partEnd}`,
      text: partLines.join('\n'),
      duration: partDuration
    };
  });
}

function formatLines(text) {
  let formattedLines = [];
  let currentLine = '';
  const words = text.split(/\s+/);

  words.forEach((word, index) => {
    if (word === '>>' || word === '-' || (index === 0 && word === '--')) {
      if (currentLine) formattedLines.push(currentLine);
      currentLine = word;
    } else if ((currentLine + ' ' + word).length > MAX_CHARS_PER_LINE) {
      if (currentLine) formattedLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }

    if (currentLine.length > MAX_CHARS_PER_LINE) {
      formattedLines.push(currentLine.slice(0, MAX_CHARS_PER_LINE));
      currentLine = currentLine.slice(MAX_CHARS_PER_LINE);
    }
  });

  if (currentLine) formattedLines.push(currentLine);

  return formattedLines;
}

function isTimestamp(line) {
  return /^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return Math.round(ms2 - ms1);
}

function addMillisecondsToTimestamp(timestamp, milliseconds) {
  const [hours, minutes, seconds, currentMilliseconds] = timestamp.split(/[:.]/).map(Number);
  let totalMilliseconds = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + currentMilliseconds + milliseconds;

  totalMilliseconds = Math.round(totalMilliseconds);

  const newHours = Math.floor(totalMilliseconds / 3600000);
  totalMilliseconds %= 3600000;
  const newMinutes = Math.floor(totalMilliseconds / 60000);
  totalMilliseconds %= 60000;
  const newSeconds = Math.floor(totalMilliseconds / 1000);
  const newMilliseconds = totalMilliseconds % 1000;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

// ... (rest of the code remains the same)

function splitCaptionByDuration(caption, maxDuration) {
  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);
  const parts = Math.ceil(totalDuration / maxDuration);
  const partDuration = Math.round(totalDuration / parts); // Round to nearest millisecond

  return Array.from({ length: parts }, (_, i) => {
    const partStart = addMillisecondsToTimestamp(start, i * partDuration);
    const partEnd = i === parts - 1 ? end : addMillisecondsToTimestamp(start, (i + 1) * partDuration);
    return {
      timestamp: `${partStart} --> ${partEnd}`,
      text: caption.text,
      duration: partDuration
    };
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    uploadedFileName = file.name.replace(/\.[^/.]+$/, "");
    
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('inputText').value = e.target.result;
    };
    reader.readAsText(file);
  }
}

function copyOutput() {
  const outputText = document.getElementById('outputText').textContent;
  navigator.clipboard.writeText(outputText).then(() => {
    alert('Text copied to clipboard!');
  });
}

function downloadOutput() {
  const outputText = document.getElementById('outputText').textContent;
  const blob = new Blob([outputText], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const downloadFileName = uploadedFileName ? `${uploadedFileName}_formatted.vtt` : 'captions_formatted.vtt';
  a.download = downloadFileName;
  
  a.click();
  URL.revokeObjectURL(url);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);
  document.getElementById('copyButton')?.addEventListener('click', copyOutput);
  document.getElementById('downloadButton')?.addEventListener('click', downloadOutput);
});
