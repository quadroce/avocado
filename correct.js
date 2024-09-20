let logs = [];

function addLog(message, type = 'info') {
    logs.push({ message, type });
}

function displayLogs() {
    const logOutput = document.getElementById('logOutput');
    logOutput.innerHTML = logs.map(log => `<p class="${log.type}">${log.message}</p>`).join('');
}

function parseTimestamp(timestamp) {
    const [hours, minutes, seconds] = timestamp.split(':');
    const [secs, ms] = seconds.split('.');
    return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secs)) * 1000 + parseInt(ms);
}

function formatTimestamp(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function processVTT(input) {
    let vttContent = input.trim().split('\n');
    
    vttContent = step1_initialProcessing(vttContent);
    vttContent = step2_handleDuration(vttContent);
    vttContent = step3_handleLineCount(vttContent);
    vttContent = step4_mergeShortCaptions(vttContent);
    vttContent = step5_processQuestions(vttContent);
    vttContent = step6_formatSpeakerDash(vttContent);
    vttContent = step7_adjustTiming(vttContent);
    vttContent = step8_finalValidation(vttContent);

    return vttContent.join('\n');
}

// Implement each step function here

function step1_initialProcessing(vttContent) {
    addLog("Starting initial processing", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                processedContent.push(...processCaption(currentCaption));
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        processedContent.push(...processCaption(currentCaption));
    }

    addLog("Initial processing completed", "info");
    return processedContent;
}

function processCaption(captionLines) {
    let timestamp = captionLines[0];
    let textLines = captionLines.slice(1);
    let processedLines = [];

    for (let line of textLines) {
        line = line.replace(/^[-–]{1,2}|^>>/g, '>>');
        let words = line.split(' ');
        let currentLine = '';

        for (let word of words) {
            if ((currentLine + ' ' + word).length <= 32) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) processedLines.push(currentLine);
                currentLine = word;
            }
        }

        if (currentLine) processedLines.push(currentLine);
    }

    if (processedLines.length > 2) {
        addLog(`Caption split into ${processedLines.length} lines`, "info");
    }

    return [timestamp, ...processedLines];
}

function step2_handleDuration(vttContent) {
    addLog("Starting duration handling", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                processedContent.push(...splitLongCaption(currentCaption));
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        processedContent.push(...splitLongCaption(currentCaption));
    }

    addLog("Duration handling completed", "info");
    return processedContent;
}

function splitLongCaption(captionLines) {
    let [startTime, endTime] = captionLines[0].split(' --> ');
    let duration = parseTimestamp(endTime) - parseTimestamp(startTime);

    if (duration <= 7000) {
        return captionLines;
    }

    addLog(`Splitting caption longer than 7 seconds`, "info");
    let midPoint = parseTimestamp(startTime) + Math.floor(duration / 2);
    let midTime = formatTimestamp(midPoint);

    let firstHalf = [
        `${startTime} --> ${midTime}`,
        ...captionLines.slice(1, Math.ceil(captionLines.length / 2))
    ];

    let secondHalf = [
        `${midTime} --> ${endTime}`,
        ...captionLines.slice(Math.ceil(captionLines.length / 2))
    ];

    return [...firstHalf, ...secondHalf];
}
// ... Implement other step functions ...
function step3_handleLineCount(vttContent) {
    addLog("Starting line count handling", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                processedContent.push(...splitLongCaption(currentCaption));
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        processedContent.push(...splitLongCaption(currentCaption));
    }

    addLog("Line count handling completed", "info");
    return processedContent;
}

function splitLongCaption(captionLines) {
    if (captionLines.length <= 3) {  // timestamp + 2 lines of text
        return captionLines;
    }

    addLog(`Splitting caption with more than 2 lines of text`, "info");
    let timestamp = captionLines[0];
    let textLines = captionLines.slice(1);

    let firstHalf = [timestamp, ...textLines.slice(0, 2)];
    let secondHalf = [timestamp, ...textLines.slice(2)];

    return [...firstHalf, ...secondHalf];
}

function step4_mergeShortCaptions(vttContent) {
    addLog("Starting merging of short captions", "info");
    let processedContent = [];
    let captions = [];
    let currentCaption = null;

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (currentCaption) {
                captions.push(currentCaption);
            }
            currentCaption = { timestamp: line, text: [] };
        } else if (currentCaption) {
            currentCaption.text.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption) {
        captions.push(currentCaption);
    }

    for (let i = 0; i < captions.length; i++) {
        let currentDuration = getDuration(captions[i].timestamp);
        if (currentDuration < 1200 && i < captions.length - 1) {
            let mergedCaption = mergeCaptions(captions[i], captions[i+1]);
            if (mergedCaption) {
                processedContent.push(mergedCaption.timestamp, ...mergedCaption.text);
                i++;  // Skip the next caption as it's been merged
                addLog("Merged short caption with the next one", "merge");
            } else {
                processedContent.push(captions[i].timestamp, ...captions[i].text);
                addLog("Unable to merge short caption", "error");
            }
        } else {
            processedContent.push(captions[i].timestamp, ...captions[i].text);
        }
    }

    addLog("Merging of short captions completed", "info");
    return processedContent;
}

function getDuration(timestamp) {
    let [start, end] = timestamp.split(' --> ');
    return parseTimestamp(end) - parseTimestamp(start);
}

