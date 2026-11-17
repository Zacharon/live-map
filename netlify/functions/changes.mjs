import { createChangesResponse } from "../../src/api/changes-response.js";
import { withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => withPublicApiGuard(request, () => createChangesResponse(request, { env: process.env }));
