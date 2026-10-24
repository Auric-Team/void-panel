import { KeyService } from "../services/keyService.js";
import { jsonResponse } from "../utils/response.js";

export const VerifyController = {
  async verify(req: Request, clientIp = "127.0.0.1"): Promise<Response> {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        status: "invalid",
        message: "Malformed JSON payload",
      });
    }

    const { key, hwid, timestamp, hash, clientVersion } = body;
    const result = KeyService.verify(key, hwid, timestamp, hash, clientIp, clientVersion);
    return jsonResponse(result);
  },
};
