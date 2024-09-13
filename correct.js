130920241353
function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;
  const processedCaptions = formatText(inputText);
  const mergedCaptions = mergeCaptions(processedCaptions);

  const formattedText = mergedCaptions.map(caption => {
    if (caption.type === 'header') {
      return caption.content;
    }
    return `${caption.timestamp}\n${caption.text}`;
  }).join('\n\n');

  const correctedText = correctText(formattedText);
  document.getElementById("outputText").textContent = addNewLineBeforeTimestamps(correctedText);
}

function addNewLineBeforeTimestamps(text) {
  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3})/g;
  return text.replace(timestampRegex, '\n\n$1');
}

function cleanTimestamp(timestamp) {
  const parts = timestamp.split(' ');
  return parts[0];
}

function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = [];
  let currentCaption = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) {
      formattedText.push({ type: 'header', content: line });
      continue;
    }

    if (isTimestamp(line)) {
      if (currentCaption) {
        formattedText.push(...processCaption(currentCaption));
      }
      currentCaption = { timestamp: line, text: '', originalTimestamp: line };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? ' ' : '') + line;
    }
  }

  if (currentCaption) {
    formattedText.push(...processCaption(currentCaption));
  }

  formattedText = formattedText.flatMap(caption => {
    if (caption.type === 'caption') {
      return splitLongCaptions(caption).map(splitCaption => ({
        ...splitCaption,
        timestamp: cleanTimestamp(splitCaption.timestamp)
      }));
    }
    return caption;
  });

  return formattedText;
}

function isTimestamp(line) {
  return /^\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

function processCaption(caption) {
  const [start, end] = caption.timestamp.split(' --> ');
  const duration = getTimestampDifference(start, end);

  if (duration > 7000) {
    return splitCaptionByDuration(caption, 7000);
  } else {
    return [{ ...caption, duration, shouldMerge: duration < 1200 }];
  }
}

function splitCaptionByDuration(caption, maxDuration) {
  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);

  const splitPoint = totalDuration / 2;
  const splitTimestamp = getMidTimestamp(start, splitPoint);
  const gapEndTimestamp = addFramesToTimestamp(splitTimestamp, 4);

  // Extract alignment and positioning info
  const alignInfo = caption.timestamp.split(' --> ')[1].split(' ').slice(1).join(' ');

  // Find a good splitting point
  let splitIndex = findSplitIndex(caption.text);

  const firstPart = {
    timestamp: `${start} --> ${splitTimestamp} ${alignInfo}`,
    text: caption.text.substring(0, splitIndex).trim(),
    duration: splitPoint,
    shouldMerge: false
  };

  const secondPart = {
    timestamp: `${gapEndTimestamp} --> ${end} ${alignInfo}`,
    text: caption.text.substring(splitIndex).trim(),
    duration: totalDuration - splitPoint - 166, // Assuming 24 fps, 4 frames = 166ms
    shouldMerge: false
  };

  return [firstPart, secondPart];
}

function findSplitIndex(text) {
  // First, try to split at the end of a sentence
  const sentenceEnd = text.indexOf('. ', text.length / 2 - 20);
  if (sentenceEnd !== -1 && sentenceEnd <= text.length / 2 + 20) {
    return sentenceEnd + 1; // Include the period in the first part
  }

  // If no sentence end is found, try to split at a speaker change
  const speakerChange = text.indexOf('>> ', text.length / 2 - 20);
  if (speakerChange !== -1 && speakerChange <= text.length / 2 + 20) {
    return speakerChange;
  }

  // If no good splitting point is found, split at the nearest space to the midpoint
  const midPoint = Math.floor(text.length / 2);
  const leftSpace = text.lastIndexOf(' ', midPoint);
  const rightSpace = text.indexOf(' ', midPoint);

  if (leftSpace === -1 && rightSpace === -1) {
    return midPoint; // No spaces found, split in the middle of a word as a last resort
  } else if (leftSpace === -1) {
    return rightSpace;
  } else if (rightSpace === -1) {
    return leftSpace;
  } else {
    // Return the nearest space to the midpoint
    return (midPoint - leftSpace <= rightSpace - midPoint) ? leftSpace : rightSpace;
  }
}

