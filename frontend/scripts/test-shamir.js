const secrets = require('secrets.js-grempe');

function run() {
  const secretStr = 'This is a very secret key';
  const hex = secrets.str2hex(secretStr);

  console.log('Original:', secretStr);
  console.log('Hex:', hex);

  // split into 4 shares, threshold 4 (4-of-4)
  const shares = secrets.share(hex, 4, 4);
  console.log('\nGenerated shares (4):');
  shares.forEach((s, i) => console.log(`${i + 1}: ${s}`));

  // try combine with only 3 shares -> should NOT recover original
  const three = shares.slice(0, 3);
  try {
    const comb3 = secrets.combine(three);
    const rec3 = secrets.hex2str(comb3);
    console.log('\nRecovered with 3 shares (should fail / be incorrect):', rec3);
  } catch (e) {
    console.log('\nCombine with 3 shares failed as expected:', e.message);
  }

  // combine with all 4
  const combAll = secrets.combine(shares);
  const recAll = secrets.hex2str(combAll);
  console.log('\nRecovered with 4 shares:', recAll);

  const ok = recAll === secretStr;
  console.log('\nVerification:', ok ? 'SUCCESS' : 'FAIL');
}

run();
