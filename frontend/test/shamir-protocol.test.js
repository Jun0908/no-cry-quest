const { expect } = require("chai");
const secrets = require("secrets.js-grempe");

describe("Shamir Protocol (4-of-4)", function () {
  it("cannot reliably recover with 1-3 shares and recovers with 4 shares", function () {
    const secret = "task04-secret-for-unlock";
    const hex = secrets.str2hex(secret);
    const shares = secrets.share(hex, 4, 4);

    const rec1 = secrets.hex2str(secrets.combine([shares[0]]));
    const rec2 = secrets.hex2str(secrets.combine([shares[0], shares[1]]));
    const rec3 = secrets.hex2str(secrets.combine([shares[0], shares[1], shares[2]]));
    const rec4 = secrets.hex2str(secrets.combine(shares));

    expect(rec1).to.not.equal(secret);
    expect(rec2).to.not.equal(secret);
    expect(rec3).to.not.equal(secret);
    expect(rec4).to.equal(secret);
  });
});
