import type { Config } from "./config.js";
import type { FryskerGateway } from "./gateway.js";
import { HttpGateway } from "./httpGateway.js";
import { MockGateway } from "./mockGateway.js";

export function createGateway(config: Config): FryskerGateway {
  return config.mock ? new MockGateway() : new HttpGateway({ config });
}
