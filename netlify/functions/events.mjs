import { createEventsResponse } from "../../src/api/events-response.js";
import { withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => withPublicApiGuard(request, () => createEventsResponse(request));
