async function main() {
  const pdfParseModule = await import('pdf-parse');
  
  // Dummy file buffer (representing empty PDF, but let's see if it loads)
  const dummyBuffer = Buffer.from('%PDF-1.4 ...');
  try {
    const instance = new pdfParseModule.PDFParse({ data: dummyBuffer });
    console.log('Instance loaded with data parameter!');
    
    const textResult = await instance.getText();
    console.log('Text result keys:', Object.keys(textResult));
  } catch (err) {
    console.error('Test run failed:', err);
  }
}

main().catch(console.error);