function addFramesToTimestamp(timestamp, frames) {
  const [hours, minutes, seconds, milliseconds] = timestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + (frames * 1000 / 24);

  const newHours = Math.floor(totalMs / 3600000);
  const newMinutes = Math.floor((totalMs % 3600000) / 60000);
  const newSeconds = Math.floor((totalMs % 60000) / 1000);
  const newMilliseconds = Math.floor(totalMs % 1000);

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function getMidTimestamp(startTimestamp, splitDuration) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);

  const startMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
  const midMs = startMs + splitDuration;

  const newHours = Math.floor(midMs / 3600000);
  const newMinutes = Math.floor((midMs % 3600000) / 60000);
  const newSeconds = Math.floor((midMs % 60000) / 1000);
  const newMilliseconds = midMs % 1000;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function splitLongCaptions(caption) {
  const lines = caption.text.split(/(?=(?:^|\n)(?:>>|--))|(?<=\S)(?=\s+(?:>>|--))/g)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let result = [];
  let currentCaption = "";
  let lineCount = 0;
  let startTime = caption.timestamp.split(' --> ')[0];

  lines.forEach((line, index) => {
    if (!line.startsWith(">>") && !line.startsWith("--")) {
      line = "-- " + line;
    }

    if (lineCount >= 3 || (currentCaption && (line.startsWith(">>") || line.startsWith("--")))) {
      if (currentCaption) {
        const endTime = index === lines.length - 1 ? 
          caption.timestamp.split(' --> ')[1] : 
          getAdjustedTimestamp(startTime, 2000);
        result.push({
          timestamp: `${startTime} --> ${endTime}`,
          text: currentCaption.trim(),
          duration: 2000,
          shouldMerge: false
        });
        startTime = endTime;
      }
      currentCaption = line;
      lineCount = 1;
    } else {
      currentCaption += (currentCaption ? "\n" : "") + line;
      lineCount++;
    }
  });

  if (currentCaption) {
    result.push({
      timestamp: `${startTime} --> ${caption.timestamp.split(' --> ')[1]}`,
      text: currentCaption.trim(),
      duration: getTimestampDifference(startTime, caption.timestamp.split(' --> ')[1]),
      shouldMerge: false
    });
  }

  return result;
}

function getAdjustedTimestamp(startTimestamp, millisToAdd) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + millisToAdd;

  const newHours = Math.floor(totalMs / 3600000);
  const newMinutes = Math.floor((totalMs % 3600000) / 60000);
  const newSeconds = Math.floor((totalMs % 60000) / 1000);
  const newMilliseconds = Math.floor(totalMs % 1000);

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1;
}

function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;
  let totalDuration = 0;

  for (let caption of captions) {
    if (caption.type === 'header') {
      mergedCaptions.push(caption);
      continue;
    }

    if (!currentMerge) {
      currentMerge = { ...caption };
      totalDuration = 0;
    } else {
      const [currentStart] = currentMerge.timestamp.split(' --> ');
      const [, nextEnd] = caption.timestamp.split(' --> ');
      currentMerge.timestamp = `${currentStart} --> ${nextEnd}`;
      currentMerge.text += '\n' + caption.text;
      totalDuration += caption.duration;
    }

    if (!caption.shouldMerge || totalDuration > 1200) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
      totalDuration = 0;
    }
  }

  if (currentMerge) {
    mergedCaptions.push(currentMerge);
  }

  return mergedCaptions;
}

function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  let result = [];
  let currentLine = '';

  lines.forEach(line => {
    const isTimestamp = line.includes('-->');

    if (isTimestamp) {
      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }
      result.push(line);
    } else {
      const words = line.split(' ');
      words.forEach(word => {
        if ((word.startsWith('>>') || word.startsWith('--')) && currentLine.length > 0) {
          result.push(currentLine);
          currentLine = word;
        } else if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (lines.indexOf(line) === lines.length - 1) {
        if (currentLine) {
          result.push(currentLine);
        }
      }
    }
  });

  return result.join('\n');
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
  a.download = 'output.vtt';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);
document.getElementById('copyButton')?.addEventListener('click', copyOutput);
document.getElementById('downloadButton')?.addEventListener('click', downloadOutput);
