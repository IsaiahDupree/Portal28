// Script to process Sarah's video transcript and create course content
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clean VTT transcript to plain text
function cleanVttToText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  let lastLine = '';
  
  for (const line of lines) {
    // Skip WEBVTT header, timestamps, and empty lines
    if (
      line.startsWith('WEBVTT') ||
      line.startsWith('Kind:') ||
      line.startsWith('Language:') ||
      line.includes('-->') ||
      line.includes('align:') ||
      line.trim() === ''
    ) {
      continue;
    }
    
    // Remove timestamp tags like <00:00:00.640><c>
    let cleanLine = line.replace(/<[^>]+>/g, '').trim();
    
    // Skip duplicate lines
    if (cleanLine && cleanLine !== lastLine) {
      textLines.push(cleanLine);
      lastLine = cleanLine;
    }
  }
  
  // Join and clean up
  let text = textLines.join(' ');
  
  // Remove duplicate phrases that appear due to caption overlap
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Extract timestamps from VTT for chapter markers
function extractTimestamps(vttContent: string): Array<{seconds: number, text: string}> {
  const lines = vttContent.split('\n');
  const timestamps: Array<{seconds: number, text: string}> = [];
  
  let currentTimestamp = 0;
  let currentText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse timestamp lines
    const match = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      currentTimestamp = hours * 3600 + minutes * 60 + seconds;
      
      // Get the text from following lines
      const textLine = lines[i + 1] || '';
      currentText = textLine.replace(/<[^>]+>/g, '').trim();
      
      if (currentText && !currentText.includes('-->')) {
        timestamps.push({ seconds: currentTimestamp, text: currentText });
      }
    }
  }
  
  return timestamps;
}

async function main() {
  const vttPath = path.join(__dirname, 'sarah-bootcamp.en.vtt');
  const vttContent = fs.readFileSync(vttPath, 'utf-8');
  
  const cleanText = cleanVttToText(vttContent);
  const timestamps = extractTimestamps(vttContent);
  
  // Save clean transcript
  const outputPath = path.join(__dirname, 'sarah-bootcamp-transcript.txt');
  fs.writeFileSync(outputPath, cleanText);
  
  console.log('Transcript cleaned and saved!');
  console.log('Word count:', cleanText.split(' ').length);
  console.log('Character count:', cleanText.length);
  console.log('First 500 chars:', cleanText.substring(0, 500));
  
  // Save timestamps
  const timestampsPath = path.join(__dirname, 'sarah-bootcamp-timestamps.json');
  fs.writeFileSync(timestampsPath, JSON.stringify(timestamps.slice(0, 50), null, 2));
}

main().catch(console.error);
