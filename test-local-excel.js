const XLSX = require('xlsx');

// Create sample data matching the S3 structure
const sampleData = [
  ['Skills & Service (Tools & Trades?)', '', '', '', '', 'R'],
  ['Research & Discovery', '', '', '', '', 'I'],
  ['Vision & Expression', '', '', '', '', 'A'],
  ['Connection & Care', '', '', '', '', 'S'],
  ['Leadership & Innovation', '', '', '', '', 'E'],
  ['Systems & Solutions', '', '', '', '', 'C']
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

// Write to file
XLSX.writeFile(workbook, 'sample-pathways.xlsx');

console.log('Sample Excel file created: sample-pathways.xlsx');

// Test reading it back
const testWorkbook = XLSX.readFile('sample-pathways.xlsx');
const testWorksheet = testWorkbook.Sheets[testWorkbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(testWorksheet, { header: 1 });

console.log('Test read data:', jsonData);