function mergeCaptions(caption1, caption2) {
    let [start1, end1] = caption1.timestamp.split(' --> ');
    let [start2, end2] = caption2.timestamp.split(' --> ');
    let newDuration = parseTimestamp(end2) - parseTimestamp(start1);

    if (newDuration > 7000 || caption1.text.length + caption2.text.length > 2) {
        return null;  // Can't merge if it exceeds 7 seconds or 2 lines
    }

    return {
        timestamp: `${start1} --> ${end2}`,
        text: [...caption1.text, ...caption2.text]
    };
}
function step5_processQuestions(vttContent) {
    addLog("Starting question processing", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                processedContent.push(...processQuestionInCaption(currentCaption));
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        processedContent.push(...processQuestionInCaption(currentCaption));
    }

    addLog("Question processing completed", "info");
    return processedContent;
}

function processQuestionInCaption(captionLines) {
    let timestamp = captionLines[0];
    let textLines = captionLines.slice(1);
    let processedLines = [];
    let addSpeakerDash = false;

    for (let i = 0; i < textLines.length; i++) {
        let line = textLines[i];
        if (addSpeakerDash && !line.startsWith('>>')) {
            line = '>> ' + line.charAt(0).toUpperCase() + line.slice(1);
            addSpeakerDash = false;
            addLog("Added speaker dash after question", "question");
        }

        if (line.includes('?')) {
            addSpeakerDash = true;
            addLog("Question mark detected", "question");
        }

        processedLines.push(line);
    }

    return [timestamp, ...processedLines];
}
function step6_formatSpeakerDash(vttContent) {
    addLog("Starting speaker dash formatting", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                processedContent.push(...formatSpeakerDashInCaption(currentCaption));
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        processedContent.push(...formatSpeakerDashInCaption(currentCaption));
    }

    addLog("Speaker dash formatting completed", "info");
    return processedContent;
}

function formatSpeakerDashInCaption(captionLines) {
    let timestamp = captionLines[0];
    let textLines = captionLines.slice(1);
    let processedLines = [];

    for (let i = 0; i < textLines.length; i++) {
        let line = textLines[i];
        if (line.startsWith('>>')) {
            if (i > 0 && processedLines.length < 2) {
                processedLines.push(line);
            } else {
                addLog("Unable to move speaker dash to new line, exceeds 3 lines", "error");
                processedLines.push(line);
            }
        } else {
            processedLines.push(line);
        }
    }

    return [timestamp, ...processedLines];
}
function step7_adjustTiming(vttContent) {
    addLog("Starting timing adjustment", "info");
    let processedContent = [];
    let captions = [];
    let currentCaption = null;

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (currentCaption) {
                captions.push(currentCaption);
            }
            currentCaption = { timestamp: line, text: [] };
        } else if (currentCaption) {
            currentCaption.text.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption) {
        captions.push(currentCaption);
    }

    for (let i = 0; i < captions.length; i++) {
        let [start, end] = captions[i].timestamp.split(' --> ');
        if (i < captions.length - 1) {
            let nextStart = captions[i+1].timestamp.split(' --> ')[0];
            let gap = parseTimestamp(nextStart) - parseTimestamp(end);
            if (gap < 83) {  // 2 frames at 24fps
                end = formatTimestamp(parseTimestamp(end) + Math.floor(gap / 2));
                captions[i+1].timestamp = `${formatTimestamp(parseTimestamp(nextStart) - Math.floor(gap / 2))} --> ${captions[i+1].timestamp.split(' --> ')[1]}`;
                addLog("Adjusted timing between captions", "info");
            }
        }
        processedContent.push(`${start} --> ${end}`, ...captions[i].text);
    }

    addLog("Timing adjustment completed", "info");
    return processedContent;
}

function step8_finalValidation(vttContent) {
    addLog("Starting final validation", "info");
    let processedContent = [];
    let inCaption = false;
    let currentCaption = [];
    let captionCount = 0;
    let longCaptionCount = 0;

    for (let line of vttContent) {
        if (line.includes('-->')) {
            if (inCaption) {
                captionCount++;
                if (currentCaption.length > 4) {  // timestamp + 3 lines
                    longCaptionCount++;
                    addLog(`Caption ${captionCount} has more than 3 lines`, "error");
                }
                processedContent.push(...currentCaption);
                currentCaption = [];
            }
            inCaption = true;
            currentCaption.push(line);
        } else if (inCaption) {
            currentCaption.push(line);
        } else {
            processedContent.push(line);
        }
    }

    if (currentCaption.length > 0) {
        captionCount++;
        if (currentCaption.length > 4) {
            longCaptionCount++;
            addLog(`Caption ${captionCount} has more than 3 lines`, "error");
        }
        processedContent.push(...currentCaption);
    }

    addLog(`Final validation completed. Processed ${captionCount} captions.`, "info");
    if (longCaptionCount > 0) {
        addLog(`Found ${longCaptionCount} captions with more than 3 lines`, "error");
    } else {
        addLog("All captions have 3 or fewer lines", "info");
    }

    return processedContent;
}

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('inputVtt').value = e.target.result;
        };
        reader.readAsText(file);
    }
});

document.getElementById('processButton').addEventListener('click', function() {
    const inputVtt = document.getElementById('inputVtt').value;
    logs = []; // Reset logs
    const processedVtt = processVTT(inputVtt);
    document.getElementById('outputVtt').value = processedVtt;
    displayLogs();
});
