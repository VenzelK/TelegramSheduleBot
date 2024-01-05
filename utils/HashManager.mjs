import { createHash } from "crypto";

class HashManager {
  static hashAndBase64Encode(data) {
    const bytes = Buffer.from(data, "utf-8");
    const sha256 = createHash("sha256");
    sha256.update(bytes);
    const hashBytes = sha256.digest();
    const dataBase64 = hashBytes.toString("base64");
    return dataBase64;
  }

  static isBase64 = (str) => {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  };
}
export default HashManager;
