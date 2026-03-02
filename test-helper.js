import { documentNumberHelper } from './src/utils/documentNumbering.js';

const cases = [
  'INV-{YYYY}-{MM}-{RUN}',
  '{YY}{MM}{DD}-IV-{RUN}',
  'BN-{RUN}'
];

cases.forEach(format => {
  console.log(`\nTesting format: ${format}`);
  const dateFormatted = documentNumberHelper.applyDateFormats(format, new Date('2026-02-25'));
  console.log(`Applied Date: ${dateFormatted}`);
  
  const prefix = documentNumberHelper.getSearchPrefix(dateFormatted);
  const suffix = documentNumberHelper.getSearchSuffix(dateFormatted);
  console.log(`Prefix: '${prefix}', Suffix: '${suffix}'`);
  
  // Simulate having an existing record
  const latestNo = `${prefix}0084${suffix}`;
  console.log(`Latest No: ${latestNo}`);
  
  const extract = documentNumberHelper.extractRunNumber(latestNo, format, new Date('2026-02-25'));
  console.log(`Extracted Run: ${extract}`);
  
  const nextRun = documentNumberHelper.getNextRunNumberString(latestNo, prefix, suffix);
  console.log(`Next Run String: ${nextRun}`);
  
  const final = dateFormatted.replace('{RUN}', nextRun);
  console.log(`Final Next Document: ${final}`);
});
