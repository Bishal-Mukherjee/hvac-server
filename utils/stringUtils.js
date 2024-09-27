const { v4 } = require("uuid");

exports.compactUUID = () => {
  const [first, second] = String(v4()).split("-");
  return `${first}${second}`;
};
