import { documentNumberHelper } from './src/utils/documentNumbering.js';

const cases = [
  'INV-{YYYY}-{MM}-{RUN}',
  '{YY}{MM}{DD}-IV-{RUN5}',
  'BN-{RUN3}'
];

cases.forEach(format => {
  console.log(`\nTesting format: ${format}`);
  const tokenInfo = documentNumberHelper.getRunTokenInfo(format);
  console.log(`Token Info:`, tokenInfo);

  const dateFormatted = documentNumberHelper.applyDateFormats(format, new Date('2026-02-25'));
  console.log(`Applied Date: ${dateFormatted}`);
  
  const prefix = documentNumberHelper.getSearchPrefix(dateFormatted);
  const suffix = documentNumberHelper.getSearchSuffix(dateFormatted);
  console.log(`Prefix: '${prefix}', Suffix: '${suffix}'`);
  
  const latestNo = `${prefix}84${suffix}`;
  console.log(`Latest No: ${latestNo}`);
  
  const extract = documentNumberHelper.extractRunNumber(latestNo, format, new Date('2026-02-25'));
  console.log(`Extracted Run: ${extract}`);
  
  const nextRun = documentNumberHelper.getNextRunNumberString(latestNo, prefix, suffix, tokenInfo.length);
  console.log(`Next Run String: ${nextRun}`);
  
  const final = documentNumberHelper.replaceRunToken(dateFormatted, nextRun);
  console.log(`Final Next Document: ${final}`);
});